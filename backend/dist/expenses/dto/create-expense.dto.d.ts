import { CreateExpenseItemDto } from './create-expense-item.dto';
export declare class CreateExpenseDto {
    category: string;
    description?: string;
    amount: number;
    date: string;
    supplierId?: number;
    items?: CreateExpenseItemDto[];
    isExchange?: boolean;
}
