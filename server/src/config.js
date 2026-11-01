import 'dotenv/config';

const required = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name} (revisa server/.env)`);
  return v;
};

export const config = {
  port: process.env.PORT || 3000,
  databaseUrl: required('DATABASE_URL'),
  supabaseUrl: process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : '',
  jwtSecret: process.env.SUPABASE_JWT_SECRET || '',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
};

if (!config.jwtSecret && !config.supabaseUrl) {
  throw new Error('Define SUPABASE_URL (JWKS) o SUPABASE_JWT_SECRET para verificar los tokens');
}
