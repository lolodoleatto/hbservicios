import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFireExtinguisherDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  clientId?: number;

  @ApiPropertyOptional({ example: 4, description: 'Debe ser un producto de tipo matafuego' })
  @IsOptional()
  @IsInt()
  productId?: number;

  @ApiPropertyOptional({ example: 8000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ example: '2026-08-19', description: 'Fecha de recarga' })
  @IsOptional()
  @IsDateString()
  soldAt?: string;

  @ApiPropertyOptional({ example: '2027-08-19' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'Recarga anual' })
  @IsOptional()
  @IsString()
  notes?: string;
}
