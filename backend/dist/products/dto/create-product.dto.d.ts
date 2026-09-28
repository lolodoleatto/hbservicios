import { ProductType } from '../entities/product.entity';
export declare class CreateProductDto {
    name: string;
    type: ProductType;
    currentPrice: number;
    stock?: number;
}
