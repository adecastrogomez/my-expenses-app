--liquibase formatted sql

--changeset mis-gastos:006-tags
-- Etiquetas libres para clasificar gastos. Cada etiqueta pertenece a un usuario
-- (gastos personales) o a un grupo (gastos compartidos), nunca a ambos.
CREATE TABLE public.tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id   uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  name       text NOT NULL,
  color      text NOT NULL DEFAULT '#64748b',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((owner_id IS NULL) <> (group_id IS NULL))
);
CREATE UNIQUE INDEX uq_tags_owner_name ON public.tags (owner_id, lower(name)) WHERE owner_id IS NOT NULL;
CREATE UNIQUE INDEX uq_tags_group_name ON public.tags (group_id, lower(name)) WHERE group_id IS NOT NULL;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.transactions ADD COLUMN tag_id uuid REFERENCES public.tags(id) ON DELETE SET NULL;
CREATE INDEX idx_tx_tag ON public.transactions (tag_id) WHERE tag_id IS NOT NULL;
--rollback DROP INDEX idx_tx_tag; ALTER TABLE public.transactions DROP COLUMN tag_id; DROP TABLE public.tags;
