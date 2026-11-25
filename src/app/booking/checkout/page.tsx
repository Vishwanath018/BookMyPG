import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export default function BookingCheckoutPage() {
  return (
    <Suspense fallback={<main className="checkout-loading">Loading checkout...</main>}>
      <CheckoutClient />
    </Suspense>
  );
}