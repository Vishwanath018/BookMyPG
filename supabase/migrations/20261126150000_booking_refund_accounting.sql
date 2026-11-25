CREATE TABLE IF NOT EXISTS public.booking_refunds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_payment_id uuid NOT NULL
        REFERENCES public.booking_payments(id),
    razorpay_refund_id text NOT NULL UNIQUE,
    amount_paise integer NOT NULL CHECK (amount_paise > 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_payments
ADD COLUMN IF NOT EXISTS refunded_amount_paise integer
NOT NULL DEFAULT 0;

ALTER TABLE public.booking_payments
ADD CONSTRAINT booking_payments_refund_amount_check
CHECK (
    refunded_amount_paise >= 0
    AND refunded_amount_paise <= amount_paise
);

ALTER TABLE public.booking_refunds ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.booking_refunds
FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.booking_refunds TO service_role;

CREATE OR REPLACE FUNCTION public.record_booking_refund(
    p_refund_id text,
    p_payment_id text,
    p_amount_paise integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_payment public.booking_payments%ROWTYPE;
    v_total integer;
BEGIN
    IF p_amount_paise <= 0 THEN
        RAISE EXCEPTION 'Invalid refund amount';
    END IF;

    SELECT *
    INTO v_payment
    FROM public.booking_payments
    WHERE razorpay_payment_id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    IF v_payment.status NOT IN ('captured', 'refunded') THEN
        RAISE EXCEPTION 'Payment is not refundable';
    END IF;

    INSERT INTO public.booking_refunds (
        booking_payment_id,
        razorpay_refund_id,
        amount_paise
    )
    VALUES (
        v_payment.id,
        p_refund_id,
        p_amount_paise
    )
    ON CONFLICT (razorpay_refund_id) DO NOTHING;

    SELECT COALESCE(SUM(amount_paise), 0)::integer
    INTO v_total
    FROM public.booking_refunds
    WHERE booking_payment_id = v_payment.id;

    IF v_total > v_payment.amount_paise THEN
        RAISE EXCEPTION 'Refund total exceeds captured payment';
    END IF;

    UPDATE public.booking_payments
    SET
        refunded_amount_paise = v_total,
        status = CASE
            WHEN v_total = amount_paise THEN 'refunded'
            ELSE 'captured'
        END,
        updated_at = now()
    WHERE id = v_payment.id;

    IF v_total = v_payment.amount_paise THEN
        UPDATE public.bookings
        SET status = 'refunded', updated_at = now()
        WHERE id = v_payment.booking_id
          AND status = 'confirmed';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'refunded_amount_paise', v_total,
        'fully_refunded', v_total = v_payment.amount_paise
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_booking_refund(text,text,integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_booking_refund(text,text,integer)
TO service_role;