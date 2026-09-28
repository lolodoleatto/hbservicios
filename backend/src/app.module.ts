import { existsSync } from 'fs';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReportsModule } from './reports/reports.module';
import { FireExtinguishersModule } from './fire-extinguishers/fire-extinguishers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

// En producción, un único proceso Node sirve tanto la API (bajo /api, ver
// main.ts) como el build de React — así el deploy en Hostinger es un solo
// sitio, un solo repo. Este archivo compilado puede terminar corriendo desde
// dos ubicaciones distintas según el entorno:
//   - backend/dist/app.module.js (build normal, local)
//   - dist/app.module.js (paquete consolidado en la raíz que arma
//     "npm run build" para Hostinger, con el frontend copiado a dist/public
//     al lado — ver el script "build" del package.json de la raíz)
// Primero se busca "public" al lado del propio archivo; si no está (caso
// local, donde no se arma ese paquete consolidado), cae al layout viejo. En
// desarrollo el frontend corre aparte con Vite (npm run dev) y ninguna de
// las dos rutas existe todavía, así que esto se salta solo para no romper
// `npm run start:dev` del backend.
const frontendDistNearby = join(__dirname, 'public');
const frontendDistPath = existsSync(frontendDistNearby)
  ? frontendDistNearby
  : join(__dirname, '..', '..', 'frontend', 'dist');
const shouldServeFrontend = existsSync(join(frontendDistPath, 'index.html'));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Ruta explícita en vez de relativa al cwd: así "npm start" encuentra
      // backend/.env sin importar desde qué carpeta se lance el proceso. En
      // producción (Hostinger) este archivo no existe -ni debe subirse al
      // repo- y las variables las inyecta la plataforma directamente como
      // variables de entorno reales, que @nestjs/config también respeta.
      envFilePath: join(__dirname, '..', '.env'),
    }),
    ...(shouldServeFrontend
      ? [
          ServeStaticModule.forRoot({
            rootPath: frontendDistPath,
            exclude: ['/api/{*path}'],
          }),
        ]
      : []),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        charset: 'utf8mb4',
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    UsersModule,
    ClientsModule,
    ProductsModule,
    OrdersModule,
    ExpensesModule,
    ReportsModule,
    FireExtinguishersModule,
    SuppliersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
