import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContainerLoanDto {
  @ApiProperty({ example: 1, description: 'ID del producto (envase) prestado' })
  @IsInt()
  productId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Envase de 10kg, entregado el 30/07' })
  @IsOptional()
  @IsString()
  notes?: string;
}
