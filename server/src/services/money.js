import { badRequest } from '../errors.js';

export const toCents = (n) => Math.round(n * 100);
export const fromCents = (c) => c / 100;

/**
 * Reparto a partes iguales en céntimos; el resto se reparte de uno en uno
 * entre los primeros para que la suma sea exacta.
 */
export function equalSplit(totalCents, userIds) {
  const base = Math.floor(totalCents / userIds.length);
  const extra = totalCents - base * userIds.length;
  return userIds.map((userId, i) => ({ userId, cents: base + (i < extra ? 1 : 0) }));
}

/**
 * Interpreta `split` del cuerpo de la petición.
 *  { mode: 'equal', members: [ids] }  |  { mode: 'custom', shares: [{ userId, amount }] }
 * Devuelve [{ userId, cents }] cuya suma es exactamente totalCents.
 */
export function resolveSplit(split, totalCents, memberIds) {
  const members = new Set(memberIds);
  if (!split || split.mode === 'equal') {
    const ids = [...new Set(split?.members ?? memberIds)];
    if (!ids.length) throw badRequest('El reparto necesita al menos un miembro');
    if (ids.some((id) => !members.has(id))) throw badRequest('El reparto incluye a alguien que no es miembro del grupo');
    return equalSplit(totalCents, ids);
  }
  if (split.mode === 'custom') {
    const shares = (split.shares ?? []).map((s) => ({ userId: s.userId, cents: toCents(Number(s.amount)) }));
    if (!shares.length || shares.some((s) => !members.has(s.userId) || !Number.isInteger(s.cents) || s.cents < 0)) {
      throw badRequest('Reparto personalizado inválido');
    }
    if (new Set(shares.map((s) => s.userId)).size !== shares.length) throw badRequest('Miembro repetido en el reparto');
    if (shares.reduce((a, s) => a + s.cents, 0) !== totalCents) throw badRequest('Las partes deben sumar el importe total');
    return shares;
  }
  throw badRequest('split.mode debe ser "equal" o "custom"');
}

/**
 * Dado el saldo neto por usuario en céntimos (positivo = le deben, negativo = debe),
 * devuelve la lista mínima aproximada de transferencias para saldar todo.
 */
export function simplifyDebts(netByUser) {
  const creditors = [];
  const debtors = [];
  for (const [userId, net] of Object.entries(netByUser)) {
    if (net > 0) creditors.push({ userId, cents: net });
    else if (net < 0) debtors.push({ userId, cents: -net });
  }
  creditors.sort((a, b) => b.cents - a.cents);
  debtors.sort((a, b) => b.cents - a.cents);

  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < creditors.length && j < debtors.length) {
    const cents = Math.min(creditors[i].cents, debtors[j].cents);
    transfers.push({ from: debtors[j].userId, to: creditors[i].userId, cents });
    creditors[i].cents -= cents;
    debtors[j].cents -= cents;
    if (creditors[i].cents === 0) i++;
    if (debtors[j].cents === 0) j++;
  }
  return transfers;
}
