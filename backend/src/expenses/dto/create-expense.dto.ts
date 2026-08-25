import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateExpenseItemDto } from './create-expense-item.dto';

export class CreateExpenseDto {
  @ApiProperty({ example: 'Compra de garrafas a proveedor' })
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 200000,
    description:
      'Monto total del gasto. Si hay líneas de productos, se sugiere como la suma de sus subtotales pero se puede modificar.',
  })
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

  @ApiPropertyOptional({ example: 1, description: 'A quién se le compró (opcional)' })
  @IsOptional()
  @IsInt()
  supplierId?: number;

  @ApiPropertyOptional({
    type: [CreateExpenseItemDto],
    description:
      'Si este gasto es un ingreso de stock, los productos que ingresan (se puede cargar más de uno).',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExpenseItemDto)
  items?: CreateExpenseItemDto[];

  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Si es un canje con el proveedor (se le dan envases vacíos a cambio de las llenas de cada línea). Todos los productos de items deben ser garrafas llenas con un vacío vinculado.',
  })
  @IsOptional()
  @IsBoolean()
  isExchange?: boolean;
}
