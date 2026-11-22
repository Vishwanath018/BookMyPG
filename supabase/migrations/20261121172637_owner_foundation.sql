-- =========================================================
-- BOOKMYPG: COMPLETE PG OWNER DATABASE FOUNDATION
-- =========================================================

-- 1. PROFILES
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT UNIQUE,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'customer'
        CHECK (role IN ('customer', 'owner', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);


-- 2. PG PROPERTIES
CREATE TABLE public.pg_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_name TEXT NOT NULL,
    description TEXT,
    property_type TEXT NOT NULL
        CHECK (property_type IN ('boys', 'girls', 'co_living')),
    address TEXT NOT NULL,
    locality TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode VARCHAR(10),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    contact_phone TEXT,
    food_available BOOLEAN NOT NULL DEFAULT FALSE,
    food_type TEXT,
    amenities TEXT[] NOT NULL DEFAULT '{}',
    house_rules TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'suspended')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pg_properties_owner ON public.pg_properties(owner_id);
CREATE INDEX idx_pg_properties_city ON public.pg_properties(city);
CREATE INDEX idx_pg_properties_status ON public.pg_properties(status);


-- 3. PROPERTY IMAGES
CREATE TABLE public.property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.pg_properties(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    image_type TEXT NOT NULL DEFAULT 'gallery'
        CHECK (image_type IN ('cover', 'gallery', 'room')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_images_property ON public.property_images(property_id);


-- 4. ROOMS
-- Each sharing type is a separate room configuration.
-- Supported: 1, 2, 3, 4, 5 and 6 sharing.

CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.pg_properties(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    sharing_type INTEGER NOT NULL CHECK (sharing_type BETWEEN 1 AND 6),
    total_beds INTEGER NOT NULL CHECK (total_beds > 0),
    available_beds INTEGER NOT NULL CHECK (
        available_beds >= 0 AND available_beds <= total_beds
    ),
    amenities TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rooms_property ON public.rooms(property_id);


-- 5. ROOM RATES
-- Each room can have multiple stay durations and food options.
-- An unavailable option does not require a price.

CREATE TABLE public.room_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,

    stay_duration TEXT NOT NULL CHECK (
        stay_duration IN ('one_day', 'two_days', 'one_week', 'monthly')
    ),

    meal_plan TEXT NOT NULL CHECK (
        meal_plan IN ('with_food', 'without_food')
    ),

    price NUMERIC(10,2),

    is_available BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_room_rate_price CHECK (
        price IS NULL OR price >= 0
    ),

    CONSTRAINT available_rate_requires_price CHECK (
        NOT is_available OR price > 0
    ),

    UNIQUE (room_id, stay_duration, meal_plan)
);

CREATE INDEX idx_room_rates_room ON public.room_rates(room_id);
CREATE INDEX idx_room_rates_availability ON public.room_rates(is_available);


-- 6. OWNER ENQUIRIES
CREATE TABLE public.owner_enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.pg_properties(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'contacted', 'resolved', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_owner_enquiries_property ON public.owner_enquiries(property_id);
CREATE INDEX idx_owner_enquiries_status ON public.owner_enquiries(status);


-- =========================================================
-- AUTOMATIC UPDATED_AT
-- =========================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER properties_updated_at
BEFORE UPDATE ON public.pg_properties
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER room_rates_updated_at
BEFORE UPDATE ON public.room_rates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER enquiries_updated_at
BEFORE UPDATE ON public.owner_enquiries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =========================================================
-- AUTOMATIC PROFILE CREATION
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    requested_role TEXT;
BEGIN
    requested_role :=
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'customer');

    IF requested_role NOT IN ('customer', 'owner') THEN
        requested_role := 'customer';
    END IF;

    INSERT INTO public.profiles (
        id, full_name, phone, avatar_url, role
    )
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data ->> 'full_name',
            NEW.raw_user_meta_data ->> 'name',
            ''
        ),
        NEW.phone,
        NEW.raw_user_meta_data ->> 'avatar_url',
        requested_role
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =========================================================
-- PROTECT PROFILE ROLE
-- =========================================================

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND COALESCE(auth.role(), '') <> 'service_role' THEN
        RAISE EXCEPTION 'Account role cannot be changed directly.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_profile_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();


-- =========================================================
-- PROTECT PROPERTY MODERATION
-- =========================================================

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
    AND COALESCE(auth.role(), '') <> 'service_role' THEN
        RAISE EXCEPTION 'Property moderation fields cannot be changed directly.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_property_moderation_change
BEFORE UPDATE ON public.pg_properties
FOR EACH ROW EXECUTE FUNCTION public.protect_property_moderation();


-- =========================================================
-- ENABLE RLS
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_enquiries ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- PROFILE POLICIES
-- =========================================================

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));


-- =========================================================
-- PROPERTY POLICIES
-- =========================================================

CREATE POLICY "Owners can view own properties"
ON public.pg_properties FOR SELECT TO authenticated
USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "Owners can create properties"
ON public.pg_properties FOR INSERT TO authenticated
WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND status = 'draft'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'owner'
    )
);

CREATE POLICY "Owners can update own properties"
ON public.pg_properties FOR UPDATE TO authenticated
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "Owners can delete own draft properties"
ON public.pg_properties FOR DELETE TO authenticated
USING (
    owner_id = (SELECT auth.uid()) AND status = 'draft'
);


-- =========================================================
-- PROPERTY IMAGE POLICIES
-- =========================================================

CREATE POLICY "Owners can view own property images"
ON public.property_images FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pg_properties p
        WHERE p.id = property_id AND p.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can add property images"
ON public.property_images FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pg_properties p
        WHERE p.id = property_id AND p.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can delete property images"
ON public.property_images FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pg_properties p
        WHERE p.id = property_id AND p.owner_id = (SELECT auth.uid())
    )
);


-- =========================================================
-- ROOM POLICIES
-- =========================================================

CREATE POLICY "Owners can view own rooms"
ON public.rooms FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pg_properties p
        WHERE p.id = property_id AND p.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can add rooms"
ON public.rooms FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pg_properties p
        WHERE p.id = property_id AND p.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can update own rooms"
ON public.rooms FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pg_properties p
        WHERE p.id = property_id AND p.owner_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pg_properties p
        WHERE p.id = property_id AND p.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can delete own rooms"
ON public.rooms FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pg_properties p
        WHERE p.id = property_id AND p.owner_id = (SELECT auth.uid())
    )
);


-- =========================================================
-- ROOM RATE POLICIES
-- =========================================================

CREATE POLICY "Owners can view own room rates"
ON public.room_rates FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.rooms r
        JOIN public.pg_properties p ON p.id = r.property_id
        WHERE r.id = room_id AND p.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can add room rates"
ON public.room_rates FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.rooms r
        JOIN public.pg_properties p ON p.id = r.property_id
        WHERE r.id = room_id AND p.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can update own room rates"
ON public.room_rates FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.rooms r
        JOIN public.pg_properties p ON p.id = r.property_id
        WHERE r.id = room_id AND p.owner_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.rooms r
        JOIN public.pg_properties p ON p.id = r.property_id
        WHERE r.id = room_id AND p.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can delete own room rates"
ON public.room_rates FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.rooms r
        JOIN public.pg_properties p ON p.id = r.property_id
        WHERE r.id = room_id AND p.owner_id = (SELECT auth.uid())
    )
);


-- =========================================================
-- ENQUIRY POLICIES
-- =========================================================

CREATE POLICY "Owners can view own enquiries"
ON public.owner_enquiries FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pg_properties p
        WHERE p.id = property_id AND p.owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Owners can update own enquiries"
ON public.owner_enquiries FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.pg_properties p
        WHERE p.id = property_id AND p.owner_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pg_properties p
        WHERE p.id = property_id AND p.owner_id = (SELECT auth.uid())
    )
);


-- =========================================================
-- TABLE PERMISSIONS
-- =========================================================

GRANT SELECT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.pg_properties TO authenticated;

GRANT SELECT, INSERT, DELETE
ON public.property_images TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.rooms TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.room_rates TO authenticated;

GRANT SELECT, UPDATE
ON public.owner_enquiries TO authenticated;

