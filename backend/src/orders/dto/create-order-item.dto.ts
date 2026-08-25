import { IsBoolean, IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  productId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description:
      'Solo aplica si el producto es una garrafa llena con un vacío vinculado: si es true (default), el vacío que el cliente entrega a cambio se suma solo al stock de vacías.',
  })
  @IsOptional()
  @IsBoolean()
  withExchange?: boolean;

  @ApiPropertyOptional({
    example: '2027-08-20',
    description:
      'Solo para matafuegos: fecha de vencimiento. Vacío = venta + 1 año (default).',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
