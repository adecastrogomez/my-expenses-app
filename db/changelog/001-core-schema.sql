--liquibase formatted sql

--changeset mis-gastos:001-profiles
CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY,           -- = auth.users.id de Supabase
  email        text NOT NULL,
  display_name text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
--rollback DROP TABLE public.profiles;

--changeset mis-gastos:002-groups
CREATE TABLE public.groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  created_by  uuid NOT NULL REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.group_members (
  group_id  uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX idx_group_members_user ON public.group_members (user_id);
--rollback DROP TABLE public.group_members; DROP TABLE public.groups;

--changeset mis-gastos:003-transactions
-- group_id NULL = gasto/ingreso personal; con valor = gasto compartido.
-- paid_by: dueño (personal) o quien pagó (grupo).
CREATE TABLE public.transactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paid_by    uuid NOT NULL REFERENCES public.profiles(id),
  group_id   uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('income', 'expense')),
  category   text NOT NULL CHECK (category IN ('income', 'fixed', 'variable', 'discretionary')),
  amount     numeric(12,2) NOT NULL CHECK (amount > 0),
  concept    text NOT NULL,
  date       date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((type = 'income') = (category = 'income')),
  CHECK (group_id IS NULL OR type = 'expense')
);
CREATE INDEX idx_tx_personal ON public.transactions (paid_by, date) WHERE group_id IS NULL;
CREATE INDEX idx_tx_group    ON public.transactions (group_id, date) WHERE group_id IS NOT NULL;
--rollback DROP TABLE public.transactions;

--changeset mis-gastos:004-splits-settlements
-- Parte que corresponde a cada miembro en un gasto de grupo (la suma = amount).
CREATE TABLE public.transaction_splits (
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES public.profiles(id),
  amount         numeric(12,2) NOT NULL CHECK (amount >= 0),
  PRIMARY KEY (transaction_id, user_id)
);

-- Pagos entre miembros para saldar deudas.
CREATE TABLE public.settlements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  from_user  uuid NOT NULL REFERENCES public.profiles(id),
  to_user    uuid NOT NULL REFERENCES public.profiles(id),
  amount     numeric(12,2) NOT NULL CHECK (amount > 0),
  date       date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_user <> to_user)
);
CREATE INDEX idx_settlements_group ON public.settlements (group_id);
--rollback DROP TABLE public.settlements; DROP TABLE public.transaction_splits;
