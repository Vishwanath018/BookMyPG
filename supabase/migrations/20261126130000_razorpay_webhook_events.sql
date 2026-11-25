CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id text NOT NULL UNIQUE,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamptz,
    processing_error text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_created
ON public.razorpay_webhook_events(created_at DESC);

ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.razorpay_webhook_events
FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.razorpay_webhook_events TO service_role;