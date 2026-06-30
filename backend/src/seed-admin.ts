import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { UserRole } from './users/entities/user.entity';

async function bootstrap() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@hbservicios.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';
  const name = process.env.SEED_ADMIN_NAME ?? 'Administrador';

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

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
    role: UserRole.ADMIN,
    active: true,
  });

  console.log(`Usuario admin creado: ${email} / ${password}`);
  await app.close();
}

bootstrap();
