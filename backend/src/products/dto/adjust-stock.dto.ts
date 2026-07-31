import { IsInt, IsNotEmpty, NotEquals } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({
    example: 10,
    description: 'Positivo = entrada de stock, negativo = salida',
  })
  @IsInt()
  @NotEquals(0)
  delta: number;

  @ApiProperty({ example: 'Compra a proveedor' })
  @IsNotEmpty()
  reason: string;
}
