import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType } from '../entities/product.entity';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Garrafa 10kg llena' })
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional({ example: 13500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentPrice?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    example: 2,
    description:
      'Solo para productos tipo garrafa llena: el ID del producto "vacía" correspondiente. Mandar null para desvincular.',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  linkedEmptyProductId?: number | null;
}
