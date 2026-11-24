-- BookMyPG: Room image gallery

CREATE TABLE IF NOT EXISTS public.room_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.pg_properties(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_images_room_id
ON public.room_images(room_id);

ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners view room images" ON public.room_images;
CREATE POLICY "Owners view room images"
ON public.room_images FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.rooms r
        JOIN public.pg_properties p ON p.id = r.property_id
        WHERE r.id = room_images.room_id
          AND p.id = room_images.property_id
          AND p.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Owners insert room images" ON public.room_images;
CREATE POLICY "Owners insert room images"
ON public.room_images FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.rooms r
        JOIN public.pg_properties p ON p.id = r.property_id
        WHERE r.id = room_images.room_id
          AND p.id = room_images.property_id
          AND p.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Owners delete room images" ON public.room_images;
CREATE POLICY "Owners delete room images"
ON public.room_images FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.rooms r
        JOIN public.pg_properties p ON p.id = r.property_id
        WHERE r.id = room_images.room_id
          AND p.id = room_images.property_id
          AND p.owner_id = auth.uid()
    )
);

GRANT SELECT, INSERT, DELETE ON public.room_images TO authenticated;
