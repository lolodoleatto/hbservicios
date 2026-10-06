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
import { Product } from '../../products/entities/product.entity';
import { FireExtinguisherItem } from './fire-extinguisher-item.entity';

// Una recarga de matafuegos de un cliente: cabecera con fecha, vencimiento y
// total, y una o más líneas (tipo de matafuego + cantidad + precio).
@Entity('fire_extinguishers')
export class FireExtinguisher {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn()
  client: Client;

  @OneToMany(() => FireExtinguisherItem, (item) => item.fireExtinguisher, {
    cascade: true,
  })
  items: FireExtinguisherItem[];

  // OBSOLETO: antes cada recarga era de un solo matafuego y el producto vivía
  // acá. Se conserva la columna (nullable) sólo para que la sincronización
  // del esquema no la borre antes de migrar esas recargas a `items` (ver
  // FireExtinguishersService.onModuleInit). Después de migrar queda en null.
  @ManyToOne(() => Product, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn()
  product: Product | null;

  @Column({ type: 'date' })
  soldAt: string;

  // Por defecto soldAt + 1 año, pero se puede pisar a mano (recarga con
  // vencimiento distinto, carga retroactiva, etc.)
  @Column({ type: 'date' })
  expiresAt: string;

  // Total cobrado por la recarga. Si no se manda, es la suma de las líneas
  // con precio; puede quedar vacío en cargas históricas sin monto.
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  amount: string | null;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
