import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

// Filtros y paginación compartidos por los listados (pedidos, gastos,
// movimientos de stock). La paginación es opcional: si no viene `page`, el
// endpoint devuelve el array completo como antes, así no se rompen los
// usos que necesitan todo (p.ej. el historial de compras de un producto).

export interface ListQuery {
  from?: string;
  to?: string;
  search?: string;
  page?: string;
  pageSize?: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Devuelve skip/take para TypeORM, o null si no se pidió paginar.
export function pageOptions(query: ListQuery) {
  if (!query.page) return null;
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE),
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

// Para columnas `date` (YYYY-MM-DD): se compara como string.
export function dateRangeWhere(from?: string, to?: string) {
  if (from && to) return Between(from, to);
  if (from) return MoreThanOrEqual(from);
  if (to) return LessThanOrEqual(to);
  return undefined;
}

// Para columnas timestamp: el día completo, de 00:00 a 23:59.
export function dateTimeRangeWhere(from?: string, to?: string) {
  if (from && to) {
    return Between(
      new Date(`${from}T00:00:00`),
      new Date(`${to}T23:59:59.999`),
    );
  }
  if (from) return MoreThanOrEqual(new Date(`${from}T00:00:00`));
  if (to) return LessThanOrEqual(new Date(`${to}T23:59:59.999`));
  return undefined;
}
