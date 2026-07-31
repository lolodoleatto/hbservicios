import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersPdfService } from './orders-pdf.service';
import { OrdersController } from './orders.controller';
import { ClientsModule } from '../clients/clients.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    ClientsModule,
    ProductsModule,
  ],
  providers: [OrdersService, OrdersPdfService],
  controllers: [OrdersController],
  exports: [TypeOrmModule, OrdersService],
})
export class OrdersModule {}
