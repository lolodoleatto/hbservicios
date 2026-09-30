import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
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

    const orderItems = this.buildOrderItems(dto.items, products);

    const discount = dto.discount ?? 0;
    const shippingCost = dto.shippingCost ?? 0;
    const computedTotal =
      orderItems.reduce((sum, item) => sum + Number(item.subtotal), 0) - discount + shippingCost;
    const total = (dto.total ?? computedTotal).toFixed(2);

    const orderNumber = await this.nextOrderNumber();

    const order = this.ordersRepository.create({
      orderNumber,
      client,
      date: dto.date ?? new Date().toISOString().slice(0, 10),
      discount: discount.toFixed(2),
      shippingCost: shippingCost.toFixed(2),
      total,
      items: orderItems,
    });
    const saved = await this.ordersRepository.save(order);

    // El pedido ya quedó persistido; recién ahora se descuenta el stock,
    // para no dejar un pedido a mitad de camino si algo falla antes.
    await this.applyStockEffects(saved.orderNumber, dto.items, products);

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

  async update(id: number, dto: UpdateOrderDto): Promise<Order> {
    const existing = await this.findOne(id);

    let client: Client | null = null;
    if (dto.clientId) {
      client = await this.clientsService.findOne(dto.clientId);
    }

    const products = await Promise.all(
      dto.items.map((item) => this.productsService.findOne(item.productId)),
    );

    // Se calcula el stock "efectivo" como si el pedido viejo ya se hubiera
    // revertido, sin tocar nada todavía — así una edición que no cambia
    // cantidades (o que las baja) nunca queda bloqueada por su propio
    // stock ya vendido.
    const reversal = this.buildReversalDeltas(existing);
    products.forEach((product, i) => {
      const effectiveStock = product.stock + (reversal.get(product.id) ?? 0);
      if (effectiveStock < dto.items[i].quantity) {
        throw new BadRequestException(
          `Stock insuficiente para "${product.name}" (disponible: ${effectiveStock})`,
        );
      }
    });

    // Recién con la validación en verde se revierte de verdad el pedido
    // viejo y se aplica el nuevo, igual que en create().
    await this.reverseStockEffects(existing);
    await this.orderItemsRepository.delete({ order: { id: existing.id } });

    const orderItems = this.buildOrderItems(dto.items, products);
    const discount = dto.discount ?? 0;
    const shippingCost = dto.shippingCost ?? 0;
    const computedTotal =
      orderItems.reduce((sum, item) => sum + Number(item.subtotal), 0) - discount + shippingCost;
    const total = (dto.total ?? computedTotal).toFixed(2);

    existing.client = client;
    if (dto.date !== undefined) existing.date = dto.date;
    existing.discount = discount.toFixed(2);
    existing.shippingCost = shippingCost.toFixed(2);
    existing.total = total;
    existing.items = orderItems;
    await this.ordersRepository.save(existing);

    await this.applyStockEffects(existing.orderNumber, dto.items, products);

    return this.findOne(id);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const order = await this.findOne(id);
    await this.reverseStockEffects(order);
    await this.ordersRepository.delete(id);
    return { deleted: true };
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
      relations: { client: true, items: { product: { linkedEmptyProduct: true } } },
    });
    if (!order) {
      throw new NotFoundException(`Pedido ${id} no encontrado`);
    }
    return order;
  }

  private buildOrderItems(itemDtos: CreateOrderItemDto[], products: Product[]): OrderItem[] {
    const now = new Date();
    return itemDtos.map((item, i) => {
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
        withExchange: item.withExchange !== false,
      });
    });
  }

  // Aplica el efecto de stock de una venta: baja el producto vendido y, si
  // corresponde, acredita el envase vacío vinculado (canje).
  private async applyStockEffects(
    orderNumber: number,
    itemDtos: CreateOrderItemDto[],
    products: Product[],
  ): Promise<void> {
    for (let i = 0; i < itemDtos.length; i++) {
      const item = itemDtos[i];
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
  }

  // Deshace exactamente el efecto de stock que dejó `applyStockEffects` en
  // su momento, usando lo que quedó guardado en cada línea (withExchange
  // incluido) — así una edición o un borrado no dependen de recalcular la
  // intención original.
  private async reverseStockEffects(order: Order): Promise<void> {
    for (const item of order.items) {
      const product = item.product;

      await this.productsService.adjustStock(
        product.id,
        { delta: item.quantity, reason: `Reversión pedido #${order.orderNumber}` },
        { allowPurchase: true },
      );

      if (
        product.type === ProductType.GAS_CYLINDER_FULL &&
        product.linkedEmptyProduct &&
        item.withExchange
      ) {
        await this.productsService.adjustStock(product.linkedEmptyProduct.id, {
          delta: -item.quantity,
          reason: `Reversión canje pedido #${order.orderNumber}`,
        });
      }
    }
  }

  // Cuánto cambiaría el stock de cada producto si `reverseStockEffects` se
  // aplicara sobre este pedido, sin tocar nada todavía — se usa para
  // validar una edición sin dejar el stock a medio revertir si algo falla.
  private buildReversalDeltas(order: Order): Map<number, number> {
    const deltas = new Map<number, number>();
    const add = (productId: number, amount: number) => {
      deltas.set(productId, (deltas.get(productId) ?? 0) + amount);
    };
    for (const item of order.items) {
      add(item.product.id, item.quantity);
      if (
        item.product.type === ProductType.GAS_CYLINDER_FULL &&
        item.product.linkedEmptyProduct &&
        item.withExchange
      ) {
        add(item.product.linkedEmptyProduct.id, -item.quantity);
      }
    }
    return deltas;
  }

  private async nextOrderNumber(): Promise<number> {
    const last = await this.ordersRepository.findOne({
      where: {},
      order: { orderNumber: 'DESC' },
    });
    return (last?.orderNumber ?? 0) + 1;
  }
}
