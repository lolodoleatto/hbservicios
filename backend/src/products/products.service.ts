import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductType } from './entities/product.entity';
import { PriceHistory } from './entities/price-history.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
    @InjectRepository(StockMovement)
    private readonly stockMovementsRepository: Repository<StockMovement>,
  ) {}

  private async resolveLinkedEmptyProduct(
    type: ProductType,
    linkedEmptyProductId: number | null | undefined,
  ): Promise<Product | null | undefined> {
    if (linkedEmptyProductId === undefined) return undefined;
    if (linkedEmptyProductId === null) return null;

    if (type !== ProductType.GAS_CYLINDER_FULL) {
      throw new BadRequestException(
        'Solo un producto de tipo garrafa llena puede tener un vacío vinculado',
      );
    }
    const emptyProduct = await this.findOne(linkedEmptyProductId);
    if (emptyProduct.type !== ProductType.GAS_CYLINDER_EMPTY) {
      throw new BadRequestException(
        `"${emptyProduct.name}" no es un producto de tipo garrafa vacía`,
      );
    }
    return emptyProduct;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const linkedEmptyProduct = await this.resolveLinkedEmptyProduct(
      dto.type,
      dto.linkedEmptyProductId,
    );

    const product = this.productsRepository.create({
      name: dto.name,
      type: dto.type,
      currentPrice: dto.currentPrice.toFixed(2),
      stock: dto.stock ?? 0,
      linkedEmptyProduct: linkedEmptyProduct ?? null,
    });
    const saved = await this.productsRepository.save(product);
    const productRef = { id: saved.id } as Product;

    await this.priceHistoryRepository.save(
      this.priceHistoryRepository.create({
        product: productRef,
        price: saved.currentPrice,
      }),
    );

    if (saved.stock > 0) {
      await this.stockMovementsRepository.save(
        this.stockMovementsRepository.create({
          product: productRef,
          delta: saved.stock,
          reason: 'Stock inicial',
        }),
      );
    }

    return this.findOne(saved.id);
  }

  findAll(includeInactive = false): Promise<Product[]> {
    return this.productsRepository.find({
      where: includeInactive ? {} : { active: true },
      relations: { linkedEmptyProduct: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { priceHistory: true, linkedEmptyProduct: true },
    });
    if (!product) {
      throw new NotFoundException(`Producto ${id} no encontrado`);
    }
    product.priceHistory?.sort(
      (a, b) => b.validFrom.getTime() - a.validFrom.getTime(),
    );
    return product;
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    const priceChanged =
      dto.currentPrice !== undefined &&
      dto.currentPrice.toFixed(2) !== product.currentPrice;

    const linkedEmptyProduct = await this.resolveLinkedEmptyProduct(
      dto.type ?? product.type,
      dto.linkedEmptyProductId,
    );

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.type !== undefined) product.type = dto.type;
    if (dto.active !== undefined) product.active = dto.active;
    if (priceChanged) product.currentPrice = dto.currentPrice!.toFixed(2);
    if (linkedEmptyProduct !== undefined) product.linkedEmptyProduct = linkedEmptyProduct;

    // Guardar el producto ANTES de insertar el historial: hacerlo después
    // (con product.priceHistory todavía cargado en memoria) pisaba el
    // productId recién insertado y lo dejaba en NULL.
    const updated = await this.productsRepository.save(product);

    if (priceChanged) {
      await this.priceHistoryRepository.save(
        this.priceHistoryRepository.create({
          product: { id: updated.id } as Product,
          price: updated.currentPrice,
        }),
      );
    }

    return this.findOne(id);
  }

  async adjustStock(id: number, dto: AdjustStockDto): Promise<Product> {
    const product = await this.findOne(id);

    if (dto.delta > 0 && product.type !== ProductType.GAS_CYLINDER_EMPTY) {
      throw new BadRequestException(
        `Para sumar stock de "${product.name}" hay que cargar un gasto vinculado (así queda el costo registrado). Los envases vacíos sí se pueden ajustar libremente acá.`,
      );
    }

    const newStock = product.stock + dto.delta;
    if (newStock < 0) {
      throw new BadRequestException('Stock insuficiente para esta salida');
    }

    product.stock = newStock;
    const updated = await this.productsRepository.save(product);

    await this.stockMovementsRepository.save(
      this.stockMovementsRepository.create({
        product: { id: updated.id } as Product,
        delta: dto.delta,
        reason: dto.reason,
      }),
    );

    return this.findOne(id);
  }

  async deactivate(id: number): Promise<Product> {
    const product = await this.findOne(id);
    product.active = false;
    return this.productsRepository.save(product);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const product = await this.findOne(id);
    try {
      await this.productsRepository.delete(id);
    } catch (err: unknown) {
      const code = (err as { code?: string; errno?: number })?.code;
      const errno = (err as { code?: string; errno?: number })?.errno;
      if (code === 'ER_ROW_IS_REFERENCED_2' || errno === 1451) {
        throw new BadRequestException(
          `No se puede eliminar "${product.name}" definitivamente porque tiene historial (ventas, préstamos de envase o matafuegos vendidos). Dalo de baja en cambio.`,
        );
      }
      throw err;
    }
    return { deleted: true };
  }
}
