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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reports_service_1 = require("./reports.service");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/entities/user.entity");
let ReportsController = class ReportsController {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    sales(from, to) {
        return this.reportsService.salesReport(from, to);
    }
    stockMovements(productId, from, to) {
        return this.reportsService.stockMovements(productId ? Number(productId) : undefined, from, to);
    }
    balance(from, to) {
        return this.reportsService.balance(from, to);
    }
    fireExtinguisherAlerts(daysAhead) {
        return this.reportsService.fireExtinguisherAlerts(daysAhead ? Number(daysAhead) : undefined);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, swagger_1.ApiQuery)({ name: 'from', required: false, description: 'YYYY-MM-DD' }),
    (0, swagger_1.ApiQuery)({ name: 'to', required: false, description: 'YYYY-MM-DD' }),
    (0, common_1.Get)('sales'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "sales", null);
__decorate([
    (0, swagger_1.ApiQuery)({ name: 'productId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'from', required: false, description: 'YYYY-MM-DD' }),
    (0, swagger_1.ApiQuery)({ name: 'to', required: false, description: 'YYYY-MM-DD' }),
    (0, common_1.Get)('stock-movements'),
    __param(0, (0, common_1.Query)('productId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "stockMovements", null);
__decorate([
    (0, swagger_1.ApiQuery)({ name: 'from', required: false, description: 'YYYY-MM-DD' }),
    (0, swagger_1.ApiQuery)({ name: 'to', required: false, description: 'YYYY-MM-DD' }),
    (0, common_1.Get)('balance'),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "balance", null);
__decorate([
    (0, swagger_1.ApiQuery)({
        name: 'daysAhead',
        required: false,
        description: 'Default 30. Incluye también los ya vencidos.',
    }),
    (0, common_1.Get)('fire-extinguisher-alerts'),
    __param(0, (0, common_1.Query)('daysAhead')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "fireExtinguisherAlerts", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('reports'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map