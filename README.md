# Mis Gastos

Gastos **personales** (privados) y **compartidos en grupos** con balances estilo Splitwise, más reportes mensuales.

```
Vue (client) ──login──► Supabase Auth (email + contraseña)
     │  Authorization: Bearer <JWT>
     └────────────────► Express API (server) ──► Postgres de Supabase
                          · verifica el JWT        (esquema gestionado con Liquibase)
                          · comprueba pertenencia al grupo
                          · calcula resúmenes y balances
```

- **`client/`** — Vue 3 + Vite + Pinia + Tailwind 4 + Chart.js. Solo usa Supabase para el login; los datos van siempre por la API.
- **`server/`** — Node + Express + `pg`. Verifica el JWT de Supabase y aplica los permisos.
- **`db/`** — Migraciones Liquibase. Las tablas tienen RLS activado **sin políticas**, así que las claves públicas de Supabase no pueden leer nada: solo el backend.

> CORS (`CORS_ORIGIN`) limita qué webs pueden llamar a la API desde un navegador, pero **no es la seguridad**: eso lo hacen el JWT y las comprobaciones de membresía.

## Puesta en marcha

Requisitos: Node 22.5+, Docker (para Liquibase).

1. **Supabase**: crea un proyecto. En *Authentication → Providers* deja Email activo (para pruebas puedes desactivar "Confirm email").
2. **Variables de entorno** (los `.env` están en `.gitignore`):
   - `server/.env` ← copia de `server/.env.example`
   - `client/.env` ← copia de `client/.env.example` (solo URL y clave `anon`; **nunca** la `service_role`)
   - `db/liquibase.properties` ← copia de `db/liquibase.properties.example`
3. **Base de datos**: `npm run db:migrate`
4. `npm install` y `npm run dev` → web en http://localhost:5173, API en :3000.

Producción: `npm run build && npm start` sirve todo desde el backend; o aloja el frontend aparte y define `VITE_API_URL` y `CORS_ORIGIN`.

## Modelo

| Tabla | Para qué |
|---|---|
| `profiles` | Usuario (id = `auth.users.id`); se crea solo en la primera petición |
| `groups`, `group_members` | Grupos y miembros; se entra con `invite_code` |
| `transactions` | `group_id` NULL = personal; con valor = gasto compartido (`paid_by` = quien pagó) |
| `transaction_splits` | Parte de cada miembro en un gasto de grupo (suma = importe) |
| `settlements` | Pagos entre miembros para saldar deudas |

Saldo de un miembro = pagado − parte que le corresponde + pagos enviados − pagos recibidos. La API simplifica las deudas a pocas transferencias.

## API (todas con `Authorization: Bearer <jwt>`)

| Ruta | |
|---|---|
| `GET/PUT /api/me` | Perfil |
| `GET/POST /api/transactions?month=YYYY-MM`, `PUT/DELETE /api/transactions/:id` | Personales |
| `GET /api/summary?month=`, `GET /api/history?limit=` | Resumen 50/30/20 e histórico personal |
| `GET/POST /api/groups`, `POST /api/groups/join` | Mis grupos / crear / unirse con código |
| `/api/groups/:id/transactions`, `/summary`, `/history` | Igual que lo personal, para el grupo (POST acepta `paidBy` y `split`) |
| `GET /api/groups/:id/balances` | Saldos y transferencias para saldar |
| `GET/POST /api/groups/:id/settlements`, `DELETE …/:sid` | Pagos entre miembros |
| `DELETE /api/groups/:id/members/me` | Salir (solo sin deudas) |

Reparto en un gasto de grupo: `{"split":{"mode":"equal","members":[ids]}}` o `{"split":{"mode":"custom","shares":[{"userId":"…","amount":12.5}]}}`.

## Tests

`npm test` ejecuta los tests unitarios (repartos, deudas). Para los de integración de la API, con un Postgres con el esquema aplicado:

```
TEST_DATABASE_URL=postgresql://postgres:test@localhost:5544/postgres npm test
```

`legacy-prototype.html` es el prototipo original (Firebase), solo como referencia.
