-- Add AI settings to companies table

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'claude-3-5-sonnet-20240620',
ADD COLUMN IF NOT EXISTS ai_api_keys JSONB DEFAULT '{}'::jsonb;

-- Comment on columns
COMMENT ON COLUMN companies.ai_model IS 'The currently selected AI model for the company (e.g., claude-3-5-sonnet-20240620, gpt-4o, gemini-1.5-pro)';
COMMENT ON COLUMN companies.ai_api_keys IS 'A JSON object storing API keys for different providers: {"openai": "...", "anthropic": "...", "google": "..."}';
