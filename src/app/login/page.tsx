"use client";

import { useRouter } from "next/navigation";
import AuthModal from "../AuthModal";

export default function OwnerLoginPage() {
  const router = useRouter();

  return (
    <AuthModal
      initialAction="login"
      initialRole="owner"
      onClose={() => router.replace("/")}
    />
  );
}
