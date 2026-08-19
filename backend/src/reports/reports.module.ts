import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { FireExtinguishersModule } from '../fire-extinguishers/fire-extinguishers.module';

@Module({
  imports: [OrdersModule, ProductsModule, ExpensesModule, FireExtinguishersModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
