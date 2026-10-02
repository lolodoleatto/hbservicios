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
import { Product, ProductType } from '../products/entities/product.entity';

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
    // false cuando el préstamo sale de un pedido: la venta ya descontó la
    // garrafa, el préstamo sólo registra que el cliente debe el envase.
    { deductStock = true }: { deductStock?: boolean } = {},
  ): Promise<ContainerLoan> {
    const client = await this.findOne(clientId);
    const product = await this.productsService.findOne(dto.productId);

    this.assertLoanable(product);

    if (deductStock && product.stock < dto.quantity) {
      throw new BadRequestException(
        `Stock insuficiente de "${product.name}" para este préstamo (disponible: ${product.stock})`,
      );
    }

    const loan = this.containerLoansRepository.create({
      client,
      product,
      quantity: dto.quantity,
      notes: dto.notes,
      stockDeducted: deductStock,
    });
    const saved = await this.containerLoansRepository.save(loan);

    if (deductStock) {
      // El préstamo ya quedó persistido; recién ahora se descuenta el stock
      // (mientras está afuera, no está disponible para vender ni canjear).
      await this.productsService.adjustStock(product.id, {
        delta: -dto.quantity,
        reason: `Préstamo #${saved.id} a ${client.name}`,
      });
    }

    return saved;
  }

  assertLoanable(product: Product): void {
    if (
      product.type !== ProductType.GAS_CYLINDER_FULL &&
      product.type !== ProductType.GAS_CYLINDER_EMPTY
    ) {
      throw new BadRequestException(
        `"${product.name}" no es una garrafa/cilindro, no se puede prestar`,
      );
    }
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
      relations: { product: { linkedEmptyProduct: true } },
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
    const saved = await this.containerLoansRepository.save(loan);

    // Si el préstamo descontó stock, vuelve lo mismo que salió. Si salió con
    // una venta, el cliente devuelve el envase vacío: entra al stock del
    // vacío vinculado (o al mismo producto si ya era un vacío). Si una llena
    // no tiene vacío vinculado no hay dónde sumarlo, y sólo se marca devuelto.
    const returnedProduct = loan.stockDeducted
      ? loan.product
      : loan.product.type === ProductType.GAS_CYLINDER_EMPTY
        ? loan.product
        : loan.product.linkedEmptyProduct;

    if (returnedProduct) {
      // allowPurchase porque es una suma positiva legítima que no pasa por Gastos.
      await this.productsService.adjustStock(
        returnedProduct.id,
        { delta: loan.quantity, reason: `Devolución de préstamo #${loan.id}` },
        { allowPurchase: true },
      );
    }

    return saved;
  }
}
