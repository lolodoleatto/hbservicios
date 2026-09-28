import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { ContainerLoan } from './entities/container-loan.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateContainerLoanDto } from './dto/create-container-loan.dto';
import { ProductsService } from '../products/products.service';
export declare class ClientsService {
    private readonly clientsRepository;
    private readonly containerLoansRepository;
    private readonly productsService;
    constructor(clientsRepository: Repository<Client>, containerLoansRepository: Repository<ContainerLoan>, productsService: ProductsService);
    create(dto: CreateClientDto): Promise<Client>;
    findAll(includeInactive?: boolean): Promise<Client[]>;
    findOne(id: number): Promise<Client>;
    update(id: number, dto: UpdateClientDto): Promise<Client>;
    deactivate(id: number): Promise<Client>;
    createLoan(clientId: number, dto: CreateContainerLoanDto): Promise<ContainerLoan>;
    findLoans(clientId: number, includeReturned?: boolean): Promise<ContainerLoan[]>;
    returnLoan(clientId: number, loanId: number): Promise<ContainerLoan>;
}
