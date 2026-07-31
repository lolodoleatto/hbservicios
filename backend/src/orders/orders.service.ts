import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { ClientsService } from '../clients/clients.service';
import { ProductsService } from '../products/products.service';
import { Product, ProductType } from '../products/entities/product.entity';
import { Client } from '../clients/entities/client.entity';
import { ContainerLoan } from '../clients/entities/container-loan.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    private readonly clientsService: ClientsService,
    private readonly productsService: ProductsService,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order & { loans?: ContainerLoan[] }> {
    let client: Client | null = null;
    if (dto.clientId) {
      client = await this.clientsService.findOne(dto.clientId);
    }

    if (dto.loans?.length && !dto.clientId) {
      throw new BadRequestException(
        'No se puede registrar un préstamo de envase sin un cliente asociado al pedido',
      );
    }

    const products = await Promise.all(
      dto.items.map((item) => this.productsService.findOne(item.productId)),
    );

    products.forEach((product, i) => {
      if (product.stock < dto.items[i].quantity) {
        throw new BadRequestException(
          `Stock insuficiente para "${product.name}" (disponible: ${product.stock})`,
        );
      }
    });

    const now = new Date();
    const orderItems = dto.items.map((item, i) => {
      const product = products[i];
      const unitPrice = product.currentPrice;
      const subtotal = (Number(unitPrice) * item.quantity).toFixed(2);
      const expiresAt =
        product.type === ProductType.FIRE_EXTINGUISHER
          ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
          : null;

      return this.orderItemsRepository.create({
        product: { id: product.id } as Product,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        expiresAt,
      });
    });

    const discount = dto.discount ?? 0;
    const shippingCost = dto.shippingCost ?? 0;
    const total = (
      orderItems.reduce((sum, item) => sum + Number(item.subtotal), 0) -
      discount +
      shippingCost
    ).toFixed(2);

    const orderNumber = await this.nextOrderNumber();

    const order = this.ordersRepository.create({
      orderNumber,
      client,
      discount: discount.toFixed(2),
      shippingCost: shippingCost.toFixed(2),
      total,
      items: orderItems,
    });
    const saved = await this.ordersRepository.save(order);

    // El pedido ya quedó persistido; recién ahora se descuenta el stock,
    // para no dejar un pedido a mitad de camino si algo falla antes.
    for (const item of dto.items) {
      await this.productsService.adjustStock(item.productId, {
        delta: -item.quantity,
        reason: `Venta pedido #${orderNumber}`,
      });
    }

    let loans: ContainerLoan[] | undefined;
    if (dto.loans?.length) {
      loans = [];
      for (const loan of dto.loans) {
        loans.push(
          await this.clientsService.createLoan(dto.clientId!, {
            ...loan,
            notes: loan.notes ?? `Generado desde pedido #${orderNumber}`,
          }),
        );
      }
    }

    const created = await this.findOne(saved.id);
    return loans ? { ...created, loans } : created;
  }

  findAll(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: { client: true, items: { product: true } },
      order: { orderNumber: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: { client: true, items: { product: true } },
    });
    if (!order) {
      throw new NotFoundException(`Pedido ${id} no encontrado`);
    }
    return order;
  }

  private async nextOrderNumber(): Promise<number> {
    const last = await this.ordersRepository.findOne({
      where: {},
      order: { orderNumber: 'DESC' },
    });
    return (last?.orderNumber ?? 0) + 1;
  }
}
