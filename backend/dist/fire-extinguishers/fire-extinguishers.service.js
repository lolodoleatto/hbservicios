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
exports.FireExtinguishersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fire_extinguisher_entity_1 = require("./entities/fire-extinguisher.entity");
const clients_service_1 = require("../clients/clients.service");
const products_service_1 = require("../products/products.service");
const product_entity_1 = require("../products/entities/product.entity");
function toIsoDate(date) {
    return date.toISOString().slice(0, 10);
}
function plusOneYear(isoDate) {
    const date = new Date(`${isoDate}T00:00:00`);
    date.setFullYear(date.getFullYear() + 1);
    return toIsoDate(date);
}
let FireExtinguishersService = class FireExtinguishersService {
    fireExtinguishersRepository;
    clientsService;
    productsService;
    constructor(fireExtinguishersRepository, clientsService, productsService) {
        this.fireExtinguishersRepository = fireExtinguishersRepository;
        this.clientsService = clientsService;
        this.productsService = productsService;
    }
    async create(dto) {
        const client = await this.clientsService.findOne(dto.clientId);
        const product = await this.productsService.findOne(dto.productId);
        if (product.type !== product_entity_1.ProductType.FIRE_EXTINGUISHER) {
            throw new common_1.BadRequestException(`"${product.name}" no es un producto de tipo matafuego`);
        }
        const soldAt = dto.soldAt ?? toIsoDate(new Date());
        const expiresAt = dto.expiresAt ?? plusOneYear(soldAt);
        const fireExtinguisher = this.fireExtinguishersRepository.create({
            client,
            product,
            soldAt,
            expiresAt,
            amount: dto.amount !== undefined ? dto.amount.toFixed(2) : null,
            notes: dto.notes,
        });
        const saved = await this.fireExtinguishersRepository.save(fireExtinguisher);
        return this.findOne(saved.id);
    }
    findAll() {
        return this.fireExtinguishersRepository.find({
            relations: { client: true, product: true },
            order: { expiresAt: 'ASC' },
        });
    }
    async findOne(id) {
        const fireExtinguisher = await this.fireExtinguishersRepository.findOne({
            where: { id },
            relations: { client: true, product: true },
        });
        if (!fireExtinguisher) {
            throw new common_1.NotFoundException(`Matafuego ${id} no encontrado`);
        }
        return fireExtinguisher;
    }
};
exports.FireExtinguishersService = FireExtinguishersService;
exports.FireExtinguishersService = FireExtinguishersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(fire_extinguisher_entity_1.FireExtinguisher)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        clients_service_1.ClientsService,
        products_service_1.ProductsService])
], FireExtinguishersService);
//# sourceMappingURL=fire-extinguishers.service.js.map