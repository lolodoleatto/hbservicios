import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    sales(from?: string, to?: string): Promise<{
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
    stockMovements(productId?: string, from?: string, to?: string): Promise<import("../products/entities/stock-movement.entity").StockMovement[]>;
    balance(from?: string, to?: string): Promise<{
        income: string;
        expenses: string;
        net: string;
        orderCount: number;
        expenseCount: number;
    }>;
    fireExtinguisherAlerts(daysAhead?: string): Promise<{
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
