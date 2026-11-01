import { query, withTransaction } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import { toCents, fromCents, resolveSplit } from './money.js';
import { getMembers } from './groups.js';
import { assertInScope } from './tags.js';

const rangeOn = (col) => `${col} >= ($2 || '-01')::date AND ${col} < (($2 || '-01')::date + interval '1 month')`;
const COLS = `id, type, category, amount, concept, to_char(date, 'YYYY-MM-DD') AS date, paid_by AS "paidBy", tag_id AS "tagId"`;

/* ---------- Personales ---------- */

export async function listPersonal(userId, month) {
  const { rows } = await query(
    `SELECT ${COLS} FROM transactions WHERE paid_by = $1 AND group_id IS NULL AND ${rangeOn('date')} ORDER BY date DESC, created_at DESC`,
    [userId, month],
  );
  return rows;
}

export async function createPersonal(userId, d) {
  await assertInScope({ userId }, d.tagId);
  const { rows } = await query(
    `INSERT INTO transactions (paid_by, type, category, amount, concept, date, tag_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${COLS}`,
    [userId, d.type, d.category, d.amount, d.concept, d.date, d.tagId],
  );
  return rows[0];
}

export async function updatePersonal(userId, id, d) {
  await assertInScope({ userId }, d.tagId);
  const { rows } = await query(
    `UPDATE transactions SET type=$3, category=$4, amount=$5, concept=$6, date=$7, tag_id=$8
      WHERE id=$1 AND paid_by=$2 AND group_id IS NULL RETURNING ${COLS}`,
    [id, userId, d.type, d.category, d.amount, d.concept, d.date, d.tagId],
  );
  if (!rows.length) throw notFound('Movimiento no encontrado');
  return rows[0];
}

export async function removePersonal(userId, id) {
  const { rowCount } = await query('DELETE FROM transactions WHERE id=$1 AND paid_by=$2 AND group_id IS NULL', [id, userId]);
  if (!rowCount) throw notFound('Movimiento no encontrado');
}

/* ---------- De grupo ---------- */

export async function listGroup(groupId, month) {
  const { rows } = await query(
    `SELECT t.id, t.category, t.amount, t.concept, to_char(t.date, 'YYYY-MM-DD') AS date, t.paid_by AS "paidBy", t.tag_id AS "tagId",
            'expense' AS type, p.display_name AS "paidByName",
            (SELECT json_agg(json_build_object('userId', s.user_id, 'amount', s.amount) ORDER BY s.user_id)
               FROM transaction_splits s WHERE s.transaction_id = t.id) AS splits
       FROM transactions t JOIN profiles p ON p.id = t.paid_by
      WHERE t.group_id = $1 AND ${rangeOn('t.date')}
      ORDER BY t.date DESC, t.created_at DESC`,
    [groupId, month],
  );
  return rows;
}

async function writeSplits(client, txId, shares) {
  await client.query('DELETE FROM transaction_splits WHERE transaction_id = $1', [txId]);
  for (const s of shares) {
    await client.query('INSERT INTO transaction_splits (transaction_id, user_id, amount) VALUES ($1,$2,$3)', [txId, s.userId, fromCents(s.cents)]);
  }
}

/** Por defecto paga quien registra y se reparte a partes iguales entre todos. Pagador y reparto deben ser miembros. */
async function prepare(groupId, userId, d, body) {
  const memberIds = (await getMembers(groupId)).map((m) => m.id);
  const paidBy = body.paidBy ?? userId;
  if (!memberIds.includes(paidBy)) throw badRequest('El pagador no es miembro del grupo');
  return { paidBy, shares: resolveSplit(body.split, toCents(d.amount), memberIds) };
}

export async function createGroup(groupId, userId, d, body) {
  const { paidBy, shares } = await prepare(groupId, userId, d, body);
  await assertInScope({ groupId }, d.tagId);
  return withTransaction(async (c) => {
    const { rows } = await c.query(
      `INSERT INTO transactions (group_id, paid_by, type, category, amount, concept, date, tag_id) VALUES ($1,$2,'expense',$3,$4,$5,$6,$7) RETURNING id`,
      [groupId, paidBy, d.category, d.amount, d.concept, d.date, d.tagId],
    );
    await writeSplits(c, rows[0].id, shares);
    return { id: rows[0].id };
  });
}

export async function updateGroup(groupId, userId, id, d, body) {
  const { paidBy, shares } = await prepare(groupId, userId, d, body);
  await assertInScope({ groupId }, d.tagId);
  return withTransaction(async (c) => {
    const { rowCount } = await c.query(
      'UPDATE transactions SET paid_by=$3, category=$4, amount=$5, concept=$6, date=$7, tag_id=$8 WHERE id=$1 AND group_id=$2',
      [id, groupId, paidBy, d.category, d.amount, d.concept, d.date, d.tagId],
    );
    if (!rowCount) throw notFound('Movimiento no encontrado');
    await writeSplits(c, id, shares);
    return { id };
  });
}

export async function removeGroup(groupId, id) {
  const { rowCount } = await query('DELETE FROM transactions WHERE id=$1 AND group_id=$2', [id, groupId]);
  if (!rowCount) throw notFound('Movimiento no encontrado');
}
