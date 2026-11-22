-- Migration: Enable Row Level Security (RLS) on projects and prompts tables
-- Date: 2026-11-22

-- 1. Ensure projects table has user_id default set to auth.uid()
ALTER TABLE IF EXISTS public.projects 
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. Configure replica identity for Realtime change notifications
-- This ensures full row state is available when Realtime broadcasts UPDATE events to the client
ALTER TABLE IF EXISTS public.prompts REPLICA IDENTITY FULL;

-- 3. Enable RLS on both tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- POLICIES: public.projects
-- ---------------------------------------------------------

-- Drop old policies if they exist to avoid duplication errors
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;

-- Allow authenticated users to view only their own projects
CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to create projects assigned to them
CREATE POLICY "Users can create their own projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own projects
CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to update their own projects (e.g., project name/metadata)
CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------
-- POLICIES: public.prompts
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Users can view prompts for their projects" ON public.prompts;
DROP POLICY IF EXISTS "Users can insert prompts into their projects" ON public.prompts;
DROP POLICY IF EXISTS "Users can update prompts of their projects" ON public.prompts;
DROP POLICY IF EXISTS "Users can delete prompts of their projects" ON public.prompts;

-- Allow authenticated users to view prompts if they own the parent project
CREATE POLICY "Users can view prompts for their projects"
ON public.prompts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.project_id = prompts.project_id
      AND projects.user_id = auth.uid()
  )
);

-- Allow authenticated users to insert prompts into their projects
CREATE POLICY "Users can insert prompts into their projects"
ON public.prompts FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.project_id = prompts.project_id
      AND projects.user_id = auth.uid()
  )
);

-- Allow authenticated users to update prompts within their projects
CREATE POLICY "Users can update prompts of their projects"
ON public.prompts FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.project_id = prompts.project_id
      AND projects.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.project_id = prompts.project_id
      AND projects.user_id = auth.uid()
  )
);

-- Allow authenticated users to delete prompts when clearing their project
CREATE POLICY "Users can delete prompts of their projects"
ON public.prompts FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.project_id = prompts.project_id
      AND projects.user_id = auth.uid()
  )
);
