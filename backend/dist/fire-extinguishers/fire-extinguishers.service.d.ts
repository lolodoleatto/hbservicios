import { Repository } from 'typeorm';
import { FireExtinguisher } from './entities/fire-extinguisher.entity';
import { CreateFireExtinguisherDto } from './dto/create-fire-extinguisher.dto';
import { ClientsService } from '../clients/clients.service';
import { ProductsService } from '../products/products.service';
export declare class FireExtinguishersService {
    private readonly fireExtinguishersRepository;
    private readonly clientsService;
    private readonly productsService;
    constructor(fireExtinguishersRepository: Repository<FireExtinguisher>, clientsService: ClientsService, productsService: ProductsService);
    create(dto: CreateFireExtinguisherDto): Promise<FireExtinguisher>;
    findAll(): Promise<FireExtinguisher[]>;
    findOne(id: number): Promise<FireExtinguisher>;
}
