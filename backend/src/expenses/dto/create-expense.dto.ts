import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty({ example: 'Compra de garrafas a proveedor' })
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 45000, description: 'Monto total del gasto' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'Compra de stock' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: '2026-08-19' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Si este gasto es un ingreso de stock (p.ej. compra de garrafas), el producto que ingresa.',
  })
  @IsOptional()
  @IsInt()
  productId?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Cantidad que ingresa a stock. Requerido si se manda productId.',
  })
  @ValidateIf((dto) => dto.productId !== undefined)
  @IsInt()
  @Min(1)
  quantity?: number;
}
