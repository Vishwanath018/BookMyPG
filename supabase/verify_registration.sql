SELECT
    EXISTS (
        SELECT 1 FROM storage.buckets
        WHERE id = 'pg-property-images'
    ) AS image_bucket_created,
    EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'activate_pg_property'
          AND pronamespace = 'public'::regnamespace
    ) AS activation_function_created,
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Owners upload property images'
    ) AS upload_policy_created;
