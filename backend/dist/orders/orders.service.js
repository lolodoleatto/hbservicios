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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("./entities/order.entity");
const order_item_entity_1 = require("./entities/order-item.entity");
const clients_service_1 = require("../clients/clients.service");
const products_service_1 = require("../products/products.service");
const product_entity_1 = require("../products/entities/product.entity");
let OrdersService = class OrdersService {
    ordersRepository;
    orderItemsRepository;
    clientsService;
    productsService;
    constructor(ordersRepository, orderItemsRepository, clientsService, productsService) {
        this.ordersRepository = ordersRepository;
        this.orderItemsRepository = orderItemsRepository;
        this.clientsService = clientsService;
        this.productsService = productsService;
    }
    async create(dto) {
        let client = null;
        if (dto.clientId) {
            client = await this.clientsService.findOne(dto.clientId);
        }
        if (dto.loans?.length && !dto.clientId) {
            throw new common_1.BadRequestException('No se puede registrar un préstamo de envase sin un cliente asociado al pedido');
        }
        const products = await Promise.all(dto.items.map((item) => this.productsService.findOne(item.productId)));
        products.forEach((product, i) => {
            if (product.stock < dto.items[i].quantity) {
                throw new common_1.BadRequestException(`Stock insuficiente para "${product.name}" (disponible: ${product.stock})`);
            }
        });
        const now = new Date();
        const orderItems = dto.items.map((item, i) => {
            const product = products[i];
            const unitPrice = product.currentPrice;
            const subtotal = (Number(unitPrice) * item.quantity).toFixed(2);
            let expiresAt = null;
            if (product.type === product_entity_1.ProductType.FIRE_EXTINGUISHER) {
                expiresAt = item.expiresAt
                    ? new Date(`${item.expiresAt}T00:00:00`)
                    : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
            }
            return this.orderItemsRepository.create({
                product: { id: product.id },
                quantity: item.quantity,
                unitPrice,
                subtotal,
                expiresAt,
            });
        });
        const discount = dto.discount ?? 0;
        const shippingCost = dto.shippingCost ?? 0;
        const computedTotal = orderItems.reduce((sum, item) => sum + Number(item.subtotal), 0) - discount + shippingCost;
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
        for (let i = 0; i < dto.items.length; i++) {
            const item = dto.items[i];
            const product = products[i];
            await this.productsService.adjustStock(item.productId, {
                delta: -item.quantity,
                reason: `Venta pedido #${orderNumber}`,
            });
            if (product.type === product_entity_1.ProductType.GAS_CYLINDER_FULL &&
                product.linkedEmptyProduct &&
                item.withExchange !== false) {
                await this.productsService.adjustStock(product.linkedEmptyProduct.id, {
                    delta: item.quantity,
                    reason: `Canje - pedido #${orderNumber}`,
                });
            }
        }
        let loans;
        if (dto.loans?.length) {
            loans = [];
            for (const loan of dto.loans) {
                loans.push(await this.clientsService.createLoan(dto.clientId, {
                    ...loan,
                    notes: loan.notes ?? `Generado desde pedido #${orderNumber}`,
                }));
            }
        }
        const created = await this.findOne(saved.id);
        return loans ? { ...created, loans } : created;
    }
    findAll() {
        return this.ordersRepository.find({
            relations: { client: true, items: { product: true } },
            order: { orderNumber: 'DESC' },
        });
    }
    async findOne(id) {
        const order = await this.ordersRepository.findOne({
            where: { id },
            relations: { client: true, items: { product: true } },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Pedido ${id} no encontrado`);
        }
        return order;
    }
    async nextOrderNumber() {
        const last = await this.ordersRepository.findOne({
            where: {},
            order: { orderNumber: 'DESC' },
        });
        return (last?.orderNumber ?? 0) + 1;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(order_item_entity_1.OrderItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        clients_service_1.ClientsService,
        products_service_1.ProductsService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map