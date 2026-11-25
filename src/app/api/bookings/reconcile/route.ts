import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Razorpay from "razorpay";

const EXPECTED_AMOUNT = 9900;

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get("authorization");

    if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Payment configuration unavailable." },
        { status: 503 }
      );
    }

    const admin = createAdminClient();

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Only inspect old pending bookings to allow normal checkout callbacks
    // and webhooks a short opportunity to finish first.
    const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const { data: bookings, error } = await admin
      .from("bookings")
      .select("id, customer_id, status, created_at")
      .eq("status", "pending_payment")
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) throw error;

    let checked = 0;
    let recovered = 0;
    let skipped = 0;
    const failures: string[] = [];

    for (const booking of bookings || []) {
      checked++;

      try {
        const { data: payment, error: paymentError } = await admin
          .from("booking_payments")
          .select("id, razorpay_order_id, amount_paise, currency, status")
          .eq("booking_id", booking.id)
          .maybeSingle();

        if (paymentError) throw paymentError;

        if (
          !payment ||
          payment.status !== "created" ||
          !payment.razorpay_order_id ||
          payment.amount_paise !== EXPECTED_AMOUNT ||
          payment.currency !== "INR"
        ) {
          skipped++;
          continue;
        }

        // Query Razorpay directly instead of trusting browser state.
        const response = await fetch(
          `https://api.razorpay.com/v1/orders/${encodeURIComponent(payment.razorpay_order_id)}/payments`,
          {
            headers: {
              Authorization:
                "Basic " +
                Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Unable to retrieve Razorpay order payments.");
        }

        const result = await response.json();

        const capturedPayment = result.items?.find(
          (item: {
            id?: string;
            order_id?: string;
            amount?: number;
            currency?: string;
            status?: string;
          }) =>
            item.order_id === payment.razorpay_order_id &&
            item.amount === EXPECTED_AMOUNT &&
            item.currency === "INR" &&
            item.status === "captured"
        );

        if (!capturedPayment?.id) {
          skipped++;
          continue;
        }

        const { data: finalized, error: finalizeError } = await admin.rpc(
          "finalize_booking_payment",
          {
            p_booking_id: booking.id,
            p_customer_id: booking.customer_id,
            p_order_id: payment.razorpay_order_id,
            p_payment_id: capturedPayment.id,
            p_signature: null,
          }
        );

        if (finalizeError || !finalized?.success) {
          throw finalizeError || new Error("Booking finalization failed.");
        }

        recovered++;
      } catch (error) {
        console.error("Reconciliation failed for booking:", booking.id, error);
        failures.push(booking.id);
      }
    }

    return NextResponse.json({
      success: true,
      checked,
      recovered,
      skipped,
      failed: failures.length,
      failedBookingIds: failures,
    });
  } catch (error) {
    console.error("Payment reconciliation error:", error);

    return NextResponse.json(
      { error: "Payment reconciliation failed." },
      { status: 500 }
    );
  }
}