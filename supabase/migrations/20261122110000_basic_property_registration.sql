-- BookMyPG basic property registration

-- 1. Public image bucket (uploads restricted by RLS)
INSERT INTO storage.buckets (
    id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
    'pg-property-images',
    'pg-property-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Owners can upload only into their own property folders.
CREATE POLICY "Owners upload property images"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'pg-property-images'
    AND EXISTS (
        SELECT 1
        FROM public.pg_properties p
        WHERE p.id::text = (storage.foldername(name))[2]
          AND p.owner_id = auth.uid()
          AND (storage.foldername(name))[1] = auth.uid()::text
    )
);

CREATE POLICY "Owners delete property images"
ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'pg-property-images'
    AND EXISTS (
        SELECT 1
        FROM public.pg_properties p
        WHERE p.id::text = (storage.foldername(name))[2]
          AND p.owner_id = auth.uid()
          AND (storage.foldername(name))[1] = auth.uid()::text
    )
);

-- 3. Allow only this controlled activation operation through the
-- existing moderation protection trigger.
CREATE OR REPLACE FUNCTION public.protect_property_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF (
        NEW.status IS DISTINCT FROM OLD.status
        OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
    )
    AND COALESCE(auth.role(), '') <> 'service_role'
    AND COALESCE(
        current_setting('app.allow_property_activation', true),
        'false'
    ) <> 'true'
    THEN
        RAISE EXCEPTION 'Property moderation fields cannot be changed directly.';
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Secure owner-only activation function.
CREATE OR REPLACE FUNCTION public.activate_pg_property(p_property_id uuid)
RETURNS public.pg_properties
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_property public.pg_properties;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT *
    INTO v_property
    FROM public.pg_properties
    WHERE id = p_property_id
      AND owner_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Property not found or access denied.';
    END IF;

    IF v_property.status = 'approved' THEN
        RETURN v_property;
    END IF;

    IF v_property.status <> 'draft' THEN
        RAISE EXCEPTION 'Only draft properties can be activated.';
    END IF;

    IF
        length(trim(v_property.property_name)) = 0
        OR length(trim(v_property.address)) = 0
        OR length(trim(v_property.locality)) = 0
        OR length(trim(v_property.city)) = 0
        OR length(trim(v_property.state)) = 0
        OR v_property.latitude IS NULL
        OR v_property.longitude IS NULL
    THEN
        RAISE EXCEPTION 'Complete property details and GPS location first.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.property_images
        WHERE property_id = p_property_id
    ) THEN
        RAISE EXCEPTION 'Upload at least one property photo first.';
    END IF;

    PERFORM pg_catalog.set_config(
        'app.allow_property_activation',
        'true',
        true
    );

    UPDATE public.pg_properties
    SET status = 'approved'
    WHERE id = p_property_id
    RETURNING * INTO v_property;

    RETURN v_property;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_pg_property(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_pg_property(uuid) TO authenticated;
