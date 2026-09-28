import { PriceHistory } from './price-history.entity';
export declare enum ProductType {
    GAS_CYLINDER_FULL = "gas_cylinder_full",
    GAS_CYLINDER_EMPTY = "gas_cylinder_empty",
    FIRE_EXTINGUISHER = "fire_extinguisher"
}
export declare class Product {
    id: number;
    name: string;
    type: ProductType;
    currentPrice: string;
    stock: number;
    active: boolean;
    linkedEmptyProduct: Product | null;
    priceHistory: PriceHistory[];
    createdAt: Date;
}
