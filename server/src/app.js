import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { HttpError } from './errors.js';
import { requireAuth } from './middleware/auth.js';
import { personal } from './routes/personal.js';
import { groupRoutes } from './routes/groups.js';

export function createApp() {
  const app = express();

  // CORS limita qué webs pueden llamar a la API desde un navegador.
  // La seguridad real es el JWT + la comprobación de membresía en cada ruta.
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '50kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/groups', requireAuth, groupRoutes);
  app.use('/api', requireAuth, personal);

  // Si existe el frontend compilado, el mismo servidor lo sirve.
  const dist = resolve(dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')));
  }

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
