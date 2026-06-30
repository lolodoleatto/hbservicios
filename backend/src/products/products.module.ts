import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { PriceHistory } from './entities/price-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, PriceHistory])],
  exports: [TypeOrmModule],
})
export class ProductsModule {}
