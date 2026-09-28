import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
export declare class ExpensesController {
    private readonly expensesService;
    constructor(expensesService: ExpensesService);
    create(dto: CreateExpenseDto): Promise<import("./entities/expense.entity").Expense>;
    findAll(productId?: string): Promise<import("./entities/expense.entity").Expense[]>;
    findOne(id: number): Promise<import("./entities/expense.entity").Expense>;
}
