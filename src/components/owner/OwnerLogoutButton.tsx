"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OwnerLogoutButton() {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      className="bm-profile"
      type="button"
      onClick={logout}
      title="Sign out"
    >
      <span className="bm-profile-avatar">O</span>
      <span>Logout</span>
      <span>↗</span>
    </button>
  );
}
