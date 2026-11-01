import { Router } from 'express';
import { query } from '../db.js';
import { badRequest } from '../errors.js';
import { isUuid, parseMonth, parseTransaction, parseLimit, parseTag } from '../validate.js';
import * as tags from '../services/tags.js';
import { setTarget, clearTarget, parseTarget } from '../services/targets.js';
import * as tx from '../services/transactions.js';
import { personalSummary, personalHistory } from '../services/summary.js';

export const personal = Router();

personal.param('id', (_req, _res, next, id) => (isUuid(id) ? next() : next(badRequest('id inválido'))));

personal.get('/me', async (req, res) => {
  const { rows } = await query('SELECT id, email, display_name AS "displayName" FROM profiles WHERE id = $1', [req.user.id]);
  res.json(rows[0]);
});

personal.put('/me', async (req, res) => {
  const name = String(req.body?.displayName ?? '').trim().slice(0, 30);
  if (!name) throw badRequest('displayName es obligatorio');
  const { rows } = await query('UPDATE profiles SET display_name = $2 WHERE id = $1 RETURNING id, email, display_name AS "displayName"', [req.user.id, name]);
  res.json(rows[0]);
});

personal.get('/transactions', async (req, res) => res.json(await tx.listPersonal(req.user.id, parseMonth(req.query.month))));
personal.post('/transactions', async (req, res) => res.status(201).json(await tx.createPersonal(req.user.id, parseTransaction(req.body))));
personal.put('/transactions/:id', async (req, res) => res.json(await tx.updatePersonal(req.user.id, req.params.id, parseTransaction(req.body))));
personal.delete('/transactions/:id', async (req, res) => {
  await tx.removePersonal(req.user.id, req.params.id);
  res.status(204).end();
});

personal.get('/summary', async (req, res) => res.json(await personalSummary(req.user.id, parseMonth(req.query.month))));
personal.get('/history', async (req, res) => res.json(await personalHistory(req.user.id, parseLimit(req.query.limit))));

personal.put('/targets/:month', async (req, res) => res.json(await setTarget(req.user.id, parseMonth(req.params.month), parseTarget(req.body))));
personal.delete('/targets/:month', async (req, res) => res.json(await clearTarget(req.user.id, parseMonth(req.params.month))));

personal.get('/tags', async (req, res) => res.json(await tags.list({ userId: req.user.id })));
personal.post('/tags', async (req, res) => res.status(201).json(await tags.create({ userId: req.user.id }, parseTag(req.body))));
personal.put('/tags/:id', async (req, res) => res.json(await tags.update({ userId: req.user.id }, req.params.id, parseTag(req.body))));
personal.delete('/tags/:id', async (req, res) => {
  await tags.remove({ userId: req.user.id }, req.params.id);
  res.status(204).end();
});
personal.get('/tag-summary', async (req, res) => res.json(await tags.summarize({ userId: req.user.id }, parseMonth(req.query.month))));
