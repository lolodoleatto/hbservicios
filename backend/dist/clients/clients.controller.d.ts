import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateContainerLoanDto } from './dto/create-container-loan.dto';
export declare class ClientsController {
    private readonly clientsService;
    constructor(clientsService: ClientsService);
    create(dto: CreateClientDto): Promise<import("./entities/client.entity").Client>;
    findAll(includeInactive?: string): Promise<import("./entities/client.entity").Client[]>;
    findOne(id: number): Promise<import("./entities/client.entity").Client>;
    update(id: number, dto: UpdateClientDto): Promise<import("./entities/client.entity").Client>;
    deactivate(id: number): Promise<import("./entities/client.entity").Client>;
    createLoan(id: number, dto: CreateContainerLoanDto): Promise<import("./entities/container-loan.entity").ContainerLoan>;
    findLoans(id: number, includeReturned?: string): Promise<import("./entities/container-loan.entity").ContainerLoan[]>;
    returnLoan(id: number, loanId: number): Promise<import("./entities/container-loan.entity").ContainerLoan>;
}
