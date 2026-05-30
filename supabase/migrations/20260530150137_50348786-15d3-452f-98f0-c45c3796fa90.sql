
-- Storage bucket for resume files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Each user can manage files only in their own folder: resumes/<uid>/...
DROP POLICY IF EXISTS "resumes own select" ON storage.objects;
DROP POLICY IF EXISTS "resumes own insert" ON storage.objects;
DROP POLICY IF EXISTS "resumes own update" ON storage.objects;
DROP POLICY IF EXISTS "resumes own delete" ON storage.objects;

CREATE POLICY "resumes own select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "resumes own insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "resumes own update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "resumes own delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add storage_path column
ALTER TABLE public.business_resumes
ADD COLUMN IF NOT EXISTS storage_path text;
