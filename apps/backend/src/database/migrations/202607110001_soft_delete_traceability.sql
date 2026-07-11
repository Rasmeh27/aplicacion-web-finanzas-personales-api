-- Trazabilidad básica: los registros eliminados se ocultan sin destruirlos.

ALTER TABLE IF EXISTS public.movements
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE IF EXISTS public.financial_goals
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_movements_user_deleted_at
  ON public.movements (user_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_financial_goals_user_deleted_at
  ON public.financial_goals (user_id, deleted_at);
