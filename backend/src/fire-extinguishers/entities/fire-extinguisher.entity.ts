import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('fire_extinguishers')
export class FireExtinguisher {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn()
  client: Client;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn()
  product: Product;

  @Column({ type: 'date' })
  soldAt: string;

  // Por defecto soldAt + 1 año, pero se puede pisar a mano (recarga con
  // vencimiento distinto, venta retroactiva, etc.)
  @Column({ type: 'date' })
  expiresAt: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
