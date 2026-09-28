import { Client } from '../../clients/entities/client.entity';
import { Product } from '../../products/entities/product.entity';
export declare class FireExtinguisher {
    id: number;
    client: Client;
    product: Product;
    soldAt: string;
    expiresAt: string;
    amount: string | null;
    notes: string;
    createdAt: Date;
}
