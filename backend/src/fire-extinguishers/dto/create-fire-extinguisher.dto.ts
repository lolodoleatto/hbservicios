import {
  ArrayMinSize,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFireExtinguisherItemDto {
  @ApiProperty({ example: 4, description: 'Debe ser un producto de tipo matafuego' })
  @IsInt()
  productId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 8000, description: 'Precio de recarga por unidad' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreateFireExtinguisherDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  clientId: number;

  @ApiProperty({ type: [CreateFireExtinguisherItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateFireExtinguisherItemDto)
  @ArrayMinSize(1)
  items: CreateFireExtinguisherItemDto[];

  @ApiPropertyOptional({
    example: 16000,
    description: 'Total cobrado. Vacío = suma de las líneas con precio',
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
