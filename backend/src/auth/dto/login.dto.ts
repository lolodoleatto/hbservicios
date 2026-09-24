import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// A propósito NO se valida formato de email, campos vacíos ni largo mínimo
// de contraseña acá: para el login, cualquier dato mal formado o incompleto
// tiene que terminar en el mismo mensaje genérico "Credenciales inválidas"
// de AuthService, en vez de mostrar mensajes técnicos de class-validator en
// inglés. El frontend igual exige completar ambos campos antes de enviar.
export class LoginDto {
  @ApiProperty({ example: 'admin@hbservicios.com' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  password: string;
}
