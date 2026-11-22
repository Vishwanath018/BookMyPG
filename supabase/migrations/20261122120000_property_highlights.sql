ALTER TABLE public.pg_properties
ADD COLUMN IF NOT EXISTS property_highlights TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.pg_properties.property_highlights
IS 'Selected marketing highlights describing the PG property';
