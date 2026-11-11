import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  role: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function AuthShell({
  role,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4 py-10">
      <section className="w-full max-w-md">
        <Link href="/login" className="mb-8 block text-center text-2xl font-bold tracking-tight text-[#142b4a]">
          BookMy<span className="text-[#e5a92f]">PG</span>
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-9">
          <Link href="/login" className="mb-6 inline-flex text-sm font-medium text-slate-500 hover:text-[#142b4a]">
            ← Back to account selection
          </Link>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#b88720]">
            {role}
          </p>

          <h1 className="text-2xl font-bold text-[#142b4a]">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

          <div className="mt-7">{children}</div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © 2026 BookMyPG. All rights reserved.
        </p>
      </section>
    </main>
  );
}

