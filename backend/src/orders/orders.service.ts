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
      let expiresAt: Date | null = null;
      if (product.type === ProductType.FIRE_EXTINGUISHER) {
        expiresAt = item.expiresAt
          ? new Date(`${item.expiresAt}T00:00:00`)
          : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      }

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
    const computedTotal =
      orderItems.reduce((sum, item) => sum + Number(item.subtotal), 0) - discount + shippingCost;
    const total = (dto.total ?? computedTotal).toFixed(2);

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
    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i];
      const product = products[i];

      await this.productsService.adjustStock(item.productId, {
        delta: -item.quantity,
        reason: `Venta pedido #${orderNumber}`,
      });

      // Canje: el cliente entrega su envase vacío a cambio de la garrafa
      // llena. Por defecto se asume que sí (es lo normal en este negocio),
      // salvo que se marque explícitamente withExchange: false.
      if (
        product.type === ProductType.GAS_CYLINDER_FULL &&
        product.linkedEmptyProduct &&
        item.withExchange !== false
      ) {
        await this.productsService.adjustStock(product.linkedEmptyProduct.id, {
          delta: item.quantity,
          reason: `Canje - pedido #${orderNumber}`,
        });
      }
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
