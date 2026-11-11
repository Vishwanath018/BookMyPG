import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";

export default function OwnerLoginPage() {
  return (
    <AuthShell role="PG owner account" title="Owner login" description="Manage your property, enquiries, and customer bookings.">
      <button type="button" className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 font-semibold text-[#172b45] hover:bg-slate-50">
        <span className="text-lg font-bold">G</span> Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> OR CONTINUE WITH EMAIL <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Owner email
          <input type="email" placeholder="owner@example.com" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-[#142b4a]" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input type="password" placeholder="Enter your password" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-[#142b4a]" />
        </label>
        <div className="text-right">
          <Link href="/forgot-password" className="text-sm font-semibold text-[#142b4a]">Forgot password?</Link>
        </div>
        <button type="button" className="min-h-12 w-full rounded-xl bg-[#142b4a] font-semibold text-white hover:bg-[#1c3b61]">Log in as PG Owner</button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Want to list your PG? <Link href="/signup/owner" className="font-bold text-[#142b4a]">Register as an owner</Link>
      </p>
    </AuthShell>
  );
}
