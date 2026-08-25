import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Expense } from './expense.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('expense_items')
export class ExpenseItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Expense, (expense) => expense.items, { onDelete: 'CASCADE' })
  @JoinColumn()
  expense: Expense;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn()
  product: Product;

  @Column('int')
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: string;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: string;
}
