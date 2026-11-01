import { badRequest } from './errors.js';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORIES = ['fixed', 'variable', 'discretionary'];

export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export function parseMonth(value) {
  const m = String(value ?? new Date().toISOString().slice(0, 7));
  if (!MONTH_RE.test(m)) throw badRequest('month debe tener formato YYYY-MM');
  return m;
}

export const parseLimit = (v) => Math.min(Math.max(parseInt(v, 10) || 6, 1), 36);

export function parseAmount(value, field = 'amount') {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 1e9) throw badRequest(`${field} debe ser un número mayor que 0`);
  return Math.round(n * 100) / 100;
}

export function parseDate(value, field = 'date') {
  if (!DATE_RE.test(String(value ?? '')) || Number.isNaN(Date.parse(value))) throw badRequest(`${field} debe tener formato YYYY-MM-DD`);
  return value;
}

/** Normaliza el cuerpo de un movimiento. En grupo solo se admiten gastos. */
export function parseTransaction(body = {}, { group = false } = {}) {
  const type = body.type === 'income' || body.type === 'expense' ? body.type : null;
  if (!type) throw badRequest('type debe ser "income" o "expense"');
  if (group && type !== 'expense') throw badRequest('En un grupo solo se pueden registrar gastos');

  const concept = String(body.concept ?? '').trim();
  if (!concept) throw badRequest('concept es obligatorio');

  const category = type === 'income' ? 'income' : body.category;
  if (type === 'expense' && !CATEGORIES.includes(category)) throw badRequest(`category debe ser una de: ${CATEGORIES.join(', ')}`);

  const tagId = type === 'expense' && body.tagId ? body.tagId : null;
  if (tagId && !isUuid(tagId)) throw badRequest('tagId inválido');

  return { type, category, concept: concept.slice(0, 120), amount: parseAmount(body.amount), date: parseDate(body.date), tagId };
}

/** Normaliza una etiqueta: nombre (máx. 30) y color hexadecimal. */
export function parseTag(body = {}) {
  const name = String(body.name ?? '').trim().slice(0, 30);
  if (!name) throw badRequest('name es obligatorio');
  const color = body.color ?? '#64748b';
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw badRequest('color debe ser hexadecimal (#rrggbb)');
  return { name, color };
}
