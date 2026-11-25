import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to view this booking." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("*")
      .eq("id", id)
      .eq("customer_id", user.id)
      .maybeSingle();

    if (bookingError) throw bookingError;

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    const { data: payment, error: paymentError } = await admin
      .from("booking_payments")
      .select("status, amount_paise, currency, payment_id, verified_at")
      .eq("booking_id", booking.id)
      .maybeSingle();

    if (paymentError) throw paymentError;

    return NextResponse.json({
      booking: {
        id: booking.id,
        reference: booking.booking_reference,
        status: booking.status,
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        customerPhone: booking.customer_phone,
        moveInDate: booking.move_in_date,
        moveOutDate: booking.move_out_date,
        sharingType: booking.sharing_type,
        guests: booking.guests,
        monthlyRent: booking.monthly_rent,
        bookingAmount: booking.booking_amount,
        property: booking.property_snapshot,
        room: booking.room_snapshot,
        createdAt: booking.created_at,
      },
      payment: payment
        ? {
            status: payment.status,
            amountPaise: payment.amount_paise,
            currency: payment.currency,
            paymentId: payment.payment_id,
            verifiedAt: payment.verified_at,
          }
        : null,
    });
  } catch (error) {
    console.error("Booking confirmation retrieval failed:", error);
    return NextResponse.json(
      { error: "Unable to retrieve booking details." },
      { status: 500 }
    );
  }
}