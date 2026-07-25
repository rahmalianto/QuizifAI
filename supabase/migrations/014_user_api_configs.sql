-- Create user_api_configs table
CREATE TABLE IF NOT EXISTS public.user_api_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'google', 'openai', 'anthropic', 'groq', 'cloudflare'
  api_key text NOT NULL,
  model_name text NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_provider_unique UNIQUE (user_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_api_configs ENABLE ROW LEVEL SECURITY;

-- Policies for user_api_configs
CREATE POLICY "Users can insert their own api configs" 
  ON public.user_api_configs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own api configs" 
  ON public.user_api_configs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own api configs" 
  ON public.user_api_configs FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own api configs" 
  ON public.user_api_configs FOR DELETE 
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_api_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_api_configs_modtime
    BEFORE UPDATE ON public.user_api_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_user_api_configs_updated_at();
