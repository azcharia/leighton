-- Add location column to defects table
ALTER TABLE public.defects
  ADD COLUMN IF NOT EXISTS location text;
