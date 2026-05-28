import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ramadan",
};

export default function RamadanPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/prayer"
        className="inline-flex rounded-lg border border-[--color-border] px-3 py-1.5 text-sm font-medium text-[--color-text-muted] transition-colors hover:text-[--color-text]"
      >
        ← Back to Pray
      </Link>

      <section className="rounded-2xl border border-[--color-border] bg-[--color-surface] p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-[--color-text]">Ramadan Tools</h1>
        <p className="mt-2 text-sm text-[--color-text-muted]">
          Keep your fasting schedule and check suhoor/iftar timing guidance while traveling.
        </p>
      </section>
    </div>
  );
}
