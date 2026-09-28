import { Expense } from './expense.entity';
import { Product } from '../../products/entities/product.entity';
export declare class ExpenseItem {
    id: number;
    expense: Expense;
    product: Product;
    quantity: number;
    unitPrice: string;
    subtotal: string;
}
