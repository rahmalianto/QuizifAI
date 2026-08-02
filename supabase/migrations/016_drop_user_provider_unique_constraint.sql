-- Drop the unique constraint on (user_id, provider) to allow multiple API keys per provider
ALTER TABLE public.user_api_configs DROP CONSTRAINT IF EXISTS user_provider_unique;
