import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseItem } from './entities/expense-item.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ProductsService } from '../products/products.service';
import { SuppliersService } from '../suppliers/suppliers.service';
export declare class ExpensesService {
    private readonly expensesRepository;
    private readonly expenseItemsRepository;
    private readonly productsService;
    private readonly suppliersService;
    constructor(expensesRepository: Repository<Expense>, expenseItemsRepository: Repository<ExpenseItem>, productsService: ProductsService, suppliersService: SuppliersService);
    create(dto: CreateExpenseDto): Promise<Expense>;
    findAll(productId?: number): Promise<Expense[]>;
    findOne(id: number): Promise<Expense>;
}
