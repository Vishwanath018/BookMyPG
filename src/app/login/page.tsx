"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthModal from "../AuthModal";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next");

  const safeNext =
    requestedNext &&
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//") &&
    requestedNext.startsWith("/booking/")
      ? requestedNext
      : undefined;

  return (
    <AuthModal
      initialAction="login"
      initialRole={safeNext ? "customer" : "owner"}
      redirectTo={safeNext}
      onClose={() => router.replace("/")}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main>Loading login...</main>}>
      <LoginContent />
    </Suspense>
  );
}