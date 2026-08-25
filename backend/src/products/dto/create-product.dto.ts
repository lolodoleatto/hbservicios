import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType } from '../entities/product.entity';

export class CreateProductDto {
  @ApiProperty({ example: 'Garrafa 10kg llena' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ProductType, example: ProductType.GAS_CYLINDER_FULL })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiProperty({ example: 12500 })
  @IsNumber()
  @Min(0)
  currentPrice: number;

  @ApiPropertyOptional({ example: 20, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({
    example: 2,
    description:
      'Solo para productos tipo garrafa llena: el ID del producto "vacía" correspondiente, para poder hacer canje en ventas y reposición.',
  })
  @IsOptional()
  @IsInt()
  linkedEmptyProductId?: number;
}
