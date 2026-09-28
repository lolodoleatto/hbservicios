import { ProductType } from '../entities/product.entity';
export declare class UpdateProductDto {
    name?: string;
    type?: ProductType;
    currentPrice?: number;
    active?: boolean;
}
