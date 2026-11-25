import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";



const BOOKING_AMOUNT_PAISE = 9900;

export async function POST(request: Request) {
  try {
    // 1. Authenticate customer
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please log in to continue." },
        { status: 401 }
      );
    }

    // 2. Verify customer role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name, phone")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "customer") {
      return NextResponse.json(
        { error: "Only customer accounts can create bookings." },
        { status: 403 }
      );
    }

    // 3. Validate request
    const body = await request.json();

    const {
      propertyId,
      roomId,
      rateId,
      moveInDate,
      moveOutDate,
      customerName,
      customerPhone,
    } = body;

    if (
      !propertyId ||
      !roomId ||
      !rateId ||
      !moveInDate ||
      !customerName ||
      !customerPhone
    ) {
      return NextResponse.json(
        { error: "Please provide all required booking details." },
        { status: 400 }
      );
    }

    if (
      typeof customerName !== "string" ||
      customerName.trim().length < 2 ||
      customerName.trim().length > 100 ||
      typeof customerPhone !== "string" ||
      !/^[0-9+\-\s()]{7,20}$/.test(customerPhone.trim())
    ) {
      return NextResponse.json(
        { error: "Please provide valid customer details." },
        { status: 400 }
      );
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (
      typeof moveInDate !== "string" ||
      !datePattern.test(moveInDate)
    ) {
      return NextResponse.json(
        { error: "Invalid move-in date." },
        { status: 400 }
      );
    }

    const parsedMoveIn = new Date(`${moveInDate}T00:00:00.000Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (
      Number.isNaN(parsedMoveIn.getTime()) ||
      parsedMoveIn.toISOString().slice(0, 10) !== moveInDate ||
      parsedMoveIn < today
    ) {
      return NextResponse.json(
        { error: "Move-in date must be today or a future date." },
        { status: 400 }
      );
    }

    if (moveOutDate) {
      if (
        typeof moveOutDate !== "string" ||
        !datePattern.test(moveOutDate)
      ) {
        return NextResponse.json(
          { error: "Invalid move-out date." },
          { status: 400 }
        );
      }

      const parsedMoveOut = new Date(`${moveOutDate}T00:00:00.000Z`);

      if (
        Number.isNaN(parsedMoveOut.getTime()) ||
        parsedMoveOut.toISOString().slice(0, 10) !== moveOutDate ||
        parsedMoveOut <= parsedMoveIn
      ) {
        return NextResponse.json(
          { error: "Move-out date must be after move-in date." },
          { status: 400 }
        );
      }
    }

    if (
      typeof propertyId !== "string" ||
      typeof roomId !== "string" ||
      typeof rateId !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid property or room selection." },
        { status: 400 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "Your account does not have an email address." },
        { status: 400 }
      );
    }

    // 4. Use admin client only after customer authorization
    const admin = createAdminClient();

    const { data: property, error: propertyError } = await admin
      .from("pg_properties")
      .select("*")
      .eq("id", propertyId)
      .eq("status", "approved")
      .maybeSingle();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: "This PG is unavailable." },
        { status: 404 }
      );
    }

    const { data: room, error: roomError } = await admin
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .gt("available_beds", 0)
      .maybeSingle();

    if (roomError || !room) {
      return NextResponse.json(
        { error: "This room is no longer available." },
        { status: 409 }
      );
    }

    const { data: rate, error: rateError } = await admin
      .from("room_rates")
      .select("*")
      .eq("id", rateId)
      .eq("room_id", roomId)
      .eq("stay_duration", "monthly")
      .eq("is_available", true)
      .maybeSingle();

    if (rateError || !rate || Number(rate.price) <= 0) {
      return NextResponse.json(
        { error: "The selected monthly rate is unavailable." },
        { status: 409 }
      );
    }

    // 5. Create pending booking using database-derived values
    const fullName =
      customerName.trim() ||
      profile.full_name ||
      "Customer";

    const phone = customerPhone.trim();

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        customer_id: user.id,
        property_id: property.id,
        room_id: room.id,
        room_rate_id: rate.id,
        move_in_date: moveInDate,
        move_out_date: moveOutDate || null,
        sharing_type: room.sharing_type,
        guests: 1,
        customer_name: fullName,
        customer_email: user.email,
        customer_phone: phone,
        monthly_rent: rate.price,
        booking_amount: 99,
        status: "pending_payment",
        property_snapshot: {
          property_name: property.property_name,
          address: property.address,
          locality: property.locality,
          city: property.city,
          state: property.state,
        },
        room_snapshot: {
          room_name: room.room_name,
          sharing_type: room.sharing_type,
          meal_plan: rate.meal_plan,
          monthly_rent: rate.price,
        },
      })
      .select("id, booking_reference")
      .single();

    if (bookingError || !booking) {
      console.error("Booking creation error:", bookingError);

      return NextResponse.json(
        { error: "Unable to create your booking." },
        { status: 500 }
      );
    }

    // 6. Create Razorpay order
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || !keyId.startsWith("rzp_test_") && process.env.NODE_ENV !== "production") {
      await admin
        .from("bookings")
        .update({ status: "expired" })
        .eq("id", booking.id);

      return NextResponse.json(
        { error: "Razorpay configuration is unavailable." },
        { status: 503 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    let order;

    try {
      order = await razorpay.orders.create({
        amount: BOOKING_AMOUNT_PAISE,
        currency: "INR",
        receipt: booking.booking_reference,
        notes: {
          booking_id: booking.id,
          booking_reference: booking.booking_reference,
          project: "BookMyPG",
        },
      });
    } catch (error) {
      await admin
        .from("bookings")
        .update({ status: "expired" })
        .eq("id", booking.id);

      throw error;
    }

    // 7. Save payment record
    const { error: paymentError } = await admin
      .from("booking_payments")
      .insert({
        booking_id: booking.id,
        provider: "razorpay",
        amount_paise: BOOKING_AMOUNT_PAISE,
        currency: "INR",
        status: "created",
        razorpay_order_id: order.id,
      });

    if (paymentError) {
      console.error("Payment record error:", paymentError);

      await admin
        .from("bookings")
        .update({ status: "expired" })
        .eq("id", booking.id);

      return NextResponse.json(
        { error: "Unable to initialize payment. Please try again." },
        { status: 500 }
      );
    }

    // 8. Return only browser-safe order information
    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      bookingReference: booking.booking_reference,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      customer: {
        name: fullName,
        email: user.email,
        phone,
      },
      property: {
        name: property.property_name,
        city: property.city,
      },
      room: {
        name: room.room_name,
        sharingType: room.sharing_type,
      },
      monthlyRent: Number(rate.price),
    });
  } catch (error) {
    console.error("Create booking order error:", error);

    return NextResponse.json(
      { error: "Unable to initialize booking payment." },
      { status: 500 }
    );
  }
}