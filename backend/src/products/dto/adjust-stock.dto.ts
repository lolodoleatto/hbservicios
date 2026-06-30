import { IsInt, IsNotEmpty, NotEquals } from 'class-validator';

export class AdjustStockDto {
  // Positivo = entrada de stock, negativo = salida
  @IsInt()
  @NotEquals(0)
  delta: number;

  @IsNotEmpty()
  reason: string;
}
