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
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const expense_entity_1 = require("./entities/expense.entity");
const expense_item_entity_1 = require("./entities/expense-item.entity");
const products_service_1 = require("../products/products.service");
const product_entity_1 = require("../products/entities/product.entity");
const suppliers_service_1 = require("../suppliers/suppliers.service");
let ExpensesService = class ExpensesService {
    expensesRepository;
    expenseItemsRepository;
    productsService;
    suppliersService;
    constructor(expensesRepository, expenseItemsRepository, productsService, suppliersService) {
        this.expensesRepository = expensesRepository;
        this.expenseItemsRepository = expenseItemsRepository;
        this.productsService = productsService;
        this.suppliersService = suppliersService;
    }
    async create(dto) {
        const itemDtos = dto.items ?? [];
        const products = await Promise.all(itemDtos.map((item) => this.productsService.findOne(item.productId)));
        let supplier = null;
        if (dto.supplierId) {
            supplier = await this.suppliersService.findOne(dto.supplierId);
        }
        if (dto.isExchange) {
            if (products.length === 0) {
                throw new common_1.BadRequestException('Un canje con el proveedor necesita al menos un producto (las garrafas llenas que se reciben)');
            }
            products.forEach((product, i) => {
                if (product.type !== product_entity_1.ProductType.GAS_CYLINDER_FULL || !product.linkedEmptyProduct) {
                    throw new common_1.BadRequestException(`"${product.name}" no tiene un envase vacío vinculado, no se puede hacer el canje`);
                }
                if (product.linkedEmptyProduct.stock < itemDtos[i].quantity) {
                    throw new common_1.BadRequestException(`Stock insuficiente de "${product.linkedEmptyProduct.name}" para el canje (disponible: ${product.linkedEmptyProduct.stock})`);
                }
            });
        }
        const expense = this.expensesRepository.create({
            description: dto.description ?? null,
            amount: dto.amount.toFixed(2),
            category: dto.category,
            date: dto.date,
            supplier,
            isExchange: Boolean(dto.isExchange),
            items: itemDtos.map((item, i) => this.expenseItemsRepository.create({
                product: { id: products[i].id },
                quantity: item.quantity,
                unitPrice: item.unitPrice.toFixed(2),
                subtotal: (item.unitPrice * item.quantity).toFixed(2),
            })),
        });
        const saved = await this.expensesRepository.save(expense);
        for (let i = 0; i < itemDtos.length; i++) {
            const product = products[i];
            await this.productsService.adjustStock(product.id, {
                delta: itemDtos[i].quantity,
                reason: dto.isExchange
                    ? `Canje con proveedor - gasto #${saved.id}`
                    : `Compra - gasto #${saved.id}`,
            }, { allowPurchase: true });
            if (dto.isExchange) {
                await this.productsService.adjustStock(product.linkedEmptyProduct.id, {
                    delta: -itemDtos[i].quantity,
                    reason: `Canje con proveedor - gasto #${saved.id}`,
                });
            }
        }
        return this.findOne(saved.id);
    }
    findAll(productId) {
        return this.expensesRepository.find({
            where: productId ? { items: { product: { id: productId } } } : {},
            relations: { items: { product: true }, supplier: true },
            order: { date: 'DESC', createdAt: 'DESC' },
        });
    }
    async findOne(id) {
        const expense = await this.expensesRepository.findOne({
            where: { id },
            relations: { items: { product: true }, supplier: true },
        });
        if (!expense) {
            throw new common_1.NotFoundException(`Gasto ${id} no encontrado`);
        }
        return expense;
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(expense_entity_1.Expense)),
    __param(1, (0, typeorm_1.InjectRepository)(expense_item_entity_1.ExpenseItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        products_service_1.ProductsService,
        suppliers_service_1.SuppliersService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map