import { NestFactory } from '@nestjs/core';
import * as mysql from 'mysql2/promise';
import { AppModule } from './app.module';
import { ProductsService } from './products/products.service';
import { ClientsService } from './clients/clients.service';
import { OrdersService } from './orders/orders.service';
import { ExpensesService } from './expenses/expenses.service';
import { FireExtinguishersService } from './fire-extinguishers/fire-extinguishers.service';
import { ProductType } from './products/entities/product.entity';
import { Client } from './clients/entities/client.entity';

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function chance(p: number): boolean {
  return Math.random() < p;
}

// Reparte n fechas dentro de un mes, con hora "de local abierto" (9 a 18hs)
function datesInMonth(year: number, month: number, n: number): Date[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = new Set<number>();
  while (days.size < n) days.add(randInt(1, daysInMonth));
  return [...days]
    .sort((a, b) => a - b)
    .map((day) => new Date(year, month - 1, day, randInt(9, 18), randInt(0, 59)));
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const productsService = app.get(ProductsService);
  const clientsService = app.get(ClientsService);
  const ordersService = app.get(OrdersService);
  const expensesService = app.get(ExpensesService);
  const fireExtinguishersService = app.get(FireExtinguishersService);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  async function backdateOrder(orderId: number, orderNumber: number, date: Date) {
    await conn.execute('UPDATE orders SET createdAt = ? WHERE id = ?', [date, orderId]);
    await conn.execute(
      "UPDATE stock_movements SET createdAt = ? WHERE reason IN (?, ?)",
      [date, `Venta pedido #${orderNumber}`, `Canje - pedido #${orderNumber}`],
    );
  }

  async function backdateExpense(expenseId: number, date: Date) {
    await conn.execute('UPDATE expenses SET createdAt = ? WHERE id = ?', [date, expenseId]);
    await conn.execute(
      "UPDATE stock_movements SET createdAt = ? WHERE reason IN (?, ?)",
      [date, `Compra - gasto #${expenseId}`, `Canje con proveedor - gasto #${expenseId}`],
    );
  }

  async function backdateFireExtinguisher(id: number, date: Date) {
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

  // ---------- Productos ----------
  console.log('Creando productos...');

  async function createProduct(
    name: string,
    type: ProductType,
    currentPrice: number,
    stock: number,
    linkedEmptyProductId?: number,
  ) {
    const p = await productsService.create({ name, type, currentPrice, stock, linkedEmptyProductId });
    await conn.execute('UPDATE price_history SET validFrom = ? WHERE productId = ?', [genesis, p.id]);
    if (stock > 0) {
      await conn.execute(
        "UPDATE stock_movements SET createdAt = ? WHERE reason = 'Stock inicial' AND productId = ?",
        [genesis, p.id],
      );
    }
    return p;
  }

  const garrafa10Vacia = await createProduct('Garrafa 10kg vacía', ProductType.GAS_CYLINDER_EMPTY, 0, 20);
  const garrafa10Llena = await createProduct(
    'Garrafa 10kg llena',
    ProductType.GAS_CYLINDER_FULL,
    25000,
    15,
    garrafa10Vacia.id,
  );

  const garrafa15Vacia = await createProduct('Garrafa 15kg vacía', ProductType.GAS_CYLINDER_EMPTY, 0, 10);
  const garrafa15Llena = await createProduct(
    'Garrafa 15kg llena',
    ProductType.GAS_CYLINDER_FULL,
    30000,
    8,
    garrafa15Vacia.id,
  );

  const cilindro45Vacia = await createProduct('Cilindro 45kg vacío', ProductType.GAS_CYLINDER_EMPTY, 0, 5);
  const cilindro45Llena = await createProduct(
    'Cilindro 45kg lleno',
    ProductType.GAS_CYLINDER_FULL,
    75000,
    4,
    cilindro45Vacia.id,
  );

  const matafuego1kg = await createProduct('Matafuego ABC 1kg', ProductType.FIRE_EXTINGUISHER, 9000, 10);
  const matafuego5kg = await createProduct('Matafuego ABC 5kg', ProductType.FIRE_EXTINGUISHER, 18000, 8);
  const matafuego10kg = await createProduct('Matafuego ABC 10kg', ProductType.FIRE_EXTINGUISHER, 32000, 5);

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

  // ---------- Clientes ----------
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
  const clients: Client[] = [];
  for (const c of clientSpecs) {
    clients.push(await clientsService.create(c));
  }

  // ---------- Simulación mes a mes: marzo a julio 2026 ----------
  const months = [3, 4, 5, 6, 7];
  let expenseCounter = 0;

  for (const month of months) {
    console.log(`--- Simulando ${month}/2026 ---`);

    // Reposición con el proveedor (canje) para cada cilindro, si hace falta
    for (const cyl of CYLINDERS) {
      const current = await productsService.findOne(cyl.full.id);
      if (current.stock > cyl.restock) continue; // todavía hay stock de sobra

      const emptyCurrent = await productsService.findOne(cyl.empty.id);
      const qty = Math.min(cyl.restock, emptyCurrent.stock);
      if (qty < 1) {
        console.log(`  (sin suficientes ${cyl.empty.name} para reponer ${cyl.full.name}, se omite)`);
        continue;
      }
      const date = pick(datesInMonth(2026, month, 3));
      const expense = await expensesService.create({
        description: `Recarga con proveedor - ${cyl.full.name}`,
        amount: qty * cyl.cost,
        date: iso(date),
        items: [{ productId: cyl.full.id, quantity: qty, unitPrice: cyl.cost }],
        isExchange: true,
      });
      await backdateExpense(expense.id, date);
      console.log(`  Canje proveedor: +${qty} ${cyl.full.name} (gasto #${expense.id})`);
    }

    // Reposición de matafuegos (compra simple, sin canje) si hace falta
    if (chance(0.5)) {
      const m = pick(MATAFUEGOS);
      const current = await productsService.findOne(m.product.id);
      if (current.stock < 4) {
        const qty = randInt(5, 8);
        const date = pick(datesInMonth(2026, month, 3));
        const expense = await expensesService.create({
          description: `Compra de ${m.product.name} a proveedor`,
          amount: qty * m.cost,
          date: iso(date),
          items: [{ productId: m.product.id, quantity: qty, unitPrice: m.cost }],
        });
        await backdateExpense(expense.id, date);
        console.log(`  Compra: +${qty} ${m.product.name} (gasto #${expense.id})`);
      }
    }

    // Gasto genérico del mes (alquiler, sueldos, combustible)
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

    // Pedidos del mes
    const orderDates = datesInMonth(2026, month, randInt(5, 7));
    for (const date of orderDates) {
      const items: { productId: number; quantity: number; withExchange?: boolean }[] = [];

      // Línea principal: garrafa/cilindro, según stock disponible
      // (la garrafa de 10kg pesa más porque es la más vendida en la realidad)
      const cylOptions: typeof CYLINDERS = [];
      for (const cyl of CYLINDERS) {
        const p = await productsService.findOne(cyl.full.id);
        if (p.stock > 0) cylOptions.push(cyl);
      }
      if (cylOptions.length > 0) {
        const weighted = cylOptions.flatMap((cyl) =>
          cyl === CYLINDERS[0] ? [cyl, cyl, cyl] : [cyl],
        );
        const cyl = pick(weighted);
        const p = await productsService.findOne(cyl.full.id);
        const qty = Math.min(randInt(1, 3), p.stock);
        items.push({
          productId: cyl.full.id,
          quantity: qty,
          withExchange: chance(0.85),
        });
      }

      // A veces se agrega un matafuego a la compra
      if (chance(0.2)) {
        const m = pick(MATAFUEGOS);
        const p = await productsService.findOne(m.product.id);
        if (p.stock > 0) {
          items.push({ productId: m.product.id, quantity: 1 });
        }
      }

      if (items.length === 0) continue;

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

        // Si hubo matafuego en el pedido, recalcular su vencimiento en base
        // a la fecha real del pedido (no a la fecha en que corrió el script).
        const matafuegoItem = order.items.find(
          (it) => it.product.type === ProductType.FIRE_EXTINGUISHER,
        );
        if (matafuegoItem) {
          const expires = new Date(date);
          expires.setFullYear(expires.getFullYear() + 1);
          await conn.execute('UPDATE order_items SET expiresAt = ? WHERE id = ?', [
            expires,
            matafuegoItem.id,
          ]);
        }
      } catch (err) {
        console.log(`  (pedido omitido: ${(err as Error).message})`);
      }
    }
  }

  // ---------- Matafuegos próximos a vencer / vencidos (módulo dedicado) ----------
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
    if (stock.stock < 1) continue;

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
    console.log(
      `  ${m.product.name} para ${client.name}: vence ${iso(expiresAt)} (${plan.daysFromNow} días desde hoy)`,
    );
  }

  await conn.end();
  await app.close();
  console.log('Listo. Datos de demo cargados.');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
