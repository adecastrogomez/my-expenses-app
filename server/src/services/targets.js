import { query } from '../db.js';
import { badRequest } from '../errors.js';

export const DEFAULT_TARGET = { needsPct: 50, wantsPct: 30, savingsPct: 20 };

/**
 * Objetivo vigente en `month`: el fijado para ese mes o, si no hay, el último anterior.
 * `since` es el mes desde el que rige (null = valores por defecto) y `explicit` indica
 * si el objetivo se fijó para ese mismo mes.
 */
export async function effectiveTarget(userId, month) {
  const { rows } = await query(
    `SELECT month, needs_pct::float8 AS "needsPct", wants_pct::float8 AS "wantsPct", savings_pct::float8 AS "savingsPct"
       FROM budget_targets WHERE owner_id = $1 AND month <= $2 ORDER BY month DESC LIMIT 1`,
    [userId, month],
  );
  if (!rows.length) return { ...DEFAULT_TARGET, since: null, explicit: false };
  const { month: since, ...pcts } = rows[0];
  return { ...pcts, since, explicit: since === month };
}

export async function setTarget(userId, month, d) {
  await query(
    `INSERT INTO budget_targets (owner_id, month, needs_pct, wants_pct, savings_pct) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (owner_id, month) DO UPDATE SET needs_pct = $3, wants_pct = $4, savings_pct = $5`,
    [userId, month, d.needsPct, d.wantsPct, d.savingsPct],
  );
  return effectiveTarget(userId, month);
}

/** Quita el objetivo propio del mes: vuelve a regir el heredado del mes anterior. */
export async function clearTarget(userId, month) {
  await query('DELETE FROM budget_targets WHERE owner_id = $1 AND month = $2', [userId, month]);
  return effectiveTarget(userId, month);
}

export function parseTarget(body = {}) {
  const read = (v, f) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) throw badRequest(`${f} debe estar entre 0 y 100`);
    return Math.round(n * 100) / 100;
  };
  const d = { needsPct: read(body.needsPct, 'needsPct'), wantsPct: read(body.wantsPct, 'wantsPct'), savingsPct: read(body.savingsPct, 'savingsPct') };
  if (Math.abs(d.needsPct + d.wantsPct + d.savingsPct - 100) > 0.001) throw badRequest('Los tres porcentajes deben sumar 100');
  return d;
}
