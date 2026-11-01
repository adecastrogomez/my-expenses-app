import { query } from '../db.js';
import { effectiveTarget } from './targets.js';

const pct = (part, total) => (total > 0 ? (part / total) * 100 : 0);
const rangeOn = (col) => `${col} >= ($2 || '-01')::date AND ${col} < (($2 || '-01')::date + interval '1 month')`;

// Ámbito: movimientos personales de un usuario, o gastos de un grupo.
const PERSONAL = 'paid_by = $1 AND group_id IS NULL';
const GROUP = 'group_id = $1';

/**
 * Diagnóstico del mes frente al objetivo del usuario (por defecto 50/30/20).
 * Sobresaliente: ahorro >= objetivo. Positivo: >= mitad del objetivo.
 * level: empty | excellent | positive | adjust
 */
function diagnose({ income, savings, savingsRate, discretionaryPct }, target) {
  const rule = `${target.needsPct}/${target.wantsPct}/${target.savingsPct}`;
  if (income === 0) {
    return { level: 'empty', title: 'Añade los Ingresos', message: `Registra los ingresos mensuales para activar el análisis dinámico ${rule}.` };
  }
  if (savingsRate >= target.savingsPct) {
    return { level: 'excellent', title: '★ Plan Sobresaliente', message: `¡Enhorabuena! El plan funciona a la perfección. La meta de ahorro (${target.savingsPct}%) está cumplida y hay solvencia.` };
  }
  if (savingsRate >= target.savingsPct / 2) {
    return {
      level: 'positive',
      title: '✔ Plan Positivo',
      message:
        discretionaryPct > target.wantsPct
          ? `Buen margen de ahorro, pero los gastos discrecionales superan tu objetivo (${target.wantsPct}%). Ajusta el ocio si quieres llegar al ${target.savingsPct}% de ahorro.`
          : 'Cierre de mes saludable. Los gastos están cubiertos y se mantiene un ahorro moderado constante.',
    };
  }
  return {
    level: 'adjust',
    title: '⚠ Plan a Ajustar',
    message:
      savings < 0
        ? '¡Alerta de déficit! Los gastos superan los ingresos este mes. Recorta gastos discrecionales cuanto antes.'
        : `El ahorro es inferior a la mitad de tu objetivo (${target.savingsPct}%). Revisa los gastos discrecionales y variables para recortar compras prescindibles.`,
  };
}

async function totals(scope, scopeId, month) {
  const { rows } = await query(
    `SELECT type, category, SUM(amount) AS total FROM transactions WHERE ${scope} AND ${rangeOn('date')} GROUP BY type, category`,
    [scopeId, month],
  );
  const t = { income: 0, fixed: 0, variable: 0, discretionary: 0 };
  rows.forEach((r) => (t[r.category] += r.total));
  const expense = t.fixed + t.variable + t.discretionary;
  return { t, expense };
}

const categories = (t, base) => ({
  fixed: { total: t.fixed, pct: pct(t.fixed, base) },
  variable: { total: t.variable, pct: pct(t.variable, base) },
  discretionary: { total: t.discretionary, pct: pct(t.discretionary, base) },
});

export async function personalSummary(userId, month) {
  const { t, expense } = await totals(PERSONAL, userId, month);
  const savings = t.income - expense;
  const savingsRate = pct(savings, t.income);
  const cats = categories(t, t.income);
  const target = await effectiveTarget(userId, month);
  return {
    scope: 'personal',
    month,
    income: t.income,
    expense,
    savings,
    savingsRate,
    categories: cats,
    target,
    diagnostic: diagnose({ income: t.income, savings, savingsRate, discretionaryPct: cats.discretionary.pct }, target),
  };
}

export async function groupSummary(groupId, month) {
  const { t, expense } = await totals(GROUP, groupId, month);
  const { rows } = await query(
    `SELECT p.id AS "userId", p.display_name AS name,
            COALESCE((SELECT SUM(amount) FROM transactions t WHERE t.group_id = $1 AND t.paid_by = p.id AND ${rangeOn('t.date')}), 0) AS paid,
            COALESCE((SELECT SUM(s.amount) FROM transaction_splits s JOIN transactions t ON t.id = s.transaction_id
                       WHERE t.group_id = $1 AND s.user_id = p.id AND ${rangeOn('t.date')}), 0) AS share
       FROM group_members gm JOIN profiles p ON p.id = gm.user_id
      WHERE gm.group_id = $1 ORDER BY gm.joined_at`,
    [groupId, month],
  );
  return { scope: 'group', month, expense, categories: categories(t, expense), members: rows };
}

/** Ingresos/gastos/ahorro de los últimos `limit` meses con datos. */
async function monthly(scope, scopeId, limit) {
  const { rows } = await query(
    `SELECT to_char(date_trunc('month', date), 'YYYY-MM') AS month,
            SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
       FROM transactions WHERE ${scope} GROUP BY 1 ORDER BY 1 DESC LIMIT $2`,
    [scopeId, limit],
  );
  return rows
    .map((r) => ({ ...r, savings: r.income - r.expense, savingsRate: pct(r.income - r.expense, r.income) }))
    .reverse();
}

export const personalHistory = (userId, limit) => monthly(PERSONAL, userId, limit);
export const groupHistory = (groupId, limit) => monthly(GROUP, groupId, limit);
