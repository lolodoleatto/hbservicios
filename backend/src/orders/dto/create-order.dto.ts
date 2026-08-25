import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateOrderItemDto } from './create-order-item.dto';
import { CreateContainerLoanDto } from '../../clients/dto/create-container-loan.dto';

export class CreateOrderDto {
  @ApiPropertyOptional({
    example: 1,
    description:
      'Vacío = "Consumidor final". Requerido si el pedido incluye préstamos de envase.',
  })
  @IsOptional()
  @IsInt()
  clientId?: number;

  @ApiPropertyOptional({ example: 500, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ example: 1500, default: 0, description: 'Costo de envío' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional({
    example: 62500,
    description:
      'Total final del pedido. Vacío = se calcula como items - descuento + envío; si se manda, pisa ese cálculo (redondeos, acuerdos puntuales, etc.).',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @ArrayMinSize(1)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({
    type: [CreateContainerLoanDto],
    description:
      'Envases que se le prestan al cliente al momento de este pedido (requiere clientId).',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateContainerLoanDto)
  loans?: CreateContainerLoanDto[];
}
