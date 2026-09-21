import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExpenseItem } from './expense-item.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  // Monto total del gasto. Si tiene líneas de productos, por defecto es la
  // suma de sus subtotales, pero se puede pisar a mano (redondeos,
  // descuentos del proveedor, etc.) — no se recalcula server-side.
  @Column('decimal', { precision: 10, scale: 2 })
  amount: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'date' })
  date: string;

  // A quién se le compró (opcional — un gasto genérico como alquiler no
  // tiene proveedor).
  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  supplier: Supplier | null;

  // Vacío = gasto genérico (alquiler, sueldos, combustible...).
  // Con líneas = ingreso de stock (p.ej. compra de garrafas a varios
  // productos en un mismo viaje al proveedor).
  @OneToMany(() => ExpenseItem, (item) => item.expense, { cascade: true })
  items: ExpenseItem[];

  // true = este ingreso de stock es un canje con el proveedor: se le dan
  // envases vacíos a cambio de las llenas de cada línea, y el envase vacío
  // vinculado de cada producto se descuenta del stock.
  @Column({ default: false })
  isExchange: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
