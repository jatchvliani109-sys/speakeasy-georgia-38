ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';
ALTER TABLE public.mistakes ADD COLUMN IF NOT EXISTS tag text NOT NULL DEFAULT 'grammar';