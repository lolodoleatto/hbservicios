import { Client } from './client.entity';
import { Product } from '../../products/entities/product.entity';
export declare class ContainerLoan {
    id: number;
    client: Client;
    product: Product;
    quantity: number;
    notes: string;
    loanedAt: Date;
    returnedAt: Date | null;
}
