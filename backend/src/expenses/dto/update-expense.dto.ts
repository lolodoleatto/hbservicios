import { CreateExpenseDto } from './create-expense.dto';

// Editar un gasto reemplaza el gasto entero (mismo formulario que crear
// uno nuevo) — no hay edición parcial de líneas sueltas.
export class UpdateExpenseDto extends CreateExpenseDto {}
