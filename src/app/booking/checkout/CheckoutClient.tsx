"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import "./checkout.css";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

type Property = {
  id: string;
  property_name: string;
  address: string;
  locality: string;
  city: string;
  state: string;
};

type Room = {
  id: string;
  room_name: string;
  sharing_type: number;
  available_beds: number;
};

type Rate = {
  id: string;
  price: number;
  meal_plan: string;
};

export default function CheckoutClient() {
  const params = useSearchParams();
  const router = useRouter();

  const propertyId = params.get("propertyId") || "";
  const roomId = params.get("roomId") || "";
  const rateId = params.get("rateId") || "";

  const [property, setProperty] = useState<Property | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [rate, setRate] = useState<Rate | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [moveOut, setMoveOut] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCheckout() {
      try {
        if (!propertyId || !roomId || !rateId) {
          throw new Error("Booking selection is incomplete. Please select a PG again.");
        }

        const supabase = createClient();

        const { data: auth } = await supabase.auth.getUser();

        if (!auth.user) {
          const next = `/booking/checkout?propertyId=${encodeURIComponent(propertyId)}&roomId=${encodeURIComponent(roomId)}&rateId=${encodeURIComponent(rateId)}`;
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, full_name, phone")
          .eq("id", auth.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profile?.role !== "customer") {
          throw new Error("Please use a customer account to book a PG.");
        }

        const [propertyResult, roomResult, rateResult] = await Promise.all([
          supabase.from("pg_properties").select("*")
            .eq("id", propertyId).eq("status", "approved").maybeSingle(),
          supabase.from("rooms").select("*")
            .eq("id", roomId).eq("property_id", propertyId)
            .eq("is_active", true).gt("available_beds", 0).maybeSingle(),
          supabase.from("room_rates").select("*")
            .eq("id", rateId).eq("room_id", roomId)
            .eq("stay_duration", "monthly").eq("is_available", true).maybeSingle()
        ]);

        if (propertyResult.error) throw propertyResult.error;
        if (roomResult.error) throw roomResult.error;
        if (rateResult.error) throw rateResult.error;

        if (!propertyResult.data || !roomResult.data || !rateResult.data) {
          throw new Error("This PG, room or monthly rate is no longer available.");
        }

        if (!active) return;

        setProperty(propertyResult.data as Property);
        setRoom(roomResult.data as Room);
        setRate(rateResult.data as Rate);
        setName(profile?.full_name || "");
        setPhone(profile?.phone || "");
        setEmail(auth.user.email || "");
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unable to load checkout.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCheckout();
    return () => { active = false; };
  }, [propertyId, roomId, rateId, router]);

  async function payNow() {
    setError("");

    if (!property || !room || !rate) return;

    if (!name.trim() || !phone.trim() || !moveIn) {
      setError("Please complete your name, mobile number and move-in date.");
      return;
    }

    if (moveOut && moveOut <= moveIn) {
      setError("Move-out date must be after move-in date.");
      return;
    }

    setPaying(true);

    try {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;

      await new Promise<void>((resolve, reject) => {
        if (window.Razorpay) return resolve();
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
        document.body.appendChild(script);
      });

      const response = await fetch("/api/bookings/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          roomId,
          rateId,
          moveInDate: moveIn,
          moveOutDate: moveOut || null,
          customerName: name,
          customerPhone: phone
        })
      });

      const order = await response.json();

      if (!response.ok) {
        throw new Error(order.error || "Unable to create payment order.");
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "BookMyPG",
        description: `Booking payment for ${property.property_name}`,
        order_id: order.orderId,
        prefill: {
          name,
          email,
          contact: phone
        },
        notes: {
          booking_reference: order.bookingReference
        },
        theme: { color: "#e31837" },
        modal: {
          ondismiss: () => setPaying(false)
        },
        handler: async (payment: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verification = await fetch("/api/bookings/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingId: order.bookingId,
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_signature: payment.razorpay_signature
              })
            });

            const result = await verification.json();

            if (!verification.ok) {
              throw new Error(result.error || "Payment verification failed.");
            }

            router.push(`/booking/confirmation/${encodeURIComponent(order.bookingId)}`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Payment verification failed. Contact support with your payment ID.");
            setPaying(false);
          }
        }
      });

      checkout.open();
      setPaying(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start payment.");
      setPaying(false);
    }
  }

  if (loading) return <main className="checkout-loading">Loading your booking...</main>;

  if (!property || !room || !rate) {
    return (
      <main className="checkout-loading">
        <h2>Unable to continue</h2>
        <p>{error || "Booking details could not be loaded."}</p>
        <button onClick={() => router.push("/explore")}>Explore PGs</button>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <a href="/" className="checkout-brand">BookMy<span>PG</span></a>
        <div>Secure booking <span>🔒</span></div>
      </header>

      <div className="checkout-container">
        <div className="checkout-heading">
          <p>YOUR BOOKING</p>
          <h1>Complete your booking</h1>
          <span>You're one step closer to finding your new home.</span>
        </div>

        <div className="checkout-grid">
          <section className="checkout-card">
            <h2>Customer details</h2>
            <p className="checkout-muted">Confirm your contact information.</p>

            <label>Full name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Enter your full name" maxLength={100} />

            <label>Email address</label>
            <input value={email} readOnly />

            <label>Mobile number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="Enter mobile number" maxLength={20} />

            <div className="checkout-divider" />

            <h2>Stay details</h2>
            <label>Move-in date</label>
            <input type="date" value={moveIn}
              min={new Date().toISOString().slice(0, 10)}
              onChange={e => setMoveIn(e.target.value)} />

            <label>Move-out date <span className="optional">(optional)</span></label>
            <input type="date" value={moveOut}
              min={moveIn || new Date().toISOString().slice(0, 10)}
              onChange={e => setMoveOut(e.target.value)} />

            <div className="checkout-divider" />

            <h2>Payment method</h2>
            <div className="razorpay-choice">
              <div><strong>Razorpay</strong><small>UPI, cards and net banking through Razorpay</small></div>
              <span>●</span>
            </div>

            <div className="refund-note">
              <strong>Booking protection</strong>
              <p>PG not as advertised? Get 90% of your eligible booking amount back.</p>
              <p>Changed your mind after visiting? Get 80% of your eligible booking amount back.</p>
              <small>Applicable deductions are included in these percentages. Eligibility and terms apply.</small>
            </div>

            {error && <p className="checkout-error">{error}</p>}

            <button className="checkout-pay" onClick={payNow} disabled={paying}>
              {paying ? "Preparing payment..." : "Book Your PG · ₹99"}
            </button>

            <p className="checkout-secure">🔒 Secure payment powered by Razorpay</p>
          </section>

          <aside className="checkout-card summary-card">
            <h2>Booking summary</h2>
            <div className="summary-property">
              <div className="summary-placeholder">🏠</div>
              <div>
                <strong>{property.property_name}</strong>
                <p>{property.locality}, {property.city}</p>
                <small>{property.address}</small>
              </div>
            </div>

            <div className="summary-line">
              <span>Room</span>
              <strong>{room.room_name || `${room.sharing_type}-sharing`}</strong>
            </div>
            <div className="summary-line">
              <span>Sharing</span>
              <strong>{room.sharing_type}-sharing</strong>
            </div>
            <div className="summary-line">
              <span>Available beds</span>
              <strong>{room.available_beds}</strong>
            </div>
            <div className="summary-line">
              <span>Meal plan</span>
              <strong>{rate.meal_plan === "with_food" ? "With food" : "Without food"}</strong>
            </div>

            <div className="checkout-divider" />

            <div className="summary-line">
              <span>Monthly rent</span>
              <strong>₹{Number(rate.price).toLocaleString("en-IN")}</strong>
            </div>
            <div className="summary-line">
              <span>Booking payment</span>
              <strong>₹99</strong>
            </div>

            <div className="summary-total">
              <span>Pay now</span>
              <strong>₹99</strong>
            </div>

            <p className="summary-disclaimer">
              Monthly rent is shown separately. ₹99 is the booking payment collected now,
              not your full monthly rent.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}