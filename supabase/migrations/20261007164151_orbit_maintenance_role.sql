-- Maintenance can test the runtime role explicitly without inheriting it.
-- The application role gains no elevated privilege or tenant bypass.
GRANT orbit_backend TO postgres WITH INHERIT FALSE, SET TRUE;
ALTER TABLE public.leads ADD CONSTRAINT leads_tags_array CHECK (jsonb_typeof(tags_json)='array');
