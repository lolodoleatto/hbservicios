import { ExpenseItem } from './expense-item.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
export declare class Expense {
    id: number;
    description: string | null;
    amount: string;
    category: string;
    date: string;
    supplier: Supplier | null;
    items: ExpenseItem[];
    isExchange: boolean;
    createdAt: Date;
}
