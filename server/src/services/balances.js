import { query } from '../db.js';
import { toCents, fromCents, simplifyDebts } from './money.js';
import { getMembers } from './groups.js';

/**
 * Saldo neto por miembro = pagado - parte que le corresponde + liquidaciones enviadas - recibidas.
 * Positivo: le deben. Negativo: debe.
 */
export async function getBalances(groupId) {
  const members = await getMembers(groupId);
  const net = Object.fromEntries(members.map((m) => [m.id, 0]));

  const [paid, owed, settled] = await Promise.all([
    query('SELECT paid_by AS id, SUM(amount) AS total FROM transactions WHERE group_id = $1 GROUP BY paid_by', [groupId]),
    query(
      `SELECT s.user_id AS id, SUM(s.amount) AS total
         FROM transaction_splits s JOIN transactions t ON t.id = s.transaction_id
        WHERE t.group_id = $1 GROUP BY s.user_id`,
      [groupId],
    ),
    query('SELECT from_user, to_user, amount FROM settlements WHERE group_id = $1', [groupId]),
  ]);

  const add = (id, cents) => {
    net[id] = (net[id] ?? 0) + cents;
  };
  paid.rows.forEach((r) => add(r.id, toCents(r.total)));
  owed.rows.forEach((r) => add(r.id, -toCents(r.total)));
  settled.rows.forEach((r) => {
    add(r.from_user, toCents(r.amount));
    add(r.to_user, -toCents(r.amount));
  });

  const name = Object.fromEntries(members.map((m) => [m.id, m.name]));
  return {
    balances: Object.entries(net).map(([userId, cents]) => ({ userId, name: name[userId] ?? 'Ex miembro', net: fromCents(cents) })),
    transfers: simplifyDebts(net).map((t) => ({
      from: t.from,
      to: t.to,
      fromName: name[t.from],
      toName: name[t.to],
      amount: fromCents(t.cents),
    })),
  };
}

export async function listSettlements(groupId) {
  const { rows } = await query(
    `SELECT s.id, s.from_user AS "from", s.to_user AS "to", s.amount, to_char(s.date, 'YYYY-MM-DD') AS date,
            pf.display_name AS "fromName", pt.display_name AS "toName"
       FROM settlements s
       JOIN profiles pf ON pf.id = s.from_user JOIN profiles pt ON pt.id = s.to_user
      WHERE s.group_id = $1 ORDER BY s.date DESC, s.created_at DESC`,
    [groupId],
  );
  return rows;
}
