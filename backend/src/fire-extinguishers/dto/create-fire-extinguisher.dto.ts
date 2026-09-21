import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFireExtinguisherDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  clientId: number;

  @ApiProperty({ example: 4, description: 'Debe ser un producto de tipo matafuego' })
  @IsInt()
  productId: number;

  @ApiPropertyOptional({
    example: 8000,
    description: 'Monto cobrado por la recarga (opcional)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({
    example: '2026-08-19',
    description: 'Vacío = hoy',
  })
  @IsOptional()
  @IsDateString()
  soldAt?: string;

  @ApiPropertyOptional({
    example: '2027-08-19',
    description: 'Vacío = fecha de recarga + 1 año',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'Recarga anual' })
  @IsOptional()
  @IsString()
  notes?: string;
}
