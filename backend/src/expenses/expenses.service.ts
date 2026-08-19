import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ProductsService } from '../products/products.service';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
    private readonly productsService: ProductsService,
  ) {}

  async create(dto: CreateExpenseDto): Promise<Expense> {
    let product: Product | null = null;
    if (dto.productId) {
      product = await this.productsService.findOne(dto.productId);
    }

    const expense = this.expensesRepository.create({
      description: dto.description,
      amount: dto.amount.toFixed(2),
      category: dto.category,
      date: dto.date,
      product,
      quantity: product ? dto.quantity! : null,
    });
    const saved = await this.expensesRepository.save(expense);

    // El gasto ya quedó persistido; recién ahora se suma el stock, para no
    // dejar un gasto a mitad de camino si algo falla antes (misma lógica
    // que en pedidos: ver avance-fase2.md sección 3.3).
    if (product) {
      await this.productsService.adjustStock(product.id, {
        delta: dto.quantity!,
        reason: `Compra - gasto #${saved.id}`,
      });
    }

    return this.findOne(saved.id);
  }

  findAll(): Promise<Expense[]> {
    return this.expensesRepository.find({
      relations: { product: true },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Expense> {
    const expense = await this.expensesRepository.findOne({
      where: { id },
      relations: { product: true },
    });
    if (!expense) {
      throw new NotFoundException(`Gasto ${id} no encontrado`);
    }
    return expense;
  }
}
