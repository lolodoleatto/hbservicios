import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  dateRangeWhere,
  dateTimeRangeWhere,
  ListQuery,
  pageOptions,
} from '../common/list-query';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { StockMovement } from '../products/entities/stock-movement.entity';
import { ProductType } from '../products/entities/product.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { FireExtinguisher } from '../fire-extinguishers/entities/fire-extinguisher.entity';

interface SupplierPurchaseEntry {
  supplierId: number;
  supplierName: string;
  totalAmount: number;
  purchaseCount: number;
  purchases: { id: number; date: string; amount: string; description: string | null }[];
}

interface FireExtinguisherAlertEntry {
  id: string;
  source: 'pedido' | 'directo';
  orderNumber: number | null;
  clientId: number | null;
  clientName: string;
  productId: number;
  productName: string;
  quantity: number;
  expiresAt: Date;
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
    const date = dateRangeWhere(from, to);
    const orders = await this.ordersRepository.find({
      where: date ? { date } : {},
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

  async stockMovements(productId: number | undefined, query: ListQuery) {
    const createdAt = dateTimeRangeWhere(query.from, query.to);
    const options = {
      where: {
        ...(createdAt ? { createdAt } : {}),
        ...(productId ? { product: { id: productId } } : {}),
      },
      relations: { product: true },
      order: { createdAt: 'DESC' as const, id: 'DESC' as const },
    };
    const paging = pageOptions(query);
    if (!paging) return this.stockMovementsRepository.find(options);

    const [data, total] = await this.stockMovementsRepository.findAndCount({
      ...options,
      skip: paging.skip,
      take: paging.take,
    });
    return { data, total, page: paging.page, pageSize: paging.pageSize };
  }

  async balance(from?: string, to?: string) {
    const date = dateRangeWhere(from, to);

    const orders = await this.ordersRepository.find({
      where: date ? { date } : {},
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
    const now = new Date();

    // Fuente 1: matafuegos vendidos como línea de un pedido normal.
    const items = await this.orderItemsRepository.find({
      relations: { product: true, order: { client: true } },
    });
    const fromOrders: FireExtinguisherAlertEntry[] = items
      .filter((item) => item.product.type === ProductType.FIRE_EXTINGUISHER && item.expiresAt)
      .map((item) => ({
        id: `pedido-${item.id}`,
        source: 'pedido',
        orderNumber: item.order.orderNumber ?? null,
        clientId: item.order.client?.id ?? null,
        clientName: item.order.client?.name ?? 'Consumidor final',
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        expiresAt: item.expiresAt as Date,
      }));

    // Fuente 2: recargas cargadas desde el módulo específico — una entrada
    // por cada línea (tipo de matafuego) de la recarga.
    const direct = await this.fireExtinguishersRepository.find({
      relations: { client: true, items: { product: true } },
    });
    const fromDirect: FireExtinguisherAlertEntry[] = direct.flatMap((fe) =>
      fe.items.map((item) => ({
        id: `directo-${item.id}`,
        source: 'directo' as const,
        orderNumber: null,
        clientId: fe.client.id,
        clientName: fe.client.name,
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        expiresAt: new Date(`${fe.expiresAt}T00:00:00`),
      })),
    );

    // Un mismo cliente puede tener varias entradas para el mismo matafuego
    // (la venta original + recargas posteriores): nos interesa solo la más
    // reciente, que es el vencimiento vigente — así, al recargar, la alerta
    // vieja desaparece en vez de quedar duplicada con la nueva. Las ventas a
    // consumidor final (sin cliente) no se pueden recargar desde acá, así
    // que esas quedan cada una por separado.
    const withClient = [...fromOrders, ...fromDirect].filter((e) => e.clientId !== null);
    const withoutClient = [...fromOrders, ...fromDirect].filter((e) => e.clientId === null);

    const latestByClientProduct = new Map<string, FireExtinguisherAlertEntry>();
    for (const entry of withClient) {
      const key = `${entry.clientId}-${entry.productId}`;
      const current = latestByClientProduct.get(key);
      if (!current || entry.expiresAt > current.expiresAt) {
        latestByClientProduct.set(key, entry);
      }
    }

    return [...latestByClientProduct.values(), ...withoutClient]
      .filter((entry) => entry.expiresAt <= limit)
      .map((entry) => ({ ...entry, expired: entry.expiresAt < now }))
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  }

  async purchasesBySupplier(from?: string, to?: string) {
    const date = dateRangeWhere(from, to);
    const expensesList = await this.expensesRepository.find({
      where: date ? { date } : {},
      relations: { supplier: true },
      order: { date: 'DESC' },
    });

    const bySupplier = new Map<number, SupplierPurchaseEntry>();
    for (const expense of expensesList) {
      if (!expense.supplier) continue;
      const entry = bySupplier.get(expense.supplier.id) ?? {
        supplierId: expense.supplier.id,
        supplierName: expense.supplier.name,
        totalAmount: 0,
        purchaseCount: 0,
        purchases: [],
      };
      entry.totalAmount += Number(expense.amount);
      entry.purchaseCount += 1;
      entry.purchases.push({
        id: expense.id,
        date: expense.date,
        amount: expense.amount,
        description: expense.description,
      });
      bySupplier.set(expense.supplier.id, entry);
    }

    return [...bySupplier.values()]
      .sort((a, b) => a.supplierName.localeCompare(b.supplierName))
      .map((s) => ({ ...s, totalAmount: s.totalAmount.toFixed(2) }));
  }
}
