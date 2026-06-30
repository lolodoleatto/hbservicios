import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn()
  order: Order;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn()
  product: Product;

  @Column('int')
  quantity: number;

  // Precio unitario al momento de la venta (no sigue cambios futuros del precio del producto)
  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: string;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: string;

  // Solo aplica a matafuegos: fecha de venta + 1 año, usado para alertas de vencimiento
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;
}
