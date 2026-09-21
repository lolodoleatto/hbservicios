import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseItem } from './entities/expense-item.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
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

    if (dto.isExchange) {
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
        if (product.linkedEmptyProduct.stock < itemDtos[i].quantity) {
          throw new BadRequestException(
            `Stock insuficiente de "${product.linkedEmptyProduct.name}" para el canje (disponible: ${product.linkedEmptyProduct.stock})`,
          );
        }
      });
    }

    const expense = this.expensesRepository.create({
      description: dto.description ?? null,
      amount: dto.amount.toFixed(2),
      category: dto.category,
      date: dto.date,
      supplier,
      isExchange: Boolean(dto.isExchange),
      items: itemDtos.map((item, i) =>
        this.expenseItemsRepository.create({
          product: { id: products[i].id } as Product,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          subtotal: (item.unitPrice * item.quantity).toFixed(2),
        }),
      ),
    });
    const saved = await this.expensesRepository.save(expense);

    // El gasto ya quedó persistido; recién ahora se mueve el stock, para no
    // dejar un gasto a mitad de camino si algo falla antes (misma lógica
    // que en pedidos: ver avance-fase2.md sección 3.3).
    for (let i = 0; i < itemDtos.length; i++) {
      const product = products[i];
      await this.productsService.adjustStock(
        product.id,
        {
          delta: itemDtos[i].quantity,
          reason: dto.isExchange
            ? `Canje con proveedor - gasto #${saved.id}`
            : `Compra - gasto #${saved.id}`,
        },
        { allowPurchase: true },
      );

      if (dto.isExchange) {
        await this.productsService.adjustStock(product.linkedEmptyProduct!.id, {
          delta: -itemDtos[i].quantity,
          reason: `Canje con proveedor - gasto #${saved.id}`,
        });
      }
    }

    return this.findOne(saved.id);
  }

  findAll(productId?: number): Promise<Expense[]> {
    return this.expensesRepository.find({
      where: productId ? { items: { product: { id: productId } } } : {},
      relations: { items: { product: true }, supplier: true },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Expense> {
    const expense = await this.expensesRepository.findOne({
      where: { id },
      relations: { items: { product: true }, supplier: true },
    });
    if (!expense) {
      throw new NotFoundException(`Gasto ${id} no encontrado`);
    }
    return expense;
  }
}
