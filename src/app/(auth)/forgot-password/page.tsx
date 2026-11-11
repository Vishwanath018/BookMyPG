import AuthShell from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell role="Account recovery" title="Reset your password" description="Enter your registered email address to receive password reset instructions.">
      <form className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Email address
          <input type="email" placeholder="you@example.com" className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-[#142b4a]" />
        </label>
        <button type="button" className="min-h-12 w-full rounded-xl bg-[#142b4a] font-semibold text-white hover:bg-[#1c3b61]">Send reset instructions</button>
      </form>
    </AuthShell>
  );
}
