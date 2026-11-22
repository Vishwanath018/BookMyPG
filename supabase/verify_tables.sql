SELECT
    t.table_name,
    c.relrowsecurity AS rls_enabled
FROM information_schema.tables t
JOIN pg_class c
    ON c.relname = t.table_name
JOIN pg_namespace n
    ON n.oid = c.relnamespace
WHERE t.table_schema = 'public'
AND n.nspname = 'public'
AND t.table_name IN (
    'profiles',
    'pg_properties',
    'property_images',
    'rooms',
    'room_rates',
    'owner_enquiries'
)
ORDER BY t.table_name;
