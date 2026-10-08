-- Add 'critica' to priority constraint
ALTER TABLE action_plans DROP CONSTRAINT action_plans_priority_check;
ALTER TABLE action_plans ADD CONSTRAINT action_plans_priority_check
  CHECK (priority IN ('critica', 'alta', 'media', 'baixa'));

-- Allow free-text timeframe (e.g., '1-3 meses', '3-6 meses', '6-12 meses')
ALTER TABLE action_plans DROP CONSTRAINT action_plans_timeframe_check;
