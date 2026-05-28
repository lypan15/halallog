import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EAT_PLACES } from "@/lib/eat-places";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Restaurant Detail",
};

export default async function EatDetailPage({ params }: PageProps) {
  const { id } = await params;
  const place = EAT_PLACES.find((item) => item.id === id);

  if (!place) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link
        href="/map"
        className="inline-flex rounded-lg border border-[--color-border] px-3 py-1.5 text-sm font-medium text-[--color-text-muted] transition-colors hover:text-[--color-text]"
      >
        ← Back to Eat
      </Link>

      <section className="rounded-2xl border border-[--color-border] bg-[--color-surface] p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-[--color-text]">{place.name}</h1>
        <p className="mt-2 text-sm text-[--color-text-muted]">{place.description}</p>

        <div className="mt-4 grid gap-2 text-sm text-[--color-text-muted] sm:grid-cols-2">
          <p>Area: {place.area}</p>
          <p>Distance: {place.distance}</p>
          <p>Category: {place.category}</p>
          <p>Rating: {place.rating.toFixed(1)} / 5.0</p>
        </div>
      </section>
    </div>
  );
}
