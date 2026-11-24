-- =========================================================
-- BOOKMYPG: PUBLIC CUSTOMER PROPERTY DISCOVERY ACCESS
-- Customers can READ approved listings only.
-- Owners retain their existing management policies.
-- =========================================================

-- 1. Approved properties are publicly discoverable.
DROP POLICY IF EXISTS "Customers can view approved properties"
ON public.pg_properties;

CREATE POLICY "Customers can view approved properties"
ON public.pg_properties
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

-- 2. Images belonging to approved properties are public.
DROP POLICY IF EXISTS "Customers can view approved property images"
ON public.property_images;

CREATE POLICY "Customers can view approved property images"
ON public.property_images
FOR SELECT
TO anon, authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.pg_properties p
        WHERE p.id = property_id
          AND p.status = 'approved'
    )
);

-- 3. Active rooms of approved properties are discoverable.
DROP POLICY IF EXISTS "Customers can view active rooms"
ON public.rooms;

CREATE POLICY "Customers can view active rooms"
ON public.rooms
FOR SELECT
TO anon, authenticated
USING (
    is_active = TRUE
    AND EXISTS (
        SELECT 1
        FROM public.pg_properties p
        WHERE p.id = property_id
          AND p.status = 'approved'
    )
);

-- 4. Only available monthly rates of active rooms
--    belonging to approved properties are public.
DROP POLICY IF EXISTS "Customers can view available monthly rates"
ON public.room_rates;

CREATE POLICY "Customers can view available monthly rates"
ON public.room_rates
FOR SELECT
TO anon, authenticated
USING (
    is_available = TRUE
    AND stay_duration = 'monthly'
    AND EXISTS (
        SELECT 1
        FROM public.rooms r
        JOIN public.pg_properties p ON p.id = r.property_id
        WHERE r.id = room_id
          AND r.is_active = TRUE
          AND p.status = 'approved'
    )
);

-- 5. Explicit read permissions.
GRANT SELECT ON public.pg_properties TO anon, authenticated;
GRANT SELECT ON public.property_images TO anon, authenticated;
GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT SELECT ON public.room_rates TO anon, authenticated;

-- 6. Search indexes.
CREATE INDEX IF NOT EXISTS idx_pg_properties_public_search
ON public.pg_properties (city, property_type)
WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_rooms_active_sharing
ON public.rooms (sharing_type, property_id)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_room_rates_monthly_search
ON public.room_rates (price, room_id)
WHERE is_available = TRUE
  AND stay_duration = 'monthly';
