import { CreateOrderItemDto } from './create-order-item.dto';
import { CreateContainerLoanDto } from '../../clients/dto/create-container-loan.dto';
export declare class CreateOrderDto {
    clientId?: number;
    discount?: number;
    shippingCost?: number;
    total?: number;
    items: CreateOrderItemDto[];
    loans?: CreateContainerLoanDto[];
}
