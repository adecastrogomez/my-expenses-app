import { jwtVerify, createRemoteJWKSet } from 'jose';
import { config } from '../config.js';
import { query } from '../db.js';

const secret = config.jwtSecret ? new TextEncoder().encode(config.jwtSecret) : null;
const jwks = !secret ? createRemoteJWKSet(new URL(`${config.supabaseUrl}/auth/v1/.well-known/jwks.json`)) : null;

const knownProfiles = new Set();

/** Verifica el JWT de Supabase y crea el perfil la primera vez que vemos al usuario. */
export async function requireAuth(req, res, next) {
  const token = /^Bearer (.+)$/.exec(req.get('authorization') ?? '')?.[1];
  if (!token) return res.status(401).json({ error: 'Falta el token de acceso' });

  let payload;
  try {
    ({ payload } = secret ? await jwtVerify(token, secret, { algorithms: ['HS256'] }) : await jwtVerify(token, jwks));
  } catch {
    return res.status(401).json({ error: 'Token inválido o caducado' });
  }
  if (payload.role !== 'authenticated' || !payload.sub) return res.status(401).json({ error: 'Token no válido para esta API' });

  const email = payload.email ?? '';
  req.user = { id: payload.sub, email };

  if (!knownProfiles.has(payload.sub)) {
    const name = payload.user_metadata?.name || email.split('@')[0] || 'Usuario';
    await query('INSERT INTO profiles (id, email, display_name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING', [payload.sub, email, name]);
    knownProfiles.add(payload.sub);
  }
  next();
}
