import { PartialType } from '@nestjs/swagger';
import { CreateFireExtinguisherDto } from './create-fire-extinguisher.dto';

// Todos los campos opcionales. Si vienen `items`, reemplazan a todas las
// líneas de la recarga (mismo formulario que al crearla).
export class UpdateFireExtinguisherDto extends PartialType(CreateFireExtinguisherDto) {}
