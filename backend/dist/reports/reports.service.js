"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("../orders/entities/order.entity");
const order_item_entity_1 = require("../orders/entities/order-item.entity");
const stock_movement_entity_1 = require("../products/entities/stock-movement.entity");
const product_entity_1 = require("../products/entities/product.entity");
const expense_entity_1 = require("../expenses/entities/expense.entity");
const fire_extinguisher_entity_1 = require("../fire-extinguishers/entities/fire-extinguisher.entity");
function dateTimeRangeWhere(from, to) {
    if (from && to) {
        return (0, typeorm_2.Between)(new Date(`${from}T00:00:00`), new Date(`${to}T23:59:59.999`));
    }
    if (from)
        return (0, typeorm_2.MoreThanOrEqual)(new Date(`${from}T00:00:00`));
    if (to)
        return (0, typeorm_2.LessThanOrEqual)(new Date(`${to}T23:59:59.999`));
    return undefined;
}
function dateRangeWhere(from, to) {
    if (from && to)
        return (0, typeorm_2.Between)(from, to);
    if (from)
        return (0, typeorm_2.MoreThanOrEqual)(from);
    if (to)
        return (0, typeorm_2.LessThanOrEqual)(to);
    return undefined;
}
let ReportsService = class ReportsService {
    ordersRepository;
    orderItemsRepository;
    stockMovementsRepository;
    expensesRepository;
    fireExtinguishersRepository;
    constructor(ordersRepository, orderItemsRepository, stockMovementsRepository, expensesRepository, fireExtinguishersRepository) {
        this.ordersRepository = ordersRepository;
        this.orderItemsRepository = orderItemsRepository;
        this.stockMovementsRepository = stockMovementsRepository;
        this.expensesRepository = expensesRepository;
        this.fireExtinguishersRepository = fireExtinguishersRepository;
    }
    async salesReport(from, to) {
        const createdAt = dateTimeRangeWhere(from, to);
        const orders = await this.ordersRepository.find({
            where: createdAt ? { createdAt } : {},
            relations: { items: { product: true } },
        });
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
        const totalDiscount = orders.reduce((sum, o) => sum + Number(o.discount), 0);
        const totalShipping = orders.reduce((sum, o) => sum + Number(o.shippingCost), 0);
        const byProduct = new Map();
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
    stockMovements(productId, from, to) {
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
    async balance(from, to) {
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
        const now = new Date();
        const items = await this.orderItemsRepository.find({
            relations: { product: true, order: { client: true } },
        });
        const fromOrders = items
            .filter((item) => item.product.type === product_entity_1.ProductType.FIRE_EXTINGUISHER && item.expiresAt)
            .map((item) => ({
            id: `pedido-${item.id}`,
            source: 'pedido',
            orderNumber: item.order.orderNumber ?? null,
            clientId: item.order.client?.id ?? null,
            clientName: item.order.client?.name ?? 'Consumidor final',
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            expiresAt: item.expiresAt,
        }));
        const direct = await this.fireExtinguishersRepository.find({
            relations: { client: true, product: true },
        });
        const fromDirect = direct.map((fe) => ({
            id: `directo-${fe.id}`,
            source: 'directo',
            orderNumber: null,
            clientId: fe.client.id,
            clientName: fe.client.name,
            productId: fe.product.id,
            productName: fe.product.name,
            quantity: 1,
            expiresAt: new Date(`${fe.expiresAt}T00:00:00`),
        }));
        const withClient = [...fromOrders, ...fromDirect].filter((e) => e.clientId !== null);
        const withoutClient = [...fromOrders, ...fromDirect].filter((e) => e.clientId === null);
        const latestByClientProduct = new Map();
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __param(2, (0, typeorm_1.InjectRepository)(stock_movement_entity_1.StockMovement)),
    __param(3, (0, typeorm_1.InjectRepository)(expense_entity_1.Expense)),
    __param(4, (0, typeorm_1.InjectRepository)(fire_extinguisher_entity_1.FireExtinguisher)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ReportsService);
//# sourceMappingURL=reports.service.js.map