import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('container_loans')
export class ContainerLoan {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn()
  client: Client;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn()
  product: Product;

  @Column('int')
  quantity: number;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  loanedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnedAt: Date | null;
}
