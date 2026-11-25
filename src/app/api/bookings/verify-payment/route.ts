import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const EXPECTED_AMOUNT = 9900;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (
      typeof bookingId !== "string" ||
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string" ||
      !/^[a-fA-F0-9]{64}$/.test(razorpay_signature)
    ) {
      return NextResponse.json(
        { error: "Invalid payment verification details." },
        { status: 400 }
      );
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const keyId = process.env.RAZORPAY_KEY_ID;

    if (!secret || !keyId) {
      return NextResponse.json(
        { error: "Payment configuration unavailable." },
        { status: 503 }
      );
    }

    // Verify Razorpay checkout signature.
    const expectedSignature = createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest();

    const receivedSignature = Buffer.from(razorpay_signature, "hex");

    if (
      receivedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(expectedSignature, receivedSignature)
    ) {
      return NextResponse.json(
        { error: "Payment signature verification failed." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, customer_id, status, booking_reference")
      .eq("id", bookingId)
      .eq("customer_id", user.id)
      .maybeSingle();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    const { data: payment, error: paymentError } = await admin
      .from("booking_payments")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("razorpay_order_id", razorpay_order_id)
      .maybeSingle();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: "Payment record not found." },
        { status: 404 }
      );
    }

    // Idempotent response for an already verified payment.
    if (
      booking.status === "confirmed" &&
      payment.status === "captured" &&
      payment.razorpay_payment_id === razorpay_payment_id
    ) {
      return NextResponse.json({
        success: true,
        bookingId,
        bookingReference: booking.booking_reference,
        status: "confirmed",
      });
    }

    if (booking.status !== "pending_payment" || payment.status !== "created") {
      return NextResponse.json(
        { error: "This booking cannot accept another payment." },
        { status: 409 }
      );
    }

    if (
      payment.amount_paise !== EXPECTED_AMOUNT ||
      payment.currency !== "INR"
    ) {
      return NextResponse.json(
        { error: "Stored payment amount or currency is invalid." },
        { status: 409 }
      );
    }

    // Independently verify payment status with Razorpay.
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: secret,
    });

    const razorpayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      razorpayPayment.order_id !== razorpay_order_id ||
      razorpayPayment.amount !== EXPECTED_AMOUNT ||
      razorpayPayment.currency !== "INR" ||
      razorpayPayment.status !== "captured"
    ) {
      return NextResponse.json(
        {
          error: "Payment is not captured or payment details do not match.",
          paymentStatus: razorpayPayment.status,
        },
        { status: 409 }
      );
    }

    // Atomically update payment and booking in one database transaction.
    const { data: result, error: finalizeError } = await admin.rpc(
      "finalize_booking_payment",
      {
        p_booking_id: bookingId,
        p_customer_id: user.id,
        p_order_id: razorpay_order_id,
        p_payment_id: razorpay_payment_id,
        p_signature: razorpay_signature,
      }
    );

    if (finalizeError || !result?.success) {
      console.error("Atomic booking finalization failed:", finalizeError);

      return NextResponse.json(
        {
          error: "Payment was captured, but booking finalization needs attention. Please contact support.",
          paymentId: razorpay_payment_id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bookingId: result.booking_id,
      bookingReference: result.booking_reference,
      status: result.status,
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    return NextResponse.json(
      {
        error: "Unable to verify payment. Please contact support if money was deducted.",
      },
      { status: 500 }
    );
  }
}