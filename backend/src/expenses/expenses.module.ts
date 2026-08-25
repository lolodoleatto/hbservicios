import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseItem } from './entities/expense-item.entity';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ProductsModule } from '../products/products.module';
import { SuppliersModule } from '../suppliers/suppliers.module';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, ExpenseItem]), ProductsModule, SuppliersModule],
  providers: [ExpensesService],
  controllers: [ExpensesController],
  exports: [TypeOrmModule, ExpensesService],
})
export class ExpensesModule {}
