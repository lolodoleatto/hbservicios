import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFireExtinguisherDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  clientId: number;

  @ApiProperty({ example: 4, description: 'Debe ser un producto de tipo matafuego' })
  @IsInt()
  productId: number;

  @ApiPropertyOptional({
    example: '2026-08-19',
    description: 'Vacío = hoy',
  })
  @IsOptional()
  @IsDateString()
  soldAt?: string;

  @ApiPropertyOptional({
    example: '2027-08-19',
    description: 'Vacío = fecha de venta + 1 año',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'Recarga anual' })
  @IsOptional()
  @IsString()
  notes?: string;
}
