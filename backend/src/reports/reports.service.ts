import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { StockMovement } from '../products/entities/stock-movement.entity';
import { ProductType } from '../products/entities/product.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { FireExtinguisher } from '../fire-extinguishers/entities/fire-extinguisher.entity';

function dateTimeRangeWhere(from?: string, to?: string) {
  if (from && to) {
    return Between(new Date(`${from}T00:00:00`), new Date(`${to}T23:59:59.999`));
  }
  if (from) return MoreThanOrEqual(new Date(`${from}T00:00:00`));
  if (to) return LessThanOrEqual(new Date(`${to}T23:59:59.999`));
  return undefined;
}

function dateRangeWhere(from?: string, to?: string) {
  if (from && to) return Between(from, to);
  if (from) return MoreThanOrEqual(from);
  if (to) return LessThanOrEqual(to);
  return undefined;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(StockMovement)
    private readonly stockMovementsRepository: Repository<StockMovement>,
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
    @InjectRepository(FireExtinguisher)
    private readonly fireExtinguishersRepository: Repository<FireExtinguisher>,
  ) {}

  async salesReport(from?: string, to?: string) {
    const createdAt = dateTimeRangeWhere(from, to);
    const orders = await this.ordersRepository.find({
      where: createdAt ? { createdAt } : {},
      relations: { items: { product: true } },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalDiscount = orders.reduce((sum, o) => sum + Number(o.discount), 0);
    const totalShipping = orders.reduce((sum, o) => sum + Number(o.shippingCost), 0);

    const byProduct = new Map<
      number,
      { productId: number; productName: string; quantitySold: number; revenue: number }
    >();
    for (const order of orders) {
      for (const item of order.items) {
        const entry = byProduct.get(item.product.id) ?? {
          productId: item.product.id,
          productName: item.product.name,
          quantitySold: 0,
          revenue: 0,
        };
        entry.quantitySold += item.quantity;
        entry.revenue += Number(item.subtotal);
        byProduct.set(item.product.id, entry);
      }
    }

    return {
      totalOrders: orders.length,
      totalRevenue: totalRevenue.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      totalShipping: totalShipping.toFixed(2),
      byProduct: [...byProduct.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .map((p) => ({ ...p, revenue: p.revenue.toFixed(2) })),
    };
  }

  stockMovements(productId?: number, from?: string, to?: string) {
    const createdAt = dateTimeRangeWhere(from, to);
    return this.stockMovementsRepository.find({
      where: {
        ...(createdAt ? { createdAt } : {}),
        ...(productId ? { product: { id: productId } } : {}),
      },
      relations: { product: true },
      order: { createdAt: 'DESC' },
    });
  }

  async balance(from?: string, to?: string) {
    const createdAt = dateTimeRangeWhere(from, to);
    const date = dateRangeWhere(from, to);

    const orders = await this.ordersRepository.find({
      where: createdAt ? { createdAt } : {},
    });
    const expensesList = await this.expensesRepository.find({
      where: date ? { date } : {},
    });
    const recharges = await this.fireExtinguishersRepository.find({
      where: date ? { soldAt: date } : {},
    });

    const ordersIncome = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const rechargesIncome = recharges.reduce((sum, fe) => sum + Number(fe.amount || 0), 0);
    const income = ordersIncome + rechargesIncome;
    const expensesTotal = expensesList.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      income: income.toFixed(2),
      expenses: expensesTotal.toFixed(2),
      net: (income - expensesTotal).toFixed(2),
      orderCount: orders.length,
      expenseCount: expensesList.length,
    };
  }

  async fireExtinguisherAlerts(daysAhead = 30) {
    const limit = new Date();
    limit.setDate(limit.getDate() + daysAhead);
    const limitDate = limit.toISOString().slice(0, 10);
    const now = new Date();

    // Fuente 1: matafuegos vendidos como línea de un pedido normal.
    const items = await this.orderItemsRepository.find({
      where: { expiresAt: LessThanOrEqual(limit) },
      relations: { product: true, order: { client: true } },
    });
    const fromOrders = items
      .filter((item) => item.product.type === ProductType.FIRE_EXTINGUISHER && item.expiresAt)
      .map((item) => ({
        id: `pedido-${item.id}`,
        source: 'pedido' as const,
        orderNumber: item.order.orderNumber as number | null,
        clientId: item.order.client?.id ?? null,
        clientName: item.order.client?.name ?? 'Consumidor final',
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        expiresAt: item.expiresAt as Date,
        expired: (item.expiresAt as Date) < now,
      }));

    // Fuente 2: matafuegos cargados desde el módulo específico.
    const direct = await this.fireExtinguishersRepository.find({
      where: { expiresAt: LessThanOrEqual(limitDate) },
      relations: { client: true, product: true },
    });
    const fromDirect = direct.map((fe) => ({
      id: `directo-${fe.id}`,
      source: 'directo' as const,
      orderNumber: null,
      clientId: fe.client.id,
      clientName: fe.client.name,
      productId: fe.product.id,
      productName: fe.product.name,
      quantity: 1,
      expiresAt: new Date(`${fe.expiresAt}T00:00:00`),
      expired: new Date(`${fe.expiresAt}T00:00:00`) < now,
    }));

    return [...fromOrders, ...fromDirect].sort(
      (a, b) => a.expiresAt.getTime() - b.expiresAt.getTime(),
    );
  }
}
