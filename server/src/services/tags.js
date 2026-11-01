import { query } from '../db.js';
import { badRequest, notFound } from '../errors.js';

const COLS = 'id, name, color';

// scope = { userId } (etiquetas personales) o { groupId } (etiquetas del grupo)
const owner = (scope) => (scope.groupId ? ['group_id = $2', scope.groupId] : ['owner_id = $2 AND group_id IS NULL', scope.userId]);

export async function list(scope) {
  const [cond, id] = owner(scope);
  const { rows } = await query(`SELECT ${COLS} FROM tags WHERE ${cond.replace('$2', '$1')} ORDER BY lower(name)`, [id]);
  return rows;
}

async function guardDuplicate(run) {
  try {
    return await run();
  } catch (e) {
    if (e.code === '23505') throw badRequest('Ya existe una etiqueta con ese nombre');
    throw e;
  }
}

export async function create(scope, d) {
  return guardDuplicate(async () => {
    const { rows } = await query(
      `INSERT INTO tags (owner_id, group_id, name, color) VALUES ($1,$2,$3,$4) RETURNING ${COLS}`,
      [scope.groupId ? null : scope.userId, scope.groupId ?? null, d.name, d.color],
    );
    return rows[0];
  });
}

export async function update(scope, id, d) {
  const [cond, scopeId] = owner(scope);
  return guardDuplicate(async () => {
    const { rows } = await query(`UPDATE tags SET name=$3, color=$4 WHERE id=$1 AND ${cond} RETURNING ${COLS}`, [id, scopeId, d.name, d.color]);
    if (!rows.length) throw notFound('Etiqueta no encontrada');
    return rows[0];
  });
}

export async function remove(scope, id) {
  const [cond, scopeId] = owner(scope);
  const { rowCount } = await query(`DELETE FROM tags WHERE id=$1 AND ${cond}`, [id, scopeId]);
  if (!rowCount) throw notFound('Etiqueta no encontrada');
}

/** Comprueba que la etiqueta existe en este ámbito (evita usar etiquetas de otro usuario o grupo). */
export async function assertInScope(scope, tagId) {
  if (!tagId) return;
  const [cond, scopeId] = owner(scope);
  const { rowCount } = await query(`SELECT 1 FROM tags WHERE id=$1 AND ${cond}`, [tagId, scopeId]);
  if (!rowCount) throw badRequest('La etiqueta no existe');
}

/** Gasto del mes agrupado por etiqueta; sin etiqueta se agrupa como "Sin etiqueta". */
export async function summarize(scope, month) {
  const filter = scope.groupId ? 't.group_id = $1' : 't.paid_by = $1 AND t.group_id IS NULL';
  const { rows } = await query(
    `SELECT g.id, COALESCE(g.name, 'Sin etiqueta') AS name, COALESCE(g.color, '#cbd5e1') AS color, SUM(t.amount)::float8 AS total
       FROM transactions t LEFT JOIN tags g ON g.id = t.tag_id
      WHERE ${filter} AND t.type = 'expense'
        AND t.date >= ($2 || '-01')::date AND t.date < (($2 || '-01')::date + interval '1 month')
      GROUP BY g.id, g.name, g.color ORDER BY total DESC`,
    [scope.groupId ?? scope.userId, month],
  );
  const total = rows.reduce((s, r) => s + r.total, 0);
  return { total, items: rows.map((r) => ({ ...r, pct: total ? (r.total / total) * 100 : 0 })) };
}
