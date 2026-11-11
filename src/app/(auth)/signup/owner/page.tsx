import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";

export default function OwnerSignupPage() {
  return (
    <AuthShell role="PG owner registration" title="Register your PG" description="Create an owner account to list and manage your property.">
      <form className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">Owner full name
          <input type="text" placeholder="Your full name" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-[#142b4a]" />
        </label>
        <label className="block text-sm font-medium text-slate-700">Business or PG name
          <input type="text" placeholder="Your PG property name" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-[#142b4a]" />
        </label>
        <label className="block text-sm font-medium text-slate-700">Email address
          <input type="email" placeholder="owner@example.com" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-[#142b4a]" />
        </label>
        <label className="block text-sm font-medium text-slate-700">Phone number
          <input type="tel" placeholder="10-digit mobile number" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-[#142b4a]" />
        </label>
        <label className="block text-sm font-medium text-slate-700">Password
          <input type="password" placeholder="Create a password" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-[#142b4a]" />
        </label>
        <button type="button" className="min-h-12 w-full rounded-xl bg-[#142b4a] font-semibold text-white hover:bg-[#1c3b61]">Create owner account</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">Already registered? <Link href="/login/owner" className="font-bold text-[#142b4a]">Log in</Link></p>
    </AuthShell>
  );
}
