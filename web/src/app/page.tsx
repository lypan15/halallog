import Link from "next/link";
import { AppNav } from "@/components/layout/app-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const FEATURES = [
  {
    href: "/planner",
    icon: "🧳",
    title: "Trips",
  },
  {
    href: "/map",
    icon: "🍽️",
    title: "Eat",
  },
  {
    href: "/prayer",
    icon: "🕌",
    title: "Pray",
  },
  {
    href: "/tour",
    icon: "✨",
    title: "Tour",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[--color-background]">
      <header className="sticky top-0 z-40 border-b border-[--color-border]/70 bg-[--color-background]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🌙</span>
            <span className="text-lg font-semibold tracking-tight text-primary-700">HalalLog</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pb-6 pt-10 text-center sm:pt-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-[--color-text] sm:text-4xl">
            Plan your perfect <span className="text-primary-600">halal trip</span>
          </h1>
          <p className="mt-3 text-base text-[--color-text-muted]">
            Travel planning, halal food, prayer essentials, and tours in one place.
          </p>
          <Link
            href="/planner"
            className="mt-6 inline-flex rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            Open App
          </Link>
        </div>
      </section>

      {/* Feature section */}
      <section className="bg-[--color-surface] pb-28 pt-3">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-5 text-center text-2xl font-semibold text-[--color-text]">
            Everything a Muslim traveler needs
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
            {FEATURES.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className="group rounded-xl border border-[--color-border]/80 bg-[--color-background] px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:shadow-sm"
              >
                <span className="text-[22px]">{f.icon}</span>
                <h3 className="mt-1.5 text-[15px] font-medium text-[--color-text] group-hover:text-primary-600">
                  {f.title}
                </h3>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-[--color-text-muted]">
            © 2026 HalalLog. Built for Muslim travelers worldwide.
          </p>
        </div>
      </section>
      <AppNav />
    </div>
  );
}
