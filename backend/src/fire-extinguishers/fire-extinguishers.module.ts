import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FireExtinguisher } from './entities/fire-extinguisher.entity';
import { FireExtinguisherItem } from './entities/fire-extinguisher-item.entity';
import { FireExtinguishersPdfService } from './fire-extinguishers-pdf.service';
import { FireExtinguishersService } from './fire-extinguishers.service';
import { FireExtinguishersController } from './fire-extinguishers.controller';
import { ClientsModule } from '../clients/clients.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FireExtinguisher, FireExtinguisherItem]),
    ClientsModule,
    ProductsModule,
  ],
  providers: [FireExtinguishersService, FireExtinguishersPdfService],
  controllers: [FireExtinguishersController],
  exports: [TypeOrmModule, FireExtinguishersService],
})
export class FireExtinguishersModule {}
