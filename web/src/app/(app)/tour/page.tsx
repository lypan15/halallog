import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore",
};

export default function TourPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-[--color-text]">Explore</h1>
      </header>

      <section className="rounded-2xl border border-[--color-border] bg-[--color-surface] p-8 text-center shadow-sm">
        <p className="text-4xl">✨</p>
        <h2 className="mt-3 text-xl font-semibold text-[--color-text]">Coming Soon</h2>
        <p className="mt-2 text-sm text-[--color-text-muted]">
          Muslim-friendly curated tour booking will be available soon.
        </p>
      </section>
    </div>
  );
}
