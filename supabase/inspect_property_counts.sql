SELECT
    COUNT(*) AS total_properties,
    COUNT(*) FILTER (WHERE status = 'approved') AS approved_properties,
    COUNT(*) FILTER (WHERE status = 'draft') AS draft_properties,
    COUNT(*) FILTER (WHERE status = 'pending_review') AS pending_properties
FROM public.pg_properties;
