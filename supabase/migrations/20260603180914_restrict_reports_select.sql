-- Migration 015: Restrict public SELECT on reports table for safety
-- Removes the insecure public select policy, routing tracking queries through a secure API

DROP POLICY IF EXISTS "Public can view own report by protocol" ON reports;
