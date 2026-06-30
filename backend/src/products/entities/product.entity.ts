import {
  Column,
  CreateDateColumn,
  Entity,
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

  @OneToMany(() => PriceHistory, (priceHistory) => priceHistory.product)
  priceHistory: PriceHistory[];

  @CreateDateColumn()
  createdAt: Date;
}
