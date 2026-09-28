import { Product } from './product.entity';
export declare class PriceHistory {
    id: number;
    product: Product;
    price: string;
    validFrom: Date;
}
