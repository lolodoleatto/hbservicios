import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Todos los endpoints de la API quedan bajo /api — así, cuando este mismo
  // proceso también sirve el build de React (ver ServeStaticModule en
  // app.module.ts), el frontend puede vivir en "/" sin pisarse con la API.
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('HB Servicios API')
    .setDescription(
      'API del sistema de gestión interna de HB Servicios (stock, clientes, pedidos, gastos).',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 0.0.0.0 explícito: en hosting el proxy no siempre llega por localhost.
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
