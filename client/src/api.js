import { supabase } from './supabase.js';

const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

async function request(method, path, body) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || `Error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// scope: null = datos personales; "<groupId>" = datos del grupo
const prefix = (scope) => (scope ? `/groups/${scope}` : '');

export const api = {
  me: () => request('GET', '/me'),
  saveMe: (displayName) => request('PUT', '/me', { displayName }),

  listTransactions: (scope, month) => request('GET', `${prefix(scope)}/transactions?month=${month}`),
  saveTransaction: (scope, tx) =>
    tx.id ? request('PUT', `${prefix(scope)}/transactions/${tx.id}`, tx) : request('POST', `${prefix(scope)}/transactions`, tx),
  deleteTransaction: (scope, id) => request('DELETE', `${prefix(scope)}/transactions/${id}`),
  summary: (scope, month) => request('GET', `${prefix(scope)}/summary?month=${month}`),
  history: (scope, limit = 6) => request('GET', `${prefix(scope)}/history?limit=${limit}`),

  saveTarget: (month, target) => request('PUT', `/targets/${month}`, target),
  clearTarget: (month) => request('DELETE', `/targets/${month}`),

  listTags: (scope) => request('GET', `${prefix(scope)}/tags`),
  saveTag: (scope, tag) =>
    tag.id ? request('PUT', `${prefix(scope)}/tags/${tag.id}`, tag) : request('POST', `${prefix(scope)}/tags`, tag),
  deleteTag: (scope, id) => request('DELETE', `${prefix(scope)}/tags/${id}`),
  tagSummary: (scope, month) => request('GET', `${prefix(scope)}/tag-summary?month=${month}`),

  listGroups: () => request('GET', '/groups'),
  createGroup: (name) => request('POST', '/groups', { name }),
  joinGroup: (code) => request('POST', '/groups/join', { code }),
  leaveGroup: (id) => request('DELETE', `/groups/${id}/members/me`),
  balances: (id) => request('GET', `/groups/${id}/balances`),
  settlements: (id) => request('GET', `/groups/${id}/settlements`),
  addSettlement: (id, to, amount) => request('POST', `/groups/${id}/settlements`, { to, amount }),
  deleteSettlement: (id, settlementId) => request('DELETE', `/groups/${id}/settlements/${settlementId}`),
};
