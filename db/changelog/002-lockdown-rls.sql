--liquibase formatted sql

--changeset mis-gastos:005-enable-rls
-- RLS activado SIN políticas: las claves anon/authenticated de Supabase no pueden
-- leer ni escribir nada. Solo el backend (conexión directa de Postgres) accede a los datos.
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements        ENABLE ROW LEVEL SECURITY;
--rollback ALTER TABLE public.settlements DISABLE ROW LEVEL SECURITY; ALTER TABLE public.transaction_splits DISABLE ROW LEVEL SECURITY; ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY; ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY; ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY; ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
