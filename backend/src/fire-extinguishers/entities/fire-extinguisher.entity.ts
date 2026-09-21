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
  // vencimiento distinto, carga retroactiva, etc.)
  @Column({ type: 'date' })
  expiresAt: string;

  // Monto cobrado por la recarga (opcional — no todas las cargas históricas
  // lo tienen registrado).
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  amount: string | null;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
