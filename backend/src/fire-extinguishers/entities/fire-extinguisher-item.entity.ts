import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { FireExtinguisher } from './fire-extinguisher.entity';

// Cada línea de una recarga: qué tipo de matafuego, cuántos y a qué precio.
@Entity('fire_extinguisher_items')
export class FireExtinguisherItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FireExtinguisher, (fe) => fe.items, { onDelete: 'CASCADE' })
  @JoinColumn()
  fireExtinguisher: FireExtinguisher;

  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn()
  product: Product;

  @Column('int')
  quantity: number;

  // Precio por unidad de la recarga (no es el precio de venta del matafuego
  // nuevo). Opcional: las recargas históricas migradas pueden no tenerlo.
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  unitPrice: string | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  subtotal: string | null;
}
