import { Router } from 'express';
import { query } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import { isUuid, parseMonth, parseTransaction, parseAmount, parseDate, parseLimit, parseTag } from '../validate.js';
import * as tags from '../services/tags.js';
import * as groups from '../services/groups.js';
import * as tx from '../services/transactions.js';
import { getBalances, listSettlements } from '../services/balances.js';
import { groupSummary, groupHistory } from '../services/summary.js';

export const groupRoutes = Router();

groupRoutes.get('/', async (req, res) => res.json(await groups.listForUser(req.user.id)));
groupRoutes.post('/', async (req, res) => res.status(201).json(await groups.create(req.user.id, req.body?.name)));
groupRoutes.post('/join', async (req, res) => res.json(await groups.join(req.user.id, req.body?.code)));

// Todo lo que cuelga de /:groupId exige ser miembro. Si no, 404 (no revelamos que el grupo existe).
const scoped = Router({ mergeParams: true });
groupRoutes.use('/:groupId', async (req, res, next) => {
  const { groupId } = req.params;
  if (!isUuid(groupId) || !(await groups.isMember(groupId, req.user.id))) return next(notFound('Grupo no encontrado'));
  next();
}, scoped);

scoped.param('id', (_req, _res, next, id) => (isUuid(id) ? next() : next(badRequest('id inválido'))));

scoped.get('/members', async (req, res) => res.json(await groups.getMembers(req.params.groupId)));
scoped.delete('/members/me', async (req, res) => {
  await groups.leave(req.params.groupId, req.user.id);
  res.status(204).end();
});

scoped.get('/transactions', async (req, res) => res.json(await tx.listGroup(req.params.groupId, parseMonth(req.query.month))));
scoped.post('/transactions', async (req, res) => {
  const created = await tx.createGroup(req.params.groupId, req.user.id, parseTransaction(req.body, { group: true }), req.body);
  res.status(201).json(created);
});
scoped.put('/transactions/:id', async (req, res) =>
  res.json(await tx.updateGroup(req.params.groupId, req.user.id, req.params.id, parseTransaction(req.body, { group: true }), req.body)),
);
scoped.delete('/transactions/:id', async (req, res) => {
  await tx.removeGroup(req.params.groupId, req.params.id);
  res.status(204).end();
});

scoped.get('/summary', async (req, res) => res.json(await groupSummary(req.params.groupId, parseMonth(req.query.month))));
scoped.get('/history', async (req, res) => res.json(await groupHistory(req.params.groupId, parseLimit(req.query.limit))));

scoped.get('/tags', async (req, res) => res.json(await tags.list({ groupId: req.params.groupId })));
scoped.post('/tags', async (req, res) => res.status(201).json(await tags.create({ groupId: req.params.groupId }, parseTag(req.body))));
scoped.put('/tags/:id', async (req, res) => res.json(await tags.update({ groupId: req.params.groupId }, req.params.id, parseTag(req.body))));
scoped.delete('/tags/:id', async (req, res) => {
  await tags.remove({ groupId: req.params.groupId }, req.params.id);
  res.status(204).end();
});
scoped.get('/tag-summary', async (req, res) => res.json(await tags.summarize({ groupId: req.params.groupId }, parseMonth(req.query.month))));

scoped.get('/balances', async (req, res) => res.json(await getBalances(req.params.groupId)));
scoped.get('/settlements', async (req, res) => res.json(await listSettlements(req.params.groupId)));

// Registra que el usuario autenticado ha pagado `amount` a `to`.
scoped.post('/settlements', async (req, res) => {
  const { groupId } = req.params;
  const to = req.body?.to;
  if (!isUuid(to) || to === req.user.id || !(await groups.isMember(groupId, to))) throw badRequest('El destinatario debe ser otro miembro del grupo');
  const amount = parseAmount(req.body?.amount);
  const date = req.body?.date ? parseDate(req.body.date) : new Date().toISOString().slice(0, 10);
  const { rows } = await query(
    `INSERT INTO settlements (group_id, from_user, to_user, amount, date) VALUES ($1,$2,$3,$4,$5)
     RETURNING id, from_user AS "from", to_user AS "to", amount, to_char(date, 'YYYY-MM-DD') AS date`,
    [groupId, req.user.id, to, amount, date],
  );
  res.status(201).json(rows[0]);
});

scoped.delete('/settlements/:id', async (req, res) => {
  const { rowCount } = await query('DELETE FROM settlements WHERE id = $1 AND group_id = $2 AND from_user = $3', [req.params.id, req.params.groupId, req.user.id]);
  if (!rowCount) throw notFound('Liquidación no encontrada');
  res.status(204).end();
});
