import { Client } from '../../clients/entities/client.entity';
import { OrderItem } from './order-item.entity';
export declare enum OrderOrigin {
    ADMIN = "admin"
}
export declare enum OrderStatus {
    CONFIRMADO = "confirmado"
}
export declare class Order {
    id: number;
    orderNumber: number;
    client: Client | null;
    origin: OrderOrigin;
    status: OrderStatus;
    discount: string;
    shippingCost: string;
    total: string;
    items: OrderItem[];
    createdAt: Date;
}
