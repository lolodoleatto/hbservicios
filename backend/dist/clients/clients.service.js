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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const client_entity_1 = require("./entities/client.entity");
const container_loan_entity_1 = require("./entities/container-loan.entity");
const products_service_1 = require("../products/products.service");
let ClientsService = class ClientsService {
    clientsRepository;
    containerLoansRepository;
    productsService;
    constructor(clientsRepository, containerLoansRepository, productsService) {
        this.clientsRepository = clientsRepository;
        this.containerLoansRepository = containerLoansRepository;
        this.productsService = productsService;
    }
    create(dto) {
        const client = this.clientsRepository.create(dto);
        return this.clientsRepository.save(client);
    }
    findAll(includeInactive = false) {
        return this.clientsRepository.find({
            where: includeInactive ? {} : { active: true },
            order: { name: 'ASC' },
        });
    }
    async findOne(id) {
        const client = await this.clientsRepository.findOne({ where: { id } });
        if (!client) {
            throw new common_1.NotFoundException(`Cliente ${id} no encontrado`);
        }
        return client;
    }
    async update(id, dto) {
        const client = await this.findOne(id);
        Object.assign(client, dto);
        return this.clientsRepository.save(client);
    }
    async deactivate(id) {
        const client = await this.findOne(id);
        client.active = false;
        return this.clientsRepository.save(client);
    }
    async createLoan(clientId, dto) {
        const client = await this.findOne(clientId);
        const product = await this.productsService.findOne(dto.productId);
        const loan = this.containerLoansRepository.create({
            client,
            product,
            quantity: dto.quantity,
            notes: dto.notes,
        });
        return this.containerLoansRepository.save(loan);
    }
    async findLoans(clientId, includeReturned = false) {
        await this.findOne(clientId);
        return this.containerLoansRepository.find({
            where: includeReturned
                ? { client: { id: clientId } }
                : { client: { id: clientId }, returnedAt: (0, typeorm_2.IsNull)() },
            relations: { product: true },
            order: { loanedAt: 'DESC' },
        });
    }
    async returnLoan(clientId, loanId) {
        const loan = await this.containerLoansRepository.findOne({
            where: { id: loanId, client: { id: clientId } },
            relations: { product: true },
        });
        if (!loan) {
            throw new common_1.NotFoundException(`Préstamo ${loanId} no encontrado para el cliente ${clientId}`);
        }
        if (loan.returnedAt) {
            throw new common_1.BadRequestException('Este préstamo ya fue devuelto');
        }
        loan.returnedAt = new Date();
        return this.containerLoansRepository.save(loan);
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __param(1, (0, typeorm_1.InjectRepository)(container_loan_entity_1.ContainerLoan)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        products_service_1.ProductsService])
], ClientsService);
//# sourceMappingURL=clients.service.js.map