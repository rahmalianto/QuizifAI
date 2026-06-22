-- Create practice_configuration table
CREATE TABLE IF NOT EXISTS public.practice_configuration (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  category jsonb DEFAULT '[]'::jsonb,
  tag jsonb DEFAULT '[]'::jsonb,
  question_count integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.practice_configuration ENABLE ROW LEVEL SECURITY;

-- Policies for practice_configuration
CREATE POLICY "Users can insert their own practice configuration" 
  ON public.practice_configuration FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own practice configuration" 
  ON public.practice_configuration FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice configuration" 
  ON public.practice_configuration FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_practice_configuration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_practice_configuration_modtime
    BEFORE UPDATE ON public.practice_configuration
    FOR EACH ROW
    EXECUTE FUNCTION update_practice_configuration_updated_at();
