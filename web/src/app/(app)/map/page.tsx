import type { Metadata } from "next";
import Link from "next/link";
import { EAT_PLACES } from "@/lib/eat-places";

export const metadata: Metadata = {
  title: "Eat",
};

export default function MapPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-[--color-text]">Eat</h1>
      </header>

      <section className="rounded-2xl border border-[--color-border] bg-[--color-surface] p-3 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          {["All", "Halal"].map((filter, index) => (
            <button
              key={filter}
              className={[
                "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                index === 0
                  ? "bg-primary-600 text-white"
                  : "border border-[--color-border] text-[--color-text-muted] hover:text-[--color-text]",
              ].join(" ")}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="flex h-56 items-center justify-center rounded-xl bg-[#efe7dc] text-[--color-text-muted]">
          <div className="text-center">
            <p className="text-3xl">🗺️</p>
            <p className="mt-2 text-sm font-medium">Map Preview</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[--color-border] bg-[--color-surface] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[--color-text]">Nearby Restaurants</h2>
          <span className="text-xs text-[--color-text-muted]">Scroll list</span>
        </div>
        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {EAT_PLACES.map((place) => (
            <Link
              key={place.id}
              href={`/map/${place.id}`}
              className="block rounded-xl border border-[--color-border] p-3 transition-colors hover:border-primary-600"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[--color-text]">{place.name}</h3>
                <span className="text-xs text-[--color-text-muted]">{place.distance}</span>
              </div>
              <p className="mt-1 text-sm text-[--color-text-muted]">{place.area}</p>
              <span
                className={[
                  "mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                  place.category === "Halal"
                    ? "bg-primary-100 text-primary-700"
                    : "bg-[--color-background] text-[--color-text-muted]",
                ].join(" ")}
              >
                {place.category}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
