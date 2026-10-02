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

  // true = el préstamo descontó stock al crearse (préstamo suelto desde
  // Clientes); al devolverlo vuelve exactamente lo mismo. false = el envase
  // salió junto con una venta (pedido sin canje), así que la venta ya
  // descontó la llena; al devolverlo entra un envase VACÍO. Los préstamos
  // anteriores a esta columna quedan en false, que es lo correcto porque
  // nunca descontaron stock.
  @Column({ default: false })
  stockDeducted: boolean;

  @CreateDateColumn()
  loanedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnedAt: Date | null;
}
