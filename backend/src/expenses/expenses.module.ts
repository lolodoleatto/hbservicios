import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([Expense]), ProductsModule],
  providers: [ExpensesService],
  controllers: [ExpensesController],
  exports: [TypeOrmModule, ExpensesService],
})
export class ExpensesModule {}
