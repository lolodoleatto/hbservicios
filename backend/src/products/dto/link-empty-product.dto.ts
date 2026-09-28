import { IsInt, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LinkEmptyProductDto {
  @ApiPropertyOptional({
    example: 2,
    nullable: true,
    description:
      'ID del producto tipo envase vacío a vincular con esta garrafa/cilindro llena. Null o ausente para desvincular.',
  })
  @IsOptional()
  @IsInt()
  emptyProductId?: number | null;
}
