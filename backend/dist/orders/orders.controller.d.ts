import type { Response } from 'express';
import { OrdersService } from './orders.service';
import { OrdersPdfService } from './orders-pdf.service';
import { CreateOrderDto } from './dto/create-order.dto';
export declare class OrdersController {
    private readonly ordersService;
    private readonly ordersPdfService;
    constructor(ordersService: OrdersService, ordersPdfService: OrdersPdfService);
    create(dto: CreateOrderDto): Promise<import("./entities/order.entity").Order & {
        loans?: import("../clients/entities/container-loan.entity").ContainerLoan[];
    }>;
    findAll(): Promise<import("./entities/order.entity").Order[]>;
    findOne(id: number): Promise<import("./entities/order.entity").Order>;
    downloadPdf(id: number, res: Response): Promise<void>;
}
