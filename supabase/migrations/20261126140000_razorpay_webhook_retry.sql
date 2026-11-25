ALTER TABLE public.razorpay_webhook_events
ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;

CREATE OR REPLACE FUNCTION public.claim_razorpay_webhook_event(
    p_event_id text,
    p_event_type text,
    p_payload jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_event public.razorpay_webhook_events%ROWTYPE;
BEGIN
    INSERT INTO public.razorpay_webhook_events (
        event_id,
        event_type,
        payload
    )
    VALUES (
        p_event_id,
        p_event_type,
        p_payload
    )
    ON CONFLICT (event_id) DO NOTHING;

    SELECT *
    INTO v_event
    FROM public.razorpay_webhook_events
    WHERE event_id = p_event_id
    FOR UPDATE;

    IF v_event.processed_at IS NOT NULL THEN
        RETURN 'processed';
    END IF;

    IF v_event.processing_started_at IS NOT NULL
       AND v_event.processing_started_at > now() - interval '5 minutes' THEN
        RETURN 'busy';
    END IF;

    UPDATE public.razorpay_webhook_events
    SET
        processing_started_at = now(),
        processing_error = NULL
    WHERE event_id = p_event_id;

    RETURN 'claimed';
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_razorpay_webhook_event(
    p_event_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.razorpay_webhook_events
    SET
        processed_at = now(),
        processing_started_at = NULL,
        processing_error = NULL
    WHERE event_id = p_event_id
      AND processed_at IS NULL
      AND processing_started_at IS NOT NULL;

    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_razorpay_webhook_event(
    p_event_id text,
    p_error text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.razorpay_webhook_events
    SET
        processing_started_at = NULL,
        processing_error = left(p_error, 2000)
    WHERE event_id = p_event_id
      AND processed_at IS NULL;

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_razorpay_webhook_event(text,text,jsonb)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.complete_razorpay_webhook_event(text)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.release_razorpay_webhook_event(text,text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_razorpay_webhook_event(text,text,jsonb)
TO service_role;

GRANT EXECUTE ON FUNCTION public.complete_razorpay_webhook_event(text)
TO service_role;

GRANT EXECUTE ON FUNCTION public.release_razorpay_webhook_event(text,text)
TO service_role;