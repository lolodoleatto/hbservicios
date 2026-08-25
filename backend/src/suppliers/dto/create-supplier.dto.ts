import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Distribuidora de Gas del Litoral' })
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '3492123456' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Ruta 34 Km 100, Rafaela' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'ventas@proveedor.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
