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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_entity_1 = require("./entities/product.entity");
const price_history_entity_1 = require("./entities/price-history.entity");
const stock_movement_entity_1 = require("./entities/stock-movement.entity");
function normalizeForLinkMatch(name) {
    return name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\b(llenas?|llenos?|vacias?|vacios?)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
let ProductsService = class ProductsService {
    productsRepository;
    priceHistoryRepository;
    stockMovementsRepository;
    constructor(productsRepository, priceHistoryRepository, stockMovementsRepository) {
        this.productsRepository = productsRepository;
        this.priceHistoryRepository = priceHistoryRepository;
        this.stockMovementsRepository = stockMovementsRepository;
    }
    async inferLinkedEmptyProduct(fullName) {
        const target = normalizeForLinkMatch(fullName);
        if (!target)
            return null;
        const emptyProducts = await this.productsRepository.find({
            where: { type: product_entity_1.ProductType.GAS_CYLINDER_EMPTY },
        });
        const matches = emptyProducts.filter((p) => normalizeForLinkMatch(p.name) === target);
        return matches.length === 1 ? matches[0] : null;
    }
    async create(dto) {
        const linkedEmptyProduct = dto.type === product_entity_1.ProductType.GAS_CYLINDER_FULL
            ? await this.inferLinkedEmptyProduct(dto.name)
            : null;
        const product = this.productsRepository.create({
            name: dto.name,
            type: dto.type,
            currentPrice: dto.currentPrice.toFixed(2),
            stock: dto.stock ?? 0,
            linkedEmptyProduct,
        });
        const saved = await this.productsRepository.save(product);
        const productRef = { id: saved.id };
        await this.priceHistoryRepository.save(this.priceHistoryRepository.create({
            product: productRef,
            price: saved.currentPrice,
        }));
        if (saved.stock > 0) {
            await this.stockMovementsRepository.save(this.stockMovementsRepository.create({
                product: productRef,
                delta: saved.stock,
                reason: 'Stock inicial',
            }));
        }
        return this.findOne(saved.id);
    }
    findAll(includeInactive = false) {
        return this.productsRepository.find({
            where: includeInactive ? {} : { active: true },
            relations: { linkedEmptyProduct: true },
            order: { name: 'ASC' },
        });
    }
    async findOne(id) {
        const product = await this.productsRepository.findOne({
            where: { id },
            relations: { priceHistory: true, linkedEmptyProduct: true },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Producto ${id} no encontrado`);
        }
        product.priceHistory?.sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());
        return product;
    }
    async update(id, dto) {
        const product = await this.findOne(id);
        const priceChanged = dto.currentPrice !== undefined &&
            dto.currentPrice.toFixed(2) !== product.currentPrice;
        const resultingType = dto.type ?? product.type;
        const resultingName = dto.name ?? product.name;
        const linkedEmptyProduct = resultingType === product_entity_1.ProductType.GAS_CYLINDER_FULL
            ? await this.inferLinkedEmptyProduct(resultingName)
            : null;
        if (dto.name !== undefined)
            product.name = dto.name;
        if (dto.type !== undefined)
            product.type = dto.type;
        if (dto.active !== undefined)
            product.active = dto.active;
        if (priceChanged)
            product.currentPrice = dto.currentPrice.toFixed(2);
        product.linkedEmptyProduct = linkedEmptyProduct;
        const updated = await this.productsRepository.save(product);
        if (priceChanged) {
            await this.priceHistoryRepository.save(this.priceHistoryRepository.create({
                product: { id: updated.id },
                price: updated.currentPrice,
            }));
        }
        return this.findOne(id);
    }
    async adjustStock(id, dto, options = {}) {
        const product = await this.findOne(id);
        if (dto.delta > 0 &&
            product.type !== product_entity_1.ProductType.GAS_CYLINDER_EMPTY &&
            !options.allowPurchase) {
            throw new common_1.BadRequestException(`Para sumar stock de "${product.name}" hay que cargar un gasto vinculado (así queda el costo registrado). Los envases vacíos sí se pueden ajustar libremente acá.`);
        }
        const newStock = product.stock + dto.delta;
        if (newStock < 0) {
            throw new common_1.BadRequestException('Stock insuficiente para esta salida');
        }
        product.stock = newStock;
        const updated = await this.productsRepository.save(product);
        await this.stockMovementsRepository.save(this.stockMovementsRepository.create({
            product: { id: updated.id },
            delta: dto.delta,
            reason: dto.reason,
        }));
        return this.findOne(id);
    }
    async deactivate(id) {
        const product = await this.findOne(id);
        product.active = false;
        return this.productsRepository.save(product);
    }
    async remove(id) {
        const product = await this.findOne(id);
        try {
            await this.productsRepository.delete(id);
        }
        catch (err) {
            const code = err?.code;
            const errno = err?.errno;
            if (code === 'ER_ROW_IS_REFERENCED_2' || errno === 1451) {
                throw new common_1.BadRequestException(`No se puede eliminar "${product.name}" definitivamente porque tiene historial (ventas, préstamos de envase o matafuegos vendidos). Dalo de baja en cambio.`);
            }
            throw err;
        }
        return { deleted: true };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(price_history_entity_1.PriceHistory)),
    __param(2, (0, typeorm_1.InjectRepository)(stock_movement_entity_1.StockMovement)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ProductsService);
//# sourceMappingURL=products.service.js.map