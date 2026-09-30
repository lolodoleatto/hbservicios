import { CreateOrderDto } from './create-order.dto';

// Editar un pedido reemplaza el pedido entero (mismo formulario que crear
// uno nuevo) — no hay edición parcial de líneas sueltas. Los préstamos
// (loans) no se tocan al editar: sólo se crean al momento de crear el
// pedido, ver OrdersService.update().
export class UpdateOrderDto extends CreateOrderDto {}
