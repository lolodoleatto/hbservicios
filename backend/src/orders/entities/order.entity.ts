import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { OrderItem } from './order-item.entity';

export enum OrderOrigin {
  ADMIN = 'admin',
}

export enum OrderStatus {
  CONFIRMADO = 'confirmado',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  orderNumber: number;

  // null = "Consumidor final"
  @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  client: Client | null;

  // En v1.0 todos los pedidos los carga el admin (origen=ADMIN, estado=CONFIRMADO).
  // Preparado para el futuro portal de pedidos de clientes.
  @Column({ type: 'enum', enum: OrderOrigin, default: OrderOrigin.ADMIN })
  origin: OrderOrigin;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.CONFIRMADO,
  })
  status: OrderStatus;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  shippingCost: string;

  @Column('decimal', { precision: 10, scale: 2 })
  total: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;
}
