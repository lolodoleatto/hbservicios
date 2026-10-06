import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FireExtinguisher } from './entities/fire-extinguisher.entity';
import { FireExtinguisherItem } from './entities/fire-extinguisher-item.entity';
import {
  CreateFireExtinguisherDto,
  CreateFireExtinguisherItemDto,
} from './dto/create-fire-extinguisher.dto';
import { UpdateFireExtinguisherDto } from './dto/update-fire-extinguisher.dto';
import { ClientsService } from '../clients/clients.service';
import { ProductsService } from '../products/products.service';
import { Product, ProductType } from '../products/entities/product.entity';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function plusOneYear(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setFullYear(date.getFullYear() + 1);
  return toIsoDate(date);
}

@Injectable()
export class FireExtinguishersService implements OnModuleInit {
  private readonly logger = new Logger(FireExtinguishersService.name);

  constructor(
    @InjectRepository(FireExtinguisher)
    private readonly fireExtinguishersRepository: Repository<FireExtinguisher>,
    @InjectRepository(FireExtinguisherItem)
    private readonly itemsRepository: Repository<FireExtinguisherItem>,
    private readonly clientsService: ClientsService,
    private readonly productsService: ProductsService,
  ) {}

  // Migración única: antes cada recarga tenía un solo matafuego, guardado en
  // la columna `productId` de la cabecera. Al arrancar, cada recarga vieja
  // pasa a tener una línea (cantidad 1, precio = el monto que tenía) y se
  // limpia la columna vieja. Si ya está migrado, no encuentra nada y no hace
  // nada, así que es seguro que corra en cada arranque.
  async onModuleInit(): Promise<void> {
    const legacy = await this.fireExtinguishersRepository
      .createQueryBuilder('fe')
      .leftJoinAndSelect('fe.product', 'product')
      .leftJoinAndSelect('fe.items', 'items')
      .where('fe.productId IS NOT NULL')
      .getMany();

    for (const fe of legacy) {
      if (!fe.items.length && fe.product) {
        await this.itemsRepository.save(
          this.itemsRepository.create({
            fireExtinguisher: { id: fe.id } as FireExtinguisher,
            product: fe.product,
            quantity: 1,
            unitPrice: fe.amount,
            subtotal: fe.amount,
          }),
        );
      }
      await this.fireExtinguishersRepository.update(fe.id, { product: null });
    }
    if (legacy.length) {
      this.logger.log(`Recargas migradas al formato con líneas: ${legacy.length}`);
    }
  }

  // Este módulo registra RECARGAS de matafuegos que el cliente ya tiene
  // (la venta del matafuego nuevo se hace por Pedidos, que ya guarda su
  // propio vencimiento). Por eso no toca stock: recargar no es entregar una
  // unidad nueva, es un servicio sobre la que el cliente ya tiene.
  async create(dto: CreateFireExtinguisherDto): Promise<FireExtinguisher> {
    const client = await this.clientsService.findOne(dto.clientId);
    const items = await this.buildItems(dto.items);

    const soldAt = dto.soldAt ?? toIsoDate(new Date());
    const expiresAt = dto.expiresAt ?? plusOneYear(soldAt);

    const fireExtinguisher = this.fireExtinguishersRepository.create({
      client,
      items,
      soldAt,
      expiresAt,
      amount: this.resolveAmount(dto.amount, items),
      notes: dto.notes,
    });
    const saved = await this.fireExtinguishersRepository.save(fireExtinguisher);

    return this.findOne(saved.id);
  }

  findAll(): Promise<FireExtinguisher[]> {
    return this.fireExtinguishersRepository.find({
      relations: { client: true, items: { product: true } },
      order: { expiresAt: 'ASC', id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<FireExtinguisher> {
    const fireExtinguisher = await this.fireExtinguishersRepository.findOne({
      where: { id },
      relations: { client: true, items: { product: true } },
    });
    if (!fireExtinguisher) {
      throw new NotFoundException(`Recarga ${id} no encontrada`);
    }
    return fireExtinguisher;
  }

  // No toca stock (ver comentario en create): una recarga se puede corregir
  // o borrar libremente sin ningún efecto secundario que revertir.
  async update(id: number, dto: UpdateFireExtinguisherDto): Promise<FireExtinguisher> {
    const fireExtinguisher = await this.findOne(id);

    if (dto.clientId !== undefined) {
      fireExtinguisher.client = await this.clientsService.findOne(dto.clientId);
    }
    if (dto.items !== undefined) {
      const items = await this.buildItems(dto.items);
      // Las líneas se reemplazan enteras: se borran las viejas y se guardan
      // las nuevas con la cabecera.
      await this.itemsRepository.delete({ fireExtinguisher: { id } });
      fireExtinguisher.items = items;
    }
    if (dto.soldAt !== undefined) fireExtinguisher.soldAt = dto.soldAt;
    if (dto.expiresAt !== undefined) fireExtinguisher.expiresAt = dto.expiresAt;
    if (dto.amount !== undefined || dto.items !== undefined) {
      fireExtinguisher.amount = this.resolveAmount(dto.amount, fireExtinguisher.items);
    }
    if (dto.notes !== undefined) fireExtinguisher.notes = dto.notes;

    await this.fireExtinguishersRepository.save(fireExtinguisher);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    await this.findOne(id);
    await this.fireExtinguishersRepository.delete(id);
    return { deleted: true };
  }

  private async buildItems(
    itemDtos: CreateFireExtinguisherItemDto[],
  ): Promise<FireExtinguisherItem[]> {
    const products = await Promise.all(
      itemDtos.map((item) => this.productsService.findOne(item.productId)),
    );
    products.forEach((product) => {
      if (product.type !== ProductType.FIRE_EXTINGUISHER) {
        throw new BadRequestException(
          `"${product.name}" no es un producto de tipo matafuego`,
        );
      }
    });

    return itemDtos.map((item, i) => {
      const hasPrice = item.unitPrice !== undefined;
      return this.itemsRepository.create({
        product: { id: products[i].id } as Product,
        quantity: item.quantity,
        unitPrice: hasPrice ? item.unitPrice!.toFixed(2) : null,
        subtotal: hasPrice ? (item.unitPrice! * item.quantity).toFixed(2) : null,
      });
    });
  }

  // Total = el que se mandó a mano, o si no la suma de las líneas con
  // precio; null si ninguna línea tiene precio.
  private resolveAmount(
    amount: number | undefined,
    items: FireExtinguisherItem[],
  ): string | null {
    if (amount !== undefined) return amount.toFixed(2);
    const priced = items.filter((item) => item.subtotal !== null);
    if (!priced.length) return null;
    return priced.reduce((sum, item) => sum + Number(item.subtotal), 0).toFixed(2);
  }
}
