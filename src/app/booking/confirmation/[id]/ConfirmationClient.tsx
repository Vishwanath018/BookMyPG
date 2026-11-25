"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type BookingData = {
  id: string;
  reference: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  moveInDate: string;
  moveOutDate: string;
  sharingType: number;
  guests: number;
  monthlyRent: number;
  bookingAmount: number;
  property: Record<string, unknown> | null;
  room: Record<string, unknown> | null;
  createdAt: string;
};

type PaymentData = {
  status: string;
  amountPaise: number;
  currency: string;
  paymentId: string | null;
  verifiedAt: string | null;
};

function displayValue(
  data: Record<string, unknown> | null,
  keys: string[]
) {
  if (!data) return "";
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "short", year: "numeric" }
  );
}

export default function ConfirmationClient({
  bookingId,
}: {
  bookingId: string;
}) {
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadBooking() {
      try {
        const response = await fetch(
          `/api/bookings/${encodeURIComponent(bookingId)}/confirmation`,
          { cache: "no-store" }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load booking.");
        }

        if (active) {
          setBooking(result.booking);
          setPayment(result.payment);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Something went wrong."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBooking();
    return () => {
      active = false;
    };
  }, [bookingId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white text-gray-600">
        Loading your booking confirmation...
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 px-5">
        <h1 className="text-xl font-semibold text-gray-900">
          Booking details unavailable
        </h1>
        <p className="text-sm text-gray-600">
          {error || "We could not find this booking."}
        </p>
        <Link href="/explore" className="rounded-lg bg-red-600 px-5 py-3 text-white">
          Explore PGs
        </Link>
      </main>
    );
  }

  const confirmed =
    booking.status === "confirmed" && payment?.status === "captured";

  const propertyName =
    displayValue(booking.property, ["property_name", "propertyName", "name"]) ||
    "Your selected PG";

  const address = [
    displayValue(booking.property, ["locality"]),
    displayValue(booking.property, ["city"]),
  ].filter(Boolean).join(", ");

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            <span className="text-red-600">Book</span>MyPG
          </Link>
          <Link href="/explore" className="text-sm font-medium text-gray-600 hover:text-red-600">
            Explore PGs
          </Link>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
            confirmed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}>
            {confirmed ? "✓" : "!"}
          </div>

          <h1 className="text-2xl font-bold sm:text-3xl">
            {confirmed ? "Booking confirmed!" : "Payment confirmation pending"}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {confirmed
              ? "Your booking payment has been verified successfully."
              : "Your booking is not yet confirmed. Please contact support if you have completed payment."}
          </p>

          <div className="mt-7 rounded-xl bg-gray-50 p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Booking reference
            </p>
            <p className="mt-2 text-xl font-bold tracking-wide">
              {booking.reference}
            </p>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">PG details</h2>
          <div className="mt-4">
            <p className="font-semibold">{propertyName}</p>
            {address && <p className="mt-1 text-sm text-gray-500">{address}</p>}
            <p className="mt-2 text-sm text-gray-600">
              {booking.sharingType}-sharing · {booking.guests} guest(s)
            </p>
          </div>

          <div className="my-5 border-t border-gray-100" />

          <h2 className="text-lg font-bold">Booking details</h2>
          <div className="mt-4 grid grid-cols-2 gap-5 text-sm">
            <div>
              <p className="text-gray-500">Move-in date</p>
              <p className="mt-1 font-semibold">{formatDate(booking.moveInDate)}</p>
            </div>
            <div>
              <p className="text-gray-500">Move-out date</p>
              <p className="mt-1 font-semibold">{formatDate(booking.moveOutDate)}</p>
            </div>
            <div>
              <p className="text-gray-500">Monthly rent</p>
              <p className="mt-1 font-semibold">₹{Number(booking.monthlyRent).toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-gray-500">Booking payment</p>
              <p className="mt-1 font-semibold">₹{Number(booking.bookingAmount).toLocaleString("en-IN")}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Customer details</h2>
          <div className="mt-4 space-y-2 text-sm">
            <p><span className="text-gray-500">Name: </span>{booking.customerName}</p>
            <p><span className="text-gray-500">Email: </span>{booking.customerEmail}</p>
            <p><span className="text-gray-500">Mobile: </span>{booking.customerPhone}</p>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Payment summary</h2>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500">Booking payment</span>
            <span className="font-bold">₹{payment ? (payment.amountPaise / 100).toLocaleString("en-IN") : Number(booking.bookingAmount).toLocaleString("en-IN")}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">Payment status</span>
            <span className={`font-semibold ${payment?.status === "captured" ? "text-green-700" : "text-amber-700"}`}>
              {payment?.status === "captured" ? "Paid" : payment?.status || "Pending"}
            </span>
          </div>
          {payment?.paymentId && (
            <p className="mt-3 break-all text-xs text-gray-400">
              Payment ID: {payment.paymentId}
            </p>
          )}
        </section>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/explore" className="flex-1 rounded-xl bg-red-600 px-5 py-3 text-center font-semibold text-white hover:bg-red-700">
            Explore more PGs
          </Link>
          <Link href="/" className="flex-1 rounded-xl border border-gray-300 bg-white px-5 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}