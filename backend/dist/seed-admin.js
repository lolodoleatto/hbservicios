"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const bcrypt = __importStar(require("bcrypt"));
const app_module_1 = require("./app.module");
const users_service_1 = require("./users/users.service");
const user_entity_1 = require("./users/entities/user.entity");
async function bootstrap() {
    const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@hbservicios.com';
    const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';
    const name = process.env.SEED_ADMIN_NAME ?? 'Administrador';
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const usersService = app.get(users_service_1.UsersService);
    const existing = await usersService.findByEmail(email);
    if (existing) {
        console.log(`El usuario admin "${email}" ya existe, no se creó ninguno nuevo.`);
        await app.close();
        return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await usersService.create({
        email,
        password: hashedPassword,
        name,
        role: user_entity_1.UserRole.ADMIN,
        active: true,
    });
    console.log(`Usuario admin creado: ${email} / ${password}`);
    await app.close();
}
bootstrap();
//# sourceMappingURL=seed-admin.js.map