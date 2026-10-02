import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import {
  dateRangeWhere,
  ListQuery,
  pageOptions,
  Paginated,
} from '../common/list-query';
import { Expense } from './entities/expense.entity';
import { ExpenseItem } from './entities/expense-item.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CreateExpenseItemDto } from './dto/create-expense-item.dto';
import { ProductsService } from '../products/products.service';
import { Product, ProductType } from '../products/entities/product.entity';
import { SuppliersService } from '../suppliers/suppliers.service';
import { Supplier } from '../suppliers/entities/supplier.entity';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
    @InjectRepository(ExpenseItem)
    private readonly expenseItemsRepository: Repository<ExpenseItem>,
    private readonly productsService: ProductsService,
    private readonly suppliersService: SuppliersService,
  ) {}

  async create(dto: CreateExpenseDto): Promise<Expense> {
    const itemDtos = dto.items ?? [];
    const products = await Promise.all(
      itemDtos.map((item) => this.productsService.findOne(item.productId)),
    );

    let supplier: Supplier | null = null;
    if (dto.supplierId) {
      supplier = await this.suppliersService.findOne(dto.supplierId);
    }

    this.validateExchange(dto, itemDtos, products);

    const expense = this.expensesRepository.create({
      description: dto.description ?? null,
      amount: dto.amount.toFixed(2),
      category: dto.category,
      date: dto.date,
      supplier,
      isExchange: Boolean(dto.isExchange),
      items: this.buildExpenseItems(itemDtos, products),
    });
    const saved = await this.expensesRepository.save(expense);

    // El gasto ya quedó persistido; recién ahora se mueve el stock, para no
    // dejar un gasto a mitad de camino si algo falla antes (misma lógica
    // que en pedidos: ver avance-fase2.md sección 3.3).
    await this.applyStockEffects(saved.id, itemDtos, products, Boolean(dto.isExchange));

    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateExpenseDto): Promise<Expense> {
    const existing = await this.findOne(id);
    const itemDtos = dto.items ?? [];
    const products = await Promise.all(
      itemDtos.map((item) => this.productsService.findOne(item.productId)),
    );

    let supplier: Supplier | null = null;
    if (dto.supplierId) {
      supplier = await this.suppliersService.findOne(dto.supplierId);
    }

    // Se valida el canje como si el gasto viejo ya se hubiera revertido,
    // sin tocar nada todavía — así una edición que no cambia lo esencial
    // no queda bloqueada por su propio stock ya descontado.
    const reversal = this.buildReversalDeltas(existing);
    this.validateExchange(dto, itemDtos, products, reversal);

    await this.reverseStockEffects(existing);
    await this.expenseItemsRepository.delete({ expense: { id: existing.id } });

    existing.description = dto.description ?? null;
    existing.amount = dto.amount.toFixed(2);
    existing.category = dto.category;
    existing.date = dto.date;
    existing.supplier = supplier;
    existing.isExchange = Boolean(dto.isExchange);
    existing.items = this.buildExpenseItems(itemDtos, products);
    await this.expensesRepository.save(existing);

    await this.applyStockEffects(existing.id, itemDtos, products, Boolean(dto.isExchange));

    return this.findOne(id);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const expense = await this.findOne(id);
    await this.reverseStockEffects(expense);
    await this.expensesRepository.delete(id);
    return { deleted: true };
  }

  // `search` busca en descripción, categoría o nombre del proveedor.
  async findAll(
    productId?: number,
    query: ListQuery = {},
  ): Promise<Expense[] | Paginated<Expense>> {
    const date = dateRangeWhere(query.from, query.to);
    const base: FindOptionsWhere<Expense> = {
      ...(productId ? { items: { product: { id: productId } } } : {}),
      ...(date ? { date } : {}),
    };
    const search = query.search?.trim();
    const like = Like(`%${search}%`);
    const where: FindOptionsWhere<Expense>[] = search
      ? [
          { ...base, description: like },
          { ...base, category: like },
          { ...base, supplier: { name: like } },
        ]
      : [base];

    const options = {
      where,
      relations: { items: { product: true }, supplier: true },
      order: { date: 'DESC' as const, createdAt: 'DESC' as const, id: 'DESC' as const },
    };
    const paging = pageOptions(query);
    if (!paging) return this.expensesRepository.find(options);

    const [data, total] = await this.expensesRepository.findAndCount({
      ...options,
      skip: paging.skip,
      take: paging.take,
    });
    return { data, total, page: paging.page, pageSize: paging.pageSize };
  }

  async findOne(id: number): Promise<Expense> {
    const expense = await this.expensesRepository.findOne({
      where: { id },
      relations: { items: { product: { linkedEmptyProduct: true } }, supplier: true },
    });
    if (!expense) {
      throw new NotFoundException(`Gasto ${id} no encontrado`);
    }
    return expense;
  }

  private validateExchange(
    dto: CreateExpenseDto,
    itemDtos: CreateExpenseItemDto[],
    products: Product[],
    reversal?: Map<number, number>,
  ): void {
    if (!dto.isExchange) return;
    if (products.length === 0) {
      throw new BadRequestException(
        'Un canje con el proveedor necesita al menos un producto (las garrafas llenas que se reciben)',
      );
    }
    products.forEach((product, i) => {
      if (product.type !== ProductType.GAS_CYLINDER_FULL || !product.linkedEmptyProduct) {
        throw new BadRequestException(
          `"${product.name}" no tiene un envase vacío vinculado, no se puede hacer el canje`,
        );
      }
      const emptyProduct = product.linkedEmptyProduct;
      const effectiveStock = emptyProduct.stock + (reversal?.get(emptyProduct.id) ?? 0);
      if (effectiveStock < itemDtos[i].quantity) {
        throw new BadRequestException(
          `Stock insuficiente de "${emptyProduct.name}" para el canje (disponible: ${effectiveStock})`,
        );
      }
    });
  }

  private buildExpenseItems(itemDtos: CreateExpenseItemDto[], products: Product[]): ExpenseItem[] {
    return itemDtos.map((item, i) =>
      this.expenseItemsRepository.create({
        product: { id: products[i].id } as Product,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        subtotal: (item.unitPrice * item.quantity).toFixed(2),
      }),
    );
  }

  private async applyStockEffects(
    expenseId: number,
    itemDtos: CreateExpenseItemDto[],
    products: Product[],
    isExchange: boolean,
  ): Promise<void> {
    for (let i = 0; i < itemDtos.length; i++) {
      const product = products[i];
      await this.productsService.adjustStock(
        product.id,
        {
          delta: itemDtos[i].quantity,
          reason: isExchange
            ? `Canje con proveedor - gasto #${expenseId}`
            : `Compra - gasto #${expenseId}`,
        },
        { allowPurchase: true },
      );

      if (isExchange) {
        await this.productsService.adjustStock(product.linkedEmptyProduct!.id, {
          delta: -itemDtos[i].quantity,
          reason: `Canje con proveedor - gasto #${expenseId}`,
        });
      }
    }
  }

  // Deshace exactamente el efecto de stock que dejó `applyStockEffects`.
  private async reverseStockEffects(expense: Expense): Promise<void> {
    for (const item of expense.items) {
      const product = item.product;
      await this.productsService.adjustStock(product.id, {
        delta: -item.quantity,
        reason: `Reversión gasto #${expense.id}`,
      });

      if (expense.isExchange && product.linkedEmptyProduct) {
        await this.productsService.adjustStock(product.linkedEmptyProduct.id, {
          delta: item.quantity,
          reason: `Reversión canje gasto #${expense.id}`,
        });
      }
    }
  }

  // Cuánto cambiaría el stock de cada producto si `reverseStockEffects` se
  // aplicara sobre este gasto, sin tocar nada todavía.
  private buildReversalDeltas(expense: Expense): Map<number, number> {
    const deltas = new Map<number, number>();
    const add = (productId: number, amount: number) => {
      deltas.set(productId, (deltas.get(productId) ?? 0) + amount);
    };
    for (const item of expense.items) {
      add(item.product.id, -item.quantity);
      if (expense.isExchange && item.product.linkedEmptyProduct) {
        add(item.product.linkedEmptyProduct.id, item.quantity);
      }
    }
    return deltas;
  }
}
