import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('price_history')
export class PriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, (product) => product.priceHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  product: Product;

  @Column('decimal', { precision: 10, scale: 2 })
  price: string;

  @CreateDateColumn()
  validFrom: Date;
}
