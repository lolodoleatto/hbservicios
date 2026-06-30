import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
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

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create({
      name: dto.name,
      type: dto.type,
      currentPrice: dto.currentPrice.toFixed(2),
      stock: dto.stock ?? 0,
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

    return saved;
  }

  findAll(includeInactive = false): Promise<Product[]> {
    return this.productsRepository.find({
      where: includeInactive ? {} : { active: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { priceHistory: true },
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

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.type !== undefined) product.type = dto.type;
    if (dto.active !== undefined) product.active = dto.active;
    if (priceChanged) product.currentPrice = dto.currentPrice!.toFixed(2);

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
}
