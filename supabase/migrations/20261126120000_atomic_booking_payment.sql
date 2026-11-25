CREATE OR REPLACE FUNCTION public.finalize_booking_payment(
    p_booking_id uuid,
    p_customer_id uuid,
    p_order_id text,
    p_payment_id text,
    p_signature text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_booking record;
    v_payment record;
BEGIN
    SELECT id, customer_id, status, booking_reference
    INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND OR v_booking.customer_id <> p_customer_id THEN
        RAISE EXCEPTION 'Booking not found or unauthorized';
    END IF;

    SELECT id, status, razorpay_order_id, razorpay_payment_id,
           amount_paise, currency
    INTO v_payment
    FROM public.booking_payments
    WHERE booking_id = p_booking_id
      AND razorpay_order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment record not found';
    END IF;

    -- Safe retry: the same payment was already finalized.
    IF v_booking.status = 'confirmed'
       AND v_payment.status = 'captured'
       AND v_payment.razorpay_payment_id = p_payment_id THEN
        RETURN jsonb_build_object(
            'success', true,
            'booking_id', v_booking.id,
            'booking_reference', v_booking.booking_reference,
            'status', 'confirmed'
        );
    END IF;

    IF v_booking.status <> 'pending_payment'
       OR v_payment.status <> 'created' THEN
        RAISE EXCEPTION 'Booking or payment is not eligible for confirmation';
    END IF;

    IF v_payment.amount_paise <> 9900
       OR v_payment.currency <> 'INR' THEN
        RAISE EXCEPTION 'Payment amount or currency mismatch';
    END IF;

    UPDATE public.booking_payments
    SET
        status = 'captured',
        razorpay_payment_id = p_payment_id,
        razorpay_signature = p_signature,
        verified_at = now(),
        updated_at = now()
    WHERE id = v_payment.id;

    UPDATE public.bookings
    SET
        status = 'confirmed',
        updated_at = now()
    WHERE id = v_booking.id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking.id,
        'booking_reference', v_booking.booking_reference,
        'status', 'confirmed'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_booking_payment(
    uuid, uuid, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.finalize_booking_payment(
    uuid, uuid, text, text, text
) TO service_role;