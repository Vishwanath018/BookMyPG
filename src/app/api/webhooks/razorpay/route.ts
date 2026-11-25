import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type RazorpayEvent = {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
      };
    };
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
        amount?: number;
        status?: string;
      };
    };
  };
};

function validSignature(body: string, signature: string, secret: string) {
  if (!/^[a-fA-F0-9]{64}$/.test(signature)) return false;

  const expected = createHmac("sha256", secret).update(body).digest();
  const received = Buffer.from(signature, "hex");

  return (
    received.length === expected.length &&
    timingSafeEqual(expected, received)
  );
}

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Webhook configuration unavailable." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";
  const eventId = request.headers.get("x-razorpay-event-id");

  if (!validSignature(rawBody, signature, secret)) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 }
    );
  }

  if (!eventId) {
    return NextResponse.json(
      { error: "Missing Razorpay event ID." },
      { status: 400 }
    );
  }

  let event: RazorpayEvent;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook payload." },
      { status: 400 }
    );
  }

  if (!event.event) {
    return NextResponse.json(
      { error: "Missing event type." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: claim, error: claimError } = await admin.rpc(
    "claim_razorpay_webhook_event",
    {
      p_event_id: eventId,
      p_event_type: event.event,
      p_payload: event,
    }
  );

  if (claimError) {
    console.error("Webhook claim failed:", claimError);
    return NextResponse.json(
      { error: "Unable to claim webhook event." },
      { status: 500 }
    );
  }

  if (claim === "processed") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (claim === "busy") {
    return NextResponse.json(
      { error: "Event is currently being processed." },
      { status: 503 }
    );
  }

  if (claim !== "claimed") {
    return NextResponse.json(
      { error: "Unable to claim webhook event." },
      { status: 500 }
    );
  }

  try {
    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;

      if (
        !payment?.id ||
        !payment.order_id ||
        payment.amount !== 9900 ||
        payment.currency !== "INR" ||
        payment.status !== "captured"
      ) {
        throw new Error("Captured payment details are invalid.");
      }

      const { data: paymentRecord, error: lookupError } = await admin
        .from("booking_payments")
        .select("booking_id")
        .eq("razorpay_order_id", payment.order_id)
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (!paymentRecord) throw new Error("Booking payment not found.");

      const { data: booking, error: bookingError } = await admin
        .from("bookings")
        .select("customer_id")
        .eq("id", paymentRecord.booking_id)
        .maybeSingle();

      if (bookingError) throw bookingError;
      if (!booking) throw new Error("Booking not found.");

      const { data: result, error: finalizeError } = await admin.rpc(
        "finalize_booking_payment",
        {
          p_booking_id: paymentRecord.booking_id,
          p_customer_id: booking.customer_id,
          p_order_id: payment.order_id,
          p_payment_id: payment.id,
          p_signature: null,
        }
      );

      if (finalizeError || !result?.success) {
        throw finalizeError || new Error("Booking finalization failed.");
      }
    }

    if (event.event === "payment.failed") {
      const payment = event.payload?.payment?.entity;

      if (!payment?.id || !payment.order_id) {
        throw new Error("Failed payment details are missing.");
      }

      // A captured payment can never be downgraded to failed.
      // A failed attempt does not necessarily mean the entire order failed.
      // Keep the booking payment eligible for a later successful attempt.
      const { error } = await admin
        .from("booking_payments")
        .update({
          failure_reason: "A payment attempt failed according to Razorpay.",
          updated_at: new Date().toISOString(),
        })
        .eq("razorpay_order_id", payment.order_id)
        .eq("status", "created");

      if (error) throw error;
    }

    if (event.event === "refund.processed") {
      const refund = event.payload?.refund?.entity;

      if (
        !refund?.id ||
        !refund.payment_id ||
        typeof refund.amount !== "number" ||
        refund.status !== "processed"
      ) {
        throw new Error("Processed refund details are invalid.");
      }

      const { data: result, error } = await admin.rpc(
        "record_booking_refund",
        {
          p_refund_id: refund.id,
          p_payment_id: refund.payment_id,
          p_amount_paise: refund.amount,
        }
      );

      if (error || !result?.success) {
        throw error || new Error("Refund accounting failed.");
      }
    }
    const { data: completed, error: completeError } = await admin.rpc(
      "complete_razorpay_webhook_event",
      { p_event_id: eventId }
    );

    if (completeError || !completed) {
      throw completeError || new Error("Unable to complete webhook event.");
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown webhook error";

    console.error("Webhook processing failed:", message);

    const { error: releaseError } = await admin.rpc(
      "release_razorpay_webhook_event",
      {
        p_event_id: eventId,
        p_error: message,
      }
    );

    if (releaseError) {
      console.error("Webhook event release failed:", releaseError);
    }

    return NextResponse.json(
      { error: "Webhook processing failed. Razorpay may retry." },
      { status: 500 }
    );
  }
}