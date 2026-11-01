import { randomBytes } from 'node:crypto';
import { query, withTransaction } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import { getBalances } from './balances.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos
const newInviteCode = () => Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join('');

export async function isMember(groupId, userId) {
  const { rowCount } = await query('SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  return rowCount > 0;
}

export async function getMembers(groupId) {
  const { rows } = await query(
    `SELECT p.id, p.display_name AS name, p.email
       FROM group_members gm JOIN profiles p ON p.id = gm.user_id
      WHERE gm.group_id = $1 ORDER BY gm.joined_at, p.id`,
    [groupId],
  );
  return rows;
}

export async function listForUser(userId) {
  const { rows } = await query(
    `SELECT g.id, g.name, g.invite_code AS "inviteCode",
            (SELECT json_agg(json_build_object('id', p.id, 'name', p.display_name) ORDER BY m2.joined_at)
               FROM group_members m2 JOIN profiles p ON p.id = m2.user_id WHERE m2.group_id = g.id) AS members
       FROM groups g JOIN group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = $1 ORDER BY g.created_at`,
    [userId],
  );
  return rows;
}

export async function create(userId, name) {
  const clean = String(name ?? '').trim().slice(0, 40);
  if (!clean) throw badRequest('El nombre del grupo es obligatorio');
  return withTransaction(async (c) => {
    const { rows } = await c.query(
      'INSERT INTO groups (name, invite_code, created_by) VALUES ($1, $2, $3) RETURNING id, name, invite_code AS "inviteCode"',
      [clean, newInviteCode(), userId],
    );
    await c.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [rows[0].id, userId]);
    return rows[0];
  });
}

export async function join(userId, code) {
  const { rows } = await query('SELECT id, name FROM groups WHERE invite_code = $1', [String(code ?? '').trim().toUpperCase()]);
  if (!rows.length) throw notFound('Código de invitación no válido');
  await query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [rows[0].id, userId]);
  return rows[0];
}

/** Salir solo si no se debe ni se debe nada; el último en salir borra el grupo. */
export async function leave(groupId, userId) {
  const { balances } = await getBalances(groupId);
  if (balances.find((b) => b.userId === userId)?.net) throw badRequest('Salda tus deudas antes de salir del grupo');
  await query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  const { rowCount } = await query('SELECT 1 FROM group_members WHERE group_id = $1', [groupId]);
  if (!rowCount) await query('DELETE FROM groups WHERE id = $1', [groupId]);
}
