-- Variant A (per project bucket) policies template
-- Note: Supabase does not support dynamic per-bucket policy creation at runtime via SQL here for unknown set of buckets.
-- Recommended approach: keep buckets private and perform access with service role on server-side APIs only.

-- As a safety, deny public access by default (buckets are private on creation).









