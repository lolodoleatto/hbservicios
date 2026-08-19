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

  async create(dto: CreateFireExtinguisherDto): Promise<FireExtinguisher> {
    const client = await this.clientsService.findOne(dto.clientId);
    const product = await this.productsService.findOne(dto.productId);

    if (product.type !== ProductType.FIRE_EXTINGUISHER) {
      throw new BadRequestException(
        `"${product.name}" no es un producto de tipo matafuego`,
      );
    }
    if (product.stock < 1) {
      throw new BadRequestException(
        `Stock insuficiente para "${product.name}" (disponible: ${product.stock})`,
      );
    }

    const soldAt = dto.soldAt ?? toIsoDate(new Date());
    const expiresAt = dto.expiresAt ?? plusOneYear(soldAt);

    const fireExtinguisher = this.fireExtinguishersRepository.create({
      client,
      product,
      soldAt,
      expiresAt,
      notes: dto.notes,
    });
    const saved = await this.fireExtinguishersRepository.save(fireExtinguisher);

    // Guardado primero, recién ahora se descuenta stock (misma lógica que
    // en pedidos y gastos: ver avance-fase2.md sección 3.3).
    await this.productsService.adjustStock(product.id, {
      delta: -1,
      reason: `Venta matafuego #${saved.id}`,
    });

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
