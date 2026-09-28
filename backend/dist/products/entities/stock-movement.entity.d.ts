import { Product } from './product.entity';
export declare class StockMovement {
    id: number;
    product: Product;
    delta: number;
    reason: string;
    createdAt: Date;
}
