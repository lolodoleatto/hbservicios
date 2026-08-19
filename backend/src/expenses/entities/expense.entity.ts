import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'date' })
  date: string;

  // Vacío = gasto genérico (alquiler, sueldos, combustible...).
  // Con producto = ingreso de stock (p.ej. compra de garrafas), y al
  // guardarse suma stock automáticamente con su costo unitario implícito
  // (amount / quantity).
  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  product: Product | null;

  @Column('int', { nullable: true })
  quantity: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
