import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { ProductType } from '../entities/product.entity';

export class CreateProductDto {
  @IsNotEmpty()
  name: string;

  @IsEnum(ProductType)
  type: ProductType;

  @IsNumber()
  @Min(0)
  currentPrice: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}
