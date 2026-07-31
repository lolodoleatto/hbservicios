import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { ContainerLoan } from './entities/container-loan.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateContainerLoanDto } from './dto/create-container-loan.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
    @InjectRepository(ContainerLoan)
    private readonly containerLoansRepository: Repository<ContainerLoan>,
    private readonly productsService: ProductsService,
  ) {}

  create(dto: CreateClientDto): Promise<Client> {
    const client = this.clientsRepository.create(dto);
    return this.clientsRepository.save(client);
  }

  findAll(includeInactive = false): Promise<Client[]> {
    return this.clientsRepository.find({
      where: includeInactive ? {} : { active: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Client> {
    const client = await this.clientsRepository.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    }
    return client;
  }

  async update(id: number, dto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);
    Object.assign(client, dto);
    return this.clientsRepository.save(client);
  }

  async deactivate(id: number): Promise<Client> {
    const client = await this.findOne(id);
    client.active = false;
    return this.clientsRepository.save(client);
  }

  async createLoan(
    clientId: number,
    dto: CreateContainerLoanDto,
  ): Promise<ContainerLoan> {
    const client = await this.findOne(clientId);
    const product = await this.productsService.findOne(dto.productId);

    const loan = this.containerLoansRepository.create({
      client,
      product,
      quantity: dto.quantity,
      notes: dto.notes,
    });
    return this.containerLoansRepository.save(loan);
  }

  async findLoans(
    clientId: number,
    includeReturned = false,
  ): Promise<ContainerLoan[]> {
    await this.findOne(clientId);
    return this.containerLoansRepository.find({
      where: includeReturned
        ? { client: { id: clientId } }
        : { client: { id: clientId }, returnedAt: IsNull() },
      relations: { product: true },
      order: { loanedAt: 'DESC' },
    });
  }

  async returnLoan(clientId: number, loanId: number): Promise<ContainerLoan> {
    const loan = await this.containerLoansRepository.findOne({
      where: { id: loanId, client: { id: clientId } },
      relations: { product: true },
    });
    if (!loan) {
      throw new NotFoundException(
        `Préstamo ${loanId} no encontrado para el cliente ${clientId}`,
      );
    }
    if (loan.returnedAt) {
      throw new BadRequestException('Este préstamo ya fue devuelto');
    }
    loan.returnedAt = new Date();
    return this.containerLoansRepository.save(loan);
  }
}
