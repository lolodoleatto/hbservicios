"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FireExtinguishersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const fire_extinguisher_entity_1 = require("./entities/fire-extinguisher.entity");
const fire_extinguishers_service_1 = require("./fire-extinguishers.service");
const fire_extinguishers_controller_1 = require("./fire-extinguishers.controller");
const clients_module_1 = require("../clients/clients.module");
const products_module_1 = require("../products/products.module");
let FireExtinguishersModule = class FireExtinguishersModule {
};
exports.FireExtinguishersModule = FireExtinguishersModule;
exports.FireExtinguishersModule = FireExtinguishersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([fire_extinguisher_entity_1.FireExtinguisher]),
            clients_module_1.ClientsModule,
            products_module_1.ProductsModule,
        ],
        providers: [fire_extinguishers_service_1.FireExtinguishersService],
        controllers: [fire_extinguishers_controller_1.FireExtinguishersController],
        exports: [typeorm_1.TypeOrmModule, fire_extinguishers_service_1.FireExtinguishersService],
    })
], FireExtinguishersModule);
//# sourceMappingURL=fire-extinguishers.module.js.map