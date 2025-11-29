ALTER TABLE public.habits
  ADD COLUMN target_days integer[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}';

ALTER TABLE public.habits
  ADD CONSTRAINT habits_target_days_check
  CHECK (
    array_length(target_days, 1) BETWEEN 1 AND 7
    AND target_days <@ '{0,1,2,3,4,5,6}'::integer[]
  );

UPDATE public.habits SET target_days = '{1}' WHERE frequency = 'weekly';

CREATE INDEX idx_habits_target_days ON public.habits USING GIN (target_days);
