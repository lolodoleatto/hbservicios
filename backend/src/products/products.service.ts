import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductType } from './entities/product.entity';
import { PriceHistory } from './entities/price-history.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

// Quita acentos, pasa a minúscula y saca la palabra "llena/o" o "vacía/o"
// (con o sin plural) para poder comparar el resto del nombre sin importar
// el género/número, p.ej. "Garrafa 10kg llena" y "Garrafa 10kg vacía" dan
// ambas "garrafa 10kg".
function normalizeForLinkMatch(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(llenas?|llenos?|vacias?|vacios?)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  // El vínculo entre una garrafa llena y su vacía correspondiente ya no se
  // elige a mano: se infiere por nombre (mismo nombre salvo "llena"/"vacía"),
  // así el alta es más simple y no depende de que alguien recuerde tildar un
  // select. Si no hay exactamente una coincidencia, queda sin vincular (se
  // puede resolver renombrando el producto para que los nombres coincidan y
  // volviendo a guardar).
  private async inferLinkedEmptyProduct(fullName: string): Promise<Product | null> {
    const target = normalizeForLinkMatch(fullName);
    if (!target) return null;

    const emptyProducts = await this.productsRepository.find({
      where: { type: ProductType.GAS_CYLINDER_EMPTY },
    });
    const matches = emptyProducts.filter((p) => normalizeForLinkMatch(p.name) === target);
    return matches.length === 1 ? matches[0] : null;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const linkedEmptyProduct =
      dto.type === ProductType.GAS_CYLINDER_FULL
        ? await this.inferLinkedEmptyProduct(dto.name)
        : null;

    const product = this.productsRepository.create({
      name: dto.name,
      type: dto.type,
      currentPrice: dto.currentPrice.toFixed(2),
      stock: dto.stock ?? 0,
      linkedEmptyProduct,
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

    const resultingType = dto.type ?? product.type;
    const resultingName = dto.name ?? product.name;
    const linkedEmptyProduct =
      resultingType === ProductType.GAS_CYLINDER_FULL
        ? await this.inferLinkedEmptyProduct(resultingName)
        : null;

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.type !== undefined) product.type = dto.type;
    if (dto.active !== undefined) product.active = dto.active;
    if (priceChanged) product.currentPrice = dto.currentPrice!.toFixed(2);
    product.linkedEmptyProduct = linkedEmptyProduct;

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

  async adjustStock(
    id: number,
    dto: AdjustStockDto,
    options: { allowPurchase?: boolean } = {},
  ): Promise<Product> {
    const product = await this.findOne(id);

    if (
      dto.delta > 0 &&
      product.type !== ProductType.GAS_CYLINDER_EMPTY &&
      !options.allowPurchase
    ) {
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
