SELECT
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE 'Customers can view%'
ORDER BY tablename;
