import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FireExtinguisher } from './entities/fire-extinguisher.entity';
import { CreateFireExtinguisherDto } from './dto/create-fire-extinguisher.dto';
import { ClientsService } from '../clients/clients.service';
import { ProductsService } from '../products/products.service';
import { ProductType } from '../products/entities/product.entity';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function plusOneYear(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setFullYear(date.getFullYear() + 1);
  return toIsoDate(date);
}

@Injectable()
export class FireExtinguishersService {
  constructor(
    @InjectRepository(FireExtinguisher)
    private readonly fireExtinguishersRepository: Repository<FireExtinguisher>,
    private readonly clientsService: ClientsService,
    private readonly productsService: ProductsService,
  ) {}

  // Este módulo registra RECARGAS de matafuegos que el cliente ya tiene
  // (la venta del matafuego nuevo se hace por Pedidos, que ya guarda su
  // propio vencimiento). Por eso no toca stock: recargar no es entregar una
  // unidad nueva, es un servicio sobre la que el cliente ya tiene.
  async create(dto: CreateFireExtinguisherDto): Promise<FireExtinguisher> {
    const client = await this.clientsService.findOne(dto.clientId);
    const product = await this.productsService.findOne(dto.productId);

    if (product.type !== ProductType.FIRE_EXTINGUISHER) {
      throw new BadRequestException(
        `"${product.name}" no es un producto de tipo matafuego`,
      );
    }

    const soldAt = dto.soldAt ?? toIsoDate(new Date());
    const expiresAt = dto.expiresAt ?? plusOneYear(soldAt);

    const fireExtinguisher = this.fireExtinguishersRepository.create({
      client,
      product,
      soldAt,
      expiresAt,
      amount: dto.amount !== undefined ? dto.amount.toFixed(2) : null,
      notes: dto.notes,
    });
    const saved = await this.fireExtinguishersRepository.save(fireExtinguisher);

    return this.findOne(saved.id);
  }

  findAll(): Promise<FireExtinguisher[]> {
    return this.fireExtinguishersRepository.find({
      relations: { client: true, product: true },
      order: { expiresAt: 'ASC' },
    });
  }

  async findOne(id: number): Promise<FireExtinguisher> {
    const fireExtinguisher = await this.fireExtinguishersRepository.findOne({
      where: { id },
      relations: { client: true, product: true },
    });
    if (!fireExtinguisher) {
      throw new NotFoundException(`Matafuego ${id} no encontrado`);
    }
    return fireExtinguisher;
  }
}
