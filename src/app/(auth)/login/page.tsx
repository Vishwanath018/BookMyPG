import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-8 lg:justify-end lg:px-[4.5%]"
      style={{ backgroundImage: "url('/images/bookmypg-bedroom.png')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#fff8ef]/45 via-transparent to-[#ffffff]/20" />

      <section className="relative z-10 hidden w-[53%] self-center lg:block">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/75 px-5 py-3 text-sm font-semibold text-[#142b4a] shadow-sm backdrop-blur-md">
          <span className="text-xl text-[#f4b942]">★</span>
          Trusted by Students & Professionals
        </div>

        <h1 className="mt-9 text-5xl font-extrabold leading-[1.12] tracking-tight text-[#092d50] xl:text-6xl">
          Find, Compare &amp;
          <br />
          Book <span className="text-[#f2a900]">Your PG</span>
        </h1>

        <div className="mt-3 h-2 w-48 rounded-full bg-[#f4b942] lg:ml-28" />

        <p className="mt-7 max-w-xl text-lg font-medium leading-8 text-[#34465e]">
          Verified PGs, real photos, transparent pricing,
          <br className="hidden xl:block" />
          and hassle-free booking — all in one place.
        </p>

        <div className="mt-8 flex max-w-[510px] gap-5">
          {[
            ["♢", "Verified", "PGs"],
            ["●", "Multiple", "Locations"],
            ["▣", "Instant", "Booking"],
          ].map(([icon, title, subtitle]) => (
            <div
              key={title}
              className="flex min-h-28 flex-1 flex-col items-center justify-center rounded-2xl border border-white/50 bg-white/65 p-4 text-center shadow-sm backdrop-blur-md"
            >
              <span className="text-3xl font-bold text-[#e9a500]">{icon}</span>
              <span className="mt-2 text-sm font-bold text-[#142b4a]">{title}</span>
              <span className="text-sm font-bold text-[#142b4a]">{subtitle}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 w-full max-w-[465px] rounded-[32px] border border-white/70 bg-white/90 px-7 py-8 shadow-2xl shadow-[#142b4a]/15 backdrop-blur-xl sm:px-10 sm:py-9">
        <div className="flex justify-center">
          <Image
            src="/logo/bookmypg-logo.png"
            alt="BookMyPG house and bed logo"
            width={310}
            height={115}
            priority
            className="h-auto max-h-[105px] w-auto max-w-full object-contain"
          />
        </div>

        <div className="mt-5 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#092d50] sm:text-4xl">
            Welcome Back 👋
          </h2>
          <p className="mt-2 text-base text-slate-600">
            Login to continue to BookMyPG
          </p>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <Link
            href="/login/customer"
            className="rounded-lg bg-[#142b4a] py-2.5 text-center text-sm font-semibold text-white"
          >
            Customer
          </Link>
          <Link
            href="/login/owner"
            className="rounded-lg py-2.5 text-center text-sm font-semibold text-[#142b4a] hover:bg-white"
          >
            PG Owner
          </Link>
        </div>

        <button
          type="button"
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white font-semibold text-[#172b45] shadow-md transition hover:bg-slate-50"
        >
          <span className="text-2xl font-bold text-[#4285f4]">G</span>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-4 text-sm font-semibold text-slate-500">
          <span className="h-px flex-1 bg-slate-300" />
          or
          <span className="h-px flex-1 bg-slate-300" />
        </div>

        <form className="space-y-3.5">
          <label className="block">
            <span className="sr-only">Email address</span>
            <input
              type="email"
              placeholder="✉   Email address"
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white/80 px-4 text-sm text-[#142b4a] outline-none transition placeholder:text-slate-500 focus:border-[#142b4a] focus:ring-2 focus:ring-[#142b4a]/10"
            />
          </label>

          <label className="block">
            <span className="sr-only">Password</span>
            <input
              type="password"
              placeholder="♙   Password"
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white/80 px-4 text-sm text-[#142b4a] outline-none transition placeholder:text-slate-500 focus:border-[#142b4a] focus:ring-2 focus:ring-[#142b4a]/10"
            />
          </label>

          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="button"
            className="min-h-12 w-full rounded-xl bg-[#06345d] text-base font-bold text-white shadow-sm transition hover:bg-[#142b4a]"
          >
            Login <span className="ml-2">→</span>
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup/customer"
            className="font-bold text-blue-700 hover:underline"
          >
            Sign up
          </Link>
        </p>

        <p className="mt-3 text-center text-xs text-slate-500">
          PG Owner?{" "}
          <Link
            href="/signup/owner"
            className="font-semibold text-[#142b4a] hover:underline"
          >
            Register your property
          </Link>
        </p>

        <div className="mt-5 text-center text-[11px] text-slate-400">
          Find · Compare · Book Your PG
        </div>
      </section>
    </main>
  );
}

