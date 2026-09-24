// Los <form> del sistema llevan noValidate: en vez de los globos nativos del
// navegador (que se ven distinto en cada uno y no se pueden estilar), la
// validación de campos obligatorios la hace la propia app y el mensaje sale
// por el mismo cartel rojo de error que ya usa cada pantalla.
export function isEmptyValue(value) {
  return value === '' || value === null || value === undefined
}

// Recibe pares [etiqueta, valor] en el orden en que aparecen en el
// formulario y devuelve el mensaje del primero vacío, o null si está todo
// completo.
export function firstMissing(fields) {
  const missing = fields.find(([, value]) => isEmptyValue(value))
  return missing ? `Falta completar: ${missing[0]}` : null
}
