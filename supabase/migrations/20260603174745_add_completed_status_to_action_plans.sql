-- Migration 009: Add COMPLETED value to action_plan_status enum
-- For consolidating task completion directly into the action plans flow

ALTER TYPE action_plan_status ADD VALUE IF NOT EXISTS 'COMPLETED';
