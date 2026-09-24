# HB Servicios

Sistema de gestión interna para una PyME de Rafaela dedicada a la distribución de gas envasado (garrafas y cilindros) y matafuegos: stock, clientes, proveedores, pedidos con remito en PDF, gastos, préstamo/canje de envases, recargas de matafuegos y reportes.

Trabajo Final Integrador de la Tecnicatura Universitaria en Programación (UTN FRRa).

## Stack

**Backend** — `backend/`
- [NestJS](https://nestjs.com/) + TypeScript
- [TypeORM](https://typeorm.io/) sobre MySQL
- Autenticación JWT (`@nestjs/jwt`, `passport-jwt`)
- Validación con `class-validator` / `class-transformer`
- [PDFKit](https://pdfkit.org/) para generar el remito de cada pedido
- Documentación de la API con Swagger

**Frontend** — `frontend/`
- React + Vite
- Tailwind CSS
- PWA (`vite-plugin-pwa`) con cola de pedidos offline usando [Dexie.js](https://dexie.org/) (IndexedDB)
- [lucide-react](https://lucide.dev/) para los íconos

## Requisitos previos

- Node.js 18 o superior
- MySQL 8 corriendo localmente (o accesible por red)

## Puesta en marcha

### 1. Base de datos

Creá la base (el nombre por defecto es `hbservicios`, configurable por variable de entorno):

```sql
CREATE DATABASE hbservicios;
```

TypeORM está configurado con `synchronize: true` en desarrollo, así que las tablas se crean/actualizan solas a partir de las entidades — no hace falta correr migraciones a mano.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # completar con tus datos de conexión
npm run start:dev
```

Queda escuchando en `http://localhost:3000`. La documentación interactiva de la API (Swagger) está en `http://localhost:3000/api`.

Variables de entorno (`backend/.env`):

| Variable | Descripción |
| --- | --- |
| `DB_HOST` | Host de MySQL |
| `DB_PORT` | Puerto de MySQL (por defecto `3306`) |
| `DB_USERNAME` | Usuario de MySQL |
| `DB_PASSWORD` | Contraseña de MySQL |
| `DB_DATABASE` | Nombre de la base de datos |
| `JWT_SECRET` | Clave para firmar los tokens JWT |
| `JWT_EXPIRES_IN` | Duración del token (por ejemplo `1d`) |

### 3. Datos iniciales

Crear el usuario administrador (necesario para poder loguearse la primera vez):

```bash
cd backend
npm run seed:admin
```

Por defecto crea `admin@hbservicios.com` / `admin123` (se puede sobreescribir con las variables `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` y `SEED_ADMIN_NAME`).

Opcionalmente, para tener datos de ejemplo realistas (productos, clientes, pedidos y gastos de varios meses) y poder ver la app funcionando con contenido:

```bash
npm run seed:demo
```

⚠️ `seed:demo` **borra y vuelve a cargar** las tablas de productos, clientes, pedidos, préstamos de envases, matafuegos, gastos y movimientos de stock — pensado solo para un entorno de desarrollo/demo, no correrlo contra datos reales.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Queda disponible en `http://localhost:5173` y apunta al backend en `http://localhost:3000`.

## Estructura del proyecto

```
HbApp/
├── backend/     API NestJS + TypeORM + MySQL
│   └── src/
│       ├── auth/               login y JWT
│       ├── users/               usuarios del sistema
│       ├── products/            productos, stock, historial de precios
│       ├── clients/              clientes y préstamo de envases
│       ├── suppliers/            proveedores
│       ├── orders/               pedidos, canje/préstamo, remito PDF
│       ├── expenses/             gastos, ingreso de stock, canje con proveedor
│       ├── fire-extinguishers/   recargas de matafuegos
│       └── reports/              ventas, balance, stock, vencimientos
└── frontend/    React + Vite + Tailwind (PWA)
    └── src/     una pantalla por módulo (Products.jsx, Orders.jsx, etc.)
```

## Módulos

- **Productos** — garrafas/cilindros (llenos y vacíos, vinculados automáticamente por nombre) y matafuegos. El stock de llenos/matafuegos solo se suma cargando un gasto de compra; el de vacíos se ajusta libremente.
- **Clientes** — ABM y préstamo de envases (cuando el cliente se lleva un envase sin dejar uno a cambio).
- **Proveedores** — ABM, para saber a quién y cuánto se le compró en cada gasto.
- **Pedidos** — venta con canje de envase, préstamo, descuento, envío, total editable y remito en PDF (descargable o compartible por WhatsApp). Soporta carga offline con sincronización automática.
- **Gastos** — gastos simples o ingreso de stock (con o sin canje de envases con el proveedor).
- **Matafuegos** — recargas sobre matafuegos ya vendidos, con alertas de vencidos/próximos a vencer.
- **Reportes** — ventas, balance de ingresos/egresos, movimientos de stock y vencimientos, con filtros de fecha rápidos.

## PWA / uso offline

La app se puede instalar desde el navegador (celular o escritorio). Con la conexión caída se pueden seguir cargando pedidos nuevos —quedan en cola local y se sincronizan solos al recuperar conexión—; el resto de las funciones necesita conexión al backend.
