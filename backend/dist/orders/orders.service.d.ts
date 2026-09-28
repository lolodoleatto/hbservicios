import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { ClientsService } from '../clients/clients.service';
import { ProductsService } from '../products/products.service';
import { ContainerLoan } from '../clients/entities/container-loan.entity';
export declare class OrdersService {
    private readonly ordersRepository;
    private readonly orderItemsRepository;
    private readonly clientsService;
    private readonly productsService;
    constructor(ordersRepository: Repository<Order>, orderItemsRepository: Repository<OrderItem>, clientsService: ClientsService, productsService: ProductsService);
    create(dto: CreateOrderDto): Promise<Order & {
        loans?: ContainerLoan[];
    }>;
    findAll(): Promise<Order[]>;
    findOne(id: number): Promise<Order>;
    private nextOrderNumber;
}
