import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PriceHistory } from './price-history.entity';

export enum ProductType {
  GAS_CYLINDER_FULL = 'gas_cylinder_full',
  GAS_CYLINDER_EMPTY = 'gas_cylinder_empty',
  FIRE_EXTINGUISHER = 'fire_extinguisher',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ProductType })
  type: ProductType;

  @Column('decimal', { precision: 10, scale: 2 })
  currentPrice: string;

  @Column('int', { default: 0 })
  stock: number;

  @Column({ default: true })
  active: boolean;

  // Solo tiene sentido en productos type=GAS_CYLINDER_FULL: el envase vacío
  // que se recibe a cambio al vender esta garrafa llena, o que se entrega al
  // proveedor al reponer stock (canje). Ver OrdersService y ExpensesService.
  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  linkedEmptyProduct: Product | null;

  @OneToMany(() => PriceHistory, (priceHistory) => priceHistory.product)
  priceHistory: PriceHistory[];

  @CreateDateColumn()
  createdAt: Date;
}
