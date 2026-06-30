import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: true })
  active: boolean;

  // Preparado para cuando los clientes puedan loguearse (portal de pedidos, fase futura)
  @OneToOne(() => User, { nullable: true })
  @JoinColumn()
  user: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
