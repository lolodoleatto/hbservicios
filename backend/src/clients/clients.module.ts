import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { ContainerLoan } from './entities/container-loan.entity';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, ContainerLoan]),
    ProductsModule,
  ],
  providers: [ClientsService],
  controllers: [ClientsController],
  exports: [TypeOrmModule, ClientsService],
})
export class ClientsModule {}
