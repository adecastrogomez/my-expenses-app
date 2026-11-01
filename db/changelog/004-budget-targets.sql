--liquibase formatted sql

--changeset mis-gastos:007-budget-targets
-- Objetivo de reparto de cada usuario (necesidades / deseos / ahorro, en %).
-- Un objetivo fijado para un mes rige ese mes y los siguientes hasta que se fije otro.
CREATE TABLE public.budget_targets (
  owner_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month       text NOT NULL CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  needs_pct   numeric(5,2) NOT NULL CHECK (needs_pct   BETWEEN 0 AND 100),
  wants_pct   numeric(5,2) NOT NULL CHECK (wants_pct   BETWEEN 0 AND 100),
  savings_pct numeric(5,2) NOT NULL CHECK (savings_pct BETWEEN 0 AND 100),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, month),
  CHECK (needs_pct + wants_pct + savings_pct = 100)
);
ALTER TABLE public.budget_targets ENABLE ROW LEVEL SECURITY;
--rollback DROP TABLE public.budget_targets;
