import { IsInt, IsNotEmpty, NotEquals } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({
    example: -1,
    description:
      'Positivo = entrada, negativo = salida. Solo se puede sumar stock acá para productos tipo garrafa/cilindro vacío — para el resto, sumar stock requiere cargar un gasto vinculado (POST /expenses), así queda el costo registrado.',
  })
  @IsInt()
  @NotEquals(0)
  delta: number;

  @ApiProperty({ example: 'Rotura en depósito' })
  @IsNotEmpty()
  reason: string;
}
