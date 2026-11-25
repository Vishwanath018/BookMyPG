-- BookMyPG: Booking and payment foundation

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_reference TEXT NOT NULL UNIQUE
        DEFAULT (
            'BMPG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
        ),

    customer_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE RESTRICT,

    property_id UUID NOT NULL
        REFERENCES public.pg_properties(id) ON DELETE RESTRICT,

    room_id UUID NOT NULL
        REFERENCES public.rooms(id) ON DELETE RESTRICT,

    room_rate_id UUID
        REFERENCES public.room_rates(id) ON DELETE SET NULL,

    move_in_date DATE NOT NULL,
    move_out_date DATE,

    sharing_type INTEGER NOT NULL CHECK (sharing_type BETWEEN 1 AND 6),
    guests INTEGER NOT NULL DEFAULT 1 CHECK (guests > 0),

    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,

    monthly_rent NUMERIC(10,2) NOT NULL CHECK (monthly_rent > 0),
    booking_amount NUMERIC(10,2) NOT NULL DEFAULT 99.00
        CHECK (booking_amount = 99.00),

    status TEXT NOT NULL DEFAULT 'pending_payment'
        CHECK (status IN (
            'pending_payment',
            'confirmed',
            'cancelled',
            'expired',
            'refunded'
        )),

    property_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    room_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_booking_dates CHECK (
        move_out_date IS NULL OR move_out_date > move_in_date
    )
);

CREATE TABLE IF NOT EXISTS public.booking_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID NOT NULL
        REFERENCES public.bookings(id) ON DELETE RESTRICT,

    provider TEXT NOT NULL DEFAULT 'razorpay'
        CHECK (provider = 'razorpay'),

    amount_paise INTEGER NOT NULL DEFAULT 9900
        CHECK (amount_paise = 9900),

    currency TEXT NOT NULL DEFAULT 'INR'
        CHECK (currency = 'INR'),

    status TEXT NOT NULL DEFAULT 'created'
        CHECK (status IN (
            'created',
            'authorized',
            'captured',
            'failed',
            'refunded'
        )),

    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,

    failure_reason TEXT,
    verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer
    ON public.bookings(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_property
    ON public.bookings(property_id);

CREATE INDEX IF NOT EXISTS idx_booking_payments_booking
    ON public.booking_payments(booking_id);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their own bookings"
    ON public.bookings;

CREATE POLICY "Customers can view their own bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (customer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Customers can view their own booking payments"
    ON public.booking_payments;

CREATE POLICY "Customers can view their own booking payments"
    ON public.booking_payments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.bookings b
            WHERE b.id = booking_payments.booking_id
              AND b.customer_id = (SELECT auth.uid())
        )
    );

-- Writes will be performed by authenticated server-side API routes
-- using the Supabase service-role client after authorization checks.
