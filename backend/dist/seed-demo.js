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
const mysql = __importStar(require("mysql2/promise"));
const app_module_1 = require("./app.module");
const products_service_1 = require("./products/products.service");
const clients_service_1 = require("./clients/clients.service");
const orders_service_1 = require("./orders/orders.service");
const expenses_service_1 = require("./expenses/expenses.service");
const fire_extinguishers_service_1 = require("./fire-extinguishers/fire-extinguishers.service");
const product_entity_1 = require("./products/entities/product.entity");
function iso(date) {
    return date.toISOString().slice(0, 10);
}
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
    return arr[randInt(0, arr.length - 1)];
}
function chance(p) {
    return Math.random() < p;
}
function datesInMonth(year, month, n) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = new Set();
    while (days.size < n)
        days.add(randInt(1, daysInMonth));
    return [...days]
        .sort((a, b) => a - b)
        .map((day) => new Date(year, month - 1, day, randInt(9, 18), randInt(0, 59)));
}
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const productsService = app.get(products_service_1.ProductsService);
    const clientsService = app.get(clients_service_1.ClientsService);
    const ordersService = app.get(orders_service_1.OrdersService);
    const expensesService = app.get(expenses_service_1.ExpensesService);
    const fireExtinguishersService = app.get(fire_extinguishers_service_1.FireExtinguishersService);
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    });
    async function backdateOrder(orderId, orderNumber, date) {
        await conn.execute('UPDATE orders SET createdAt = ? WHERE id = ?', [date, orderId]);
        await conn.execute("UPDATE stock_movements SET createdAt = ? WHERE reason IN (?, ?)", [date, `Venta pedido #${orderNumber}`, `Canje - pedido #${orderNumber}`]);
    }
    async function backdateExpense(expenseId, date) {
        await conn.execute('UPDATE expenses SET createdAt = ? WHERE id = ?', [date, expenseId]);
        await conn.execute("UPDATE stock_movements SET createdAt = ? WHERE reason IN (?, ?)", [date, `Compra - gasto #${expenseId}`, `Canje con proveedor - gasto #${expenseId}`]);
    }
    async function backdateFireExtinguisher(id, date) {
        await conn.execute('UPDATE fire_extinguishers SET createdAt = ? WHERE id = ?', [date, id]);
        await conn.execute("UPDATE stock_movements SET createdAt = ? WHERE reason = ?", [
            date,
            `Venta matafuego #${id}`,
        ]);
    }
    console.log('Borrando datos de negocio existentes (productos, clientes, pedidos, gastos, matafuegos)...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of [
        'order_items',
        'orders',
        'container_loans',
        'fire_extinguishers',
        'expenses',
        'stock_movements',
        'price_history',
        'products',
        'clients',
    ]) {
        await conn.query(`TRUNCATE TABLE \`${table}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    const genesis = new Date('2026-03-01T09:00:00');
    console.log('Creando productos...');
    async function createProduct(name, type, currentPrice, stock) {
        const p = await productsService.create({ name, type, currentPrice, stock });
        await conn.execute('UPDATE price_history SET validFrom = ? WHERE productId = ?', [genesis, p.id]);
        if (stock > 0) {
            await conn.execute("UPDATE stock_movements SET createdAt = ? WHERE reason = 'Stock inicial' AND productId = ?", [genesis, p.id]);
        }
        return p;
    }
    const garrafa10Vacia = await createProduct('Garrafa 10kg vacía', product_entity_1.ProductType.GAS_CYLINDER_EMPTY, 0, 20);
    const garrafa10Llena = await createProduct('Garrafa 10kg llena', product_entity_1.ProductType.GAS_CYLINDER_FULL, 25000, 15);
    const garrafa15Vacia = await createProduct('Garrafa 15kg vacía', product_entity_1.ProductType.GAS_CYLINDER_EMPTY, 0, 10);
    const garrafa15Llena = await createProduct('Garrafa 15kg llena', product_entity_1.ProductType.GAS_CYLINDER_FULL, 30000, 8);
    const cilindro45Vacia = await createProduct('Cilindro 45kg vacío', product_entity_1.ProductType.GAS_CYLINDER_EMPTY, 0, 5);
    const cilindro45Llena = await createProduct('Cilindro 45kg lleno', product_entity_1.ProductType.GAS_CYLINDER_FULL, 75000, 4);
    const matafuego1kg = await createProduct('Matafuego ABC 1kg', product_entity_1.ProductType.FIRE_EXTINGUISHER, 9000, 10);
    const matafuego5kg = await createProduct('Matafuego ABC 5kg', product_entity_1.ProductType.FIRE_EXTINGUISHER, 18000, 8);
    const matafuego10kg = await createProduct('Matafuego ABC 10kg', product_entity_1.ProductType.FIRE_EXTINGUISHER, 32000, 5);
    const CYLINDERS = [
        { full: garrafa10Llena, empty: garrafa10Vacia, cost: 20000, restock: 10 },
        { full: garrafa15Llena, empty: garrafa15Vacia, cost: 24000, restock: 5 },
        { full: cilindro45Llena, empty: cilindro45Vacia, cost: 60000, restock: 2 },
    ];
    const MATAFUEGOS = [
        { product: matafuego1kg, cost: 7200 },
        { product: matafuego5kg, cost: 14400 },
        { product: matafuego10kg, cost: 25600 },
    ];
    console.log('Creando clientes...');
    const clientSpecs = [
        { name: 'Marcela Gómez', phone: '3492-412233', address: 'Bv. Santa Fe 1450' },
        { name: 'Roberto Sosa', phone: '3492-455678', address: 'San Martín 890' },
        { name: 'Silvia Bianchi', phone: '3492-401122', address: 'Mitre 2201' },
        { name: 'Daniel Peralta', phone: '3492-478890', address: 'Belgrano 675' },
        { name: 'Carla Fassi', phone: '3492-433221', address: 'Alberdi 340' },
        { name: 'Hugo Bergesio', phone: '3492-467744', address: 'Bv. Roca 1120' },
        { name: 'Panadería La Espiga', phone: '3492-420011', address: 'San Martín 1550' },
        { name: 'Ferretería Ruiz Hnos.', phone: '3492-445566', address: 'Moreno 780' },
        { name: 'Hotel Rafaela Plaza', phone: '3492-411999', address: 'Bv. Santa Fe 890' },
        { name: 'Restaurante El Fogón', phone: '3492-488002', address: 'Sarmiento 455' },
        { name: 'Distribuidora San Martín', phone: '3492-423344', address: 'Ruta 34 Km 92' },
        { name: 'Clínica Rafaela Salud', phone: '3492-499887', address: 'Falucho 1200' },
    ];
    const clients = [];
    for (const c of clientSpecs) {
        clients.push(await clientsService.create(c));
    }
    const months = [3, 4, 5, 6, 7];
    let expenseCounter = 0;
    for (const month of months) {
        console.log(`--- Simulando ${month}/2026 ---`);
        for (const cyl of CYLINDERS) {
            const current = await productsService.findOne(cyl.full.id);
            if (current.stock > cyl.restock)
                continue;
            const emptyCurrent = await productsService.findOne(cyl.empty.id);
            const qty = Math.min(cyl.restock, emptyCurrent.stock);
            if (qty < 1) {
                console.log(`  (sin suficientes ${cyl.empty.name} para reponer ${cyl.full.name}, se omite)`);
                continue;
            }
            const date = pick(datesInMonth(2026, month, 3));
            const expense = await expensesService.create({
                category: 'Canje con proveedor',
                description: `Recarga con proveedor - ${cyl.full.name}`,
                amount: qty * cyl.cost,
                date: iso(date),
                items: [{ productId: cyl.full.id, quantity: qty, unitPrice: cyl.cost }],
                isExchange: true,
            });
            await backdateExpense(expense.id, date);
            console.log(`  Canje proveedor: +${qty} ${cyl.full.name} (gasto #${expense.id})`);
        }
        if (chance(0.5)) {
            const m = pick(MATAFUEGOS);
            const current = await productsService.findOne(m.product.id);
            if (current.stock < 4) {
                const qty = randInt(5, 8);
                const date = pick(datesInMonth(2026, month, 3));
                const expense = await expensesService.create({
                    category: 'Compra de stock',
                    description: `Compra de ${m.product.name} a proveedor`,
                    amount: qty * m.cost,
                    date: iso(date),
                    items: [{ productId: m.product.id, quantity: qty, unitPrice: m.cost }],
                });
                await backdateExpense(expense.id, date);
                console.log(`  Compra: +${qty} ${m.product.name} (gasto #${expense.id})`);
            }
        }
        const genericExpense = pick([
            { description: 'Alquiler del depósito', category: 'Alquiler', amount: 80000 },
            { description: 'Sueldos', category: 'Sueldos', amount: 250000 },
            { description: 'Combustible camioneta reparto', category: 'Combustible', amount: 45000 },
            { description: 'Service camioneta', category: 'Mantenimiento', amount: 30000 },
        ]);
        const genericDate = pick(datesInMonth(2026, month, 5));
        const ge = await expensesService.create({
            ...genericExpense,
            date: iso(genericDate),
        });
        await backdateExpense(ge.id, genericDate);
        const orderDates = datesInMonth(2026, month, randInt(5, 7));
        for (const date of orderDates) {
            const items = [];
            const cylOptions = [];
            for (const cyl of CYLINDERS) {
                const p = await productsService.findOne(cyl.full.id);
                if (p.stock > 0)
                    cylOptions.push(cyl);
            }
            if (cylOptions.length > 0) {
                const weighted = cylOptions.flatMap((cyl) => cyl === CYLINDERS[0] ? [cyl, cyl, cyl] : [cyl]);
                const cyl = pick(weighted);
                const p = await productsService.findOne(cyl.full.id);
                const qty = Math.min(randInt(1, 3), p.stock);
                items.push({
                    productId: cyl.full.id,
                    quantity: qty,
                    withExchange: chance(0.85),
                });
            }
            if (chance(0.2)) {
                const m = pick(MATAFUEGOS);
                const p = await productsService.findOne(m.product.id);
                if (p.stock > 0) {
                    items.push({ productId: m.product.id, quantity: 1 });
                }
            }
            if (items.length === 0)
                continue;
            const useClient = chance(0.65);
            const clientId = useClient ? pick(clients).id : undefined;
            const discount = chance(0.2) ? randInt(300, 1500) : 0;
            const shippingCost = chance(0.55) ? 2000 : 0;
            try {
                const order = await ordersService.create({
                    clientId,
                    discount,
                    shippingCost,
                    items,
                });
                await backdateOrder(order.id, order.orderNumber, date);
                const matafuegoItem = order.items.find((it) => it.product.type === product_entity_1.ProductType.FIRE_EXTINGUISHER);
                if (matafuegoItem) {
                    const expires = new Date(date);
                    expires.setFullYear(expires.getFullYear() + 1);
                    await conn.execute('UPDATE order_items SET expiresAt = ? WHERE id = ?', [
                        expires,
                        matafuegoItem.id,
                    ]);
                }
            }
            catch (err) {
                console.log(`  (pedido omitido: ${err.message})`);
            }
        }
    }
    console.log('Cargando matafuegos con vencimientos cercanos a la fecha actual...');
    const today = new Date();
    const nearExpiryPlans = [
        { daysFromNow: -10, notes: 'Vencido, pendiente de recarga' },
        { daysFromNow: 5, notes: 'Inspección anual próxima' },
        { daysFromNow: 20, notes: null },
        { daysFromNow: 45, notes: 'Cliente avisado por WhatsApp' },
    ];
    for (const plan of nearExpiryPlans) {
        const m = pick(MATAFUEGOS);
        const stock = await productsService.findOne(m.product.id);
        if (stock.stock < 1)
            continue;
        const expiresAt = new Date(today);
        expiresAt.setDate(expiresAt.getDate() + plan.daysFromNow);
        const soldAt = new Date(expiresAt);
        soldAt.setFullYear(soldAt.getFullYear() - 1);
        const client = pick(clients);
        const fe = await fireExtinguishersService.create({
            clientId: client.id,
            productId: m.product.id,
            soldAt: iso(soldAt),
            expiresAt: iso(expiresAt),
            notes: plan.notes ?? undefined,
        });
        await backdateFireExtinguisher(fe.id, soldAt);
        console.log(`  ${m.product.name} para ${client.name}: vence ${iso(expiresAt)} (${plan.daysFromNow} días desde hoy)`);
    }
    await conn.end();
    await app.close();
    console.log('Listo. Datos de demo cargados.');
}
bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=seed-demo.js.map