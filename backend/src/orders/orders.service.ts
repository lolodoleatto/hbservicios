import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import {
  dateRangeWhere,
  ListQuery,
  pageOptions,
  Paginated,
} from '../common/list-query';
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

    // Los préstamos de un pedido NO descuentan stock: el envase sale junto
    // con la garrafa vendida (sin canje), y esa venta ya la descontó. Sólo
    // se valida acá, antes de guardar nada, que sean garrafas/cilindros —
    // si no, el error saltaría con el pedido ya guardado y aplicado.
    if (dto.loans?.length) {
      const loanProducts = await Promise.all(
        dto.loans.map((loan) => this.productsService.findOne(loan.productId)),
      );
      loanProducts.forEach((p) => this.clientsService.assertLoanable(p));
      this.assertLoansMatchNoExchangeItems(dto, products, loanProducts);
    }

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
          await this.clientsService.createLoan(
            dto.clientId!,
            {
              ...loan,
              notes: loan.notes ?? `Generado desde pedido #${orderNumber}`,
            },
            { deductStock: false },
          ),
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

  // `search` busca por nombre de cliente o por número de pedido.
  async findAll(query: ListQuery = {}): Promise<Order[] | Paginated<Order>> {
    const date = dateRangeWhere(query.from, query.to);
    const base: FindOptionsWhere<Order> = date ? { date } : {};
    const search = query.search?.trim();

    let where: FindOptionsWhere<Order>[] = [base];
    if (search) {
      where = [{ ...base, client: { name: Like(`%${search}%`) } }];
      if (/^\d+$/.test(search)) {
        where.push({ ...base, orderNumber: Number(search) });
      }
    }

    const options = {
      where,
      relations: { client: true, items: { product: true } },
      order: { orderNumber: 'DESC' as const },
    };
    const paging = pageOptions(query);
    if (!paging) return this.ordersRepository.find(options);

    const [data, total] = await this.ordersRepository.findAndCount({
      ...options,
      skip: paging.skip,
      take: paging.take,
    });
    return { data, total, page: paging.page, pageSize: paging.pageSize };
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

  // Un préstamo en un pedido sólo tiene sentido por una garrafa llena vendida
  // SIN canje (el cliente se lleva el envase y no deja otro a cambio). Con
  // canje el cliente ya entregó su envase, no debe nada. Se cuenta por
  // garrafa: el préstamo puede ser de la llena o de su vacío vinculado.
  private assertLoansMatchNoExchangeItems(
    dto: CreateOrderDto,
    products: Product[],
    loanProducts: Product[],
  ): void {
    const available = new Map<number, number>();
    const fullIdByEmptyId = new Map<number, number>();
    dto.items.forEach((item, i) => {
      const product = products[i];
      const exchanged =
        product.linkedEmptyProduct && item.withExchange !== false;
      if (product.type !== ProductType.GAS_CYLINDER_FULL || exchanged) return;
      available.set(
        product.id,
        (available.get(product.id) ?? 0) + item.quantity,
      );
      if (product.linkedEmptyProduct) {
        fullIdByEmptyId.set(product.linkedEmptyProduct.id, product.id);
      }
    });

    dto.loans!.forEach((loan, i) => {
      const loanProduct = loanProducts[i];
      const key = fullIdByEmptyId.get(loanProduct.id) ?? loanProduct.id;
      const left = available.get(key) ?? 0;
      if (left < loan.quantity) {
        throw new BadRequestException(
          left === 0
            ? `El préstamo de "${loanProduct.name}" no corresponde a ninguna garrafa vendida sin canje en este pedido`
            : `Se prestan ${loan.quantity} de "${loanProduct.name}" pero sólo se venden ${left} sin canje en este pedido`,
        );
      }
      available.set(key, left - loan.quantity);
    });
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
