// Test de integración. Necesita un Postgres con el esquema aplicado (db/migrate.ps1):
//   TEST_DATABASE_URL=postgresql://postgres:test@localhost:5544/postgres npm test
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';

const DB = process.env.TEST_DATABASE_URL;
const SECRET = 'test-secret-test-secret-test-secret-123';

describe.skipIf(!DB)('API', () => {
  let server, base, pool;
  const alice = { id: randomUUID(), email: 'alice@test.dev' };
  const bob = { id: randomUUID(), email: 'bob@test.dev' };
  const eve = { id: randomUUID(), email: 'eve@test.dev' };

  const token = (u) =>
    new SignJWT({ role: 'authenticated', email: u.email }).setProtectedHeader({ alg: 'HS256' }).setSubject(u.id).setExpirationTime('1h').sign(new TextEncoder().encode(SECRET));

  const call = async (user, method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(user ? { Authorization: `Bearer ${await token(user)}` } : {}), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  };

  beforeAll(async () => {
    Object.assign(process.env, { DATABASE_URL: DB, SUPABASE_JWT_SECRET: SECRET, SUPABASE_URL: '' });
    const { createApp } = await import('../src/app.js');
    ({ pool } = await import('../src/db.js'));
    server = createApp().listen(0);
    base = `http://localhost:${server.address().port}/api`;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM groups WHERE created_by = ANY($1)', [[alice.id, bob.id, eve.id]]);
    await pool.query('DELETE FROM transactions WHERE paid_by = ANY($1)', [[alice.id, bob.id, eve.id]]);
    await pool.query('DELETE FROM profiles WHERE id = ANY($1)', [[alice.id, bob.id, eve.id]]);
    server.close();
    await pool.end();
  });

  it('rechaza peticiones sin token o con token falso', async () => {
    expect((await call(null, 'GET', '/me')).status).toBe(401);
    const res = await fetch(base + '/me', { headers: { Authorization: 'Bearer abc.def.ghi' } });
    expect(res.status).toBe(401);
  });

  it('los movimientos personales son privados', async () => {
    const created = await call(alice, 'POST', '/transactions', { type: 'income', amount: 2000, concept: 'Nómina', date: '2026-10-01' });
    expect(created.status).toBe(201);
    await call(alice, 'POST', '/transactions', { type: 'expense', category: 'fixed', amount: 500, concept: 'Alquiler', date: '2026-10-02' });

    expect((await call(alice, 'GET', '/transactions?month=2026-10')).body).toHaveLength(2);
    expect((await call(bob, 'GET', '/transactions?month=2026-10')).body).toHaveLength(0);
    expect((await call(bob, 'DELETE', `/transactions/${created.body.id}`)).status).toBe(404);

    const summary = (await call(alice, 'GET', '/summary?month=2026-10')).body;
    expect(summary).toMatchObject({ income: 2000, expense: 500, savings: 1500, diagnostic: { level: 'excellent' } });
  });

  it('valida el cuerpo', async () => {
    expect((await call(alice, 'POST', '/transactions', { type: 'x' })).status).toBe(400);
    expect((await call(alice, 'GET', '/transactions?month=2026-13')).status).toBe(400);
  });

  describe('grupos y balances', () => {
    let group;

    it('crear, unirse y aislar a los no miembros', async () => {
      group = (await call(alice, 'POST', '/groups', { name: 'Piso' })).body;
      expect(group.inviteCode).toHaveLength(8);
      expect((await call(bob, 'POST', '/groups/join', { code: group.inviteCode })).status).toBe(200);
      expect((await call(bob, 'POST', '/groups/join', { code: 'NOEXISTE' })).status).toBe(404);

      expect((await call(eve, 'GET', `/groups/${group.id}/transactions?month=2026-10`)).status).toBe(404);
      expect((await call(eve, 'GET', `/groups/${group.id}/balances`)).status).toBe(404);
      expect((await call(alice, 'GET', '/groups')).body[0].members).toHaveLength(2);
    });

    it('gasto compartido a partes iguales genera deuda', async () => {
      const r = await call(alice, 'POST', `/groups/${group.id}/transactions`, { type: 'expense', category: 'fixed', amount: 100, concept: 'Luz', date: '2026-10-05' });
      expect(r.status).toBe(201);
      const b = (await call(bob, 'GET', `/groups/${group.id}/balances`)).body;
      expect(b.transfers).toEqual([expect.objectContaining({ from: bob.id, to: alice.id, amount: 50 })]);
    });

    it('rechaza ingresos, reparto con ajenos y repartos que no suman', async () => {
      const path = `/groups/${group.id}/transactions`;
      const base = { category: 'variable', amount: 30, concept: 'Super', date: '2026-10-06' };
      expect((await call(alice, 'POST', path, { ...base, type: 'income' })).status).toBe(400);
      expect((await call(alice, 'POST', path, { ...base, type: 'expense', split: { mode: 'equal', members: [eve.id] } })).status).toBe(400);
      expect((await call(alice, 'POST', path, { ...base, type: 'expense', split: { mode: 'custom', shares: [{ userId: bob.id, amount: 5 }] } })).status).toBe(400);
    });

    it('reparto personalizado y liquidación dejan el saldo a cero', async () => {
      // Bob paga 40 y solo Alice los debe → Alice debe 40 a Bob; antes Bob debía 50 a Alice
      await call(bob, 'POST', `/groups/${group.id}/transactions`, {
        type: 'expense', category: 'variable', amount: 40, concept: 'Compra', date: '2026-10-06',
        split: { mode: 'custom', shares: [{ userId: alice.id, amount: 40 }] },
      });
      let b = (await call(alice, 'GET', `/groups/${group.id}/balances`)).body;
      expect(b.transfers).toEqual([expect.objectContaining({ from: bob.id, to: alice.id, amount: 10 })]);

      expect((await call(bob, 'POST', `/groups/${group.id}/settlements`, { to: alice.id, amount: 10 })).status).toBe(201);
      b = (await call(alice, 'GET', `/groups/${group.id}/balances`)).body;
      expect(b.transfers).toEqual([]);
      expect(b.balances.every((x) => x.net === 0)).toBe(true);
    });

    it('el resumen del grupo y salir del grupo', async () => {
      const s = (await call(alice, 'GET', `/groups/${group.id}/summary?month=2026-10`)).body;
      expect(s.expense).toBe(140);
      expect(s.members.find((m) => m.userId === alice.id)).toMatchObject({ paid: 100, share: 90 });
      expect((await call(bob, 'DELETE', `/groups/${group.id}/members/me`)).status).toBe(204);
    });
  });
});
