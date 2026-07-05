ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;

-- Backfill: copy existing display_name so users who already set a name aren't prompted again.
UPDATE public.profiles
SET first_name = display_name
WHERE first_name IS NULL AND display_name IS NOT NULL AND btrim(display_name) <> '';

-- Update signup trigger to also populate first_name from user metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, first_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'display_name', '')), '')
  );
  RETURN NEW;
END;
$function$;