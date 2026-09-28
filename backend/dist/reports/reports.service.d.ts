import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { StockMovement } from '../products/entities/stock-movement.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { FireExtinguisher } from '../fire-extinguishers/entities/fire-extinguisher.entity';
export declare class ReportsService {
    private readonly ordersRepository;
    private readonly orderItemsRepository;
    private readonly stockMovementsRepository;
    private readonly expensesRepository;
    private readonly fireExtinguishersRepository;
    constructor(ordersRepository: Repository<Order>, orderItemsRepository: Repository<OrderItem>, stockMovementsRepository: Repository<StockMovement>, expensesRepository: Repository<Expense>, fireExtinguishersRepository: Repository<FireExtinguisher>);
    salesReport(from?: string, to?: string): Promise<{
        totalOrders: number;
        totalRevenue: string;
        totalDiscount: string;
        totalShipping: string;
        byProduct: {
            revenue: string;
            productId: number;
            productName: string;
            quantitySold: number;
        }[];
    }>;
    stockMovements(productId?: number, from?: string, to?: string): Promise<StockMovement[]>;
    balance(from?: string, to?: string): Promise<{
        income: string;
        expenses: string;
        net: string;
        orderCount: number;
        expenseCount: number;
    }>;
    fireExtinguisherAlerts(daysAhead?: number): Promise<{
        expired: boolean;
        id: string;
        source: "pedido" | "directo";
        orderNumber: number | null;
        clientId: number | null;
        clientName: string;
        productId: number;
        productName: string;
        quantity: number;
        expiresAt: Date;
    }[]>;
}
