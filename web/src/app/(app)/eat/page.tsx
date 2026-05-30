"use client";

import Link from "next/link";
import { useState } from "react";
import { EAT_PLACES } from "@/lib/eat-places";

const DIET_FILTERS = [
  { id: "Halal", label: "🥩 Halal" },
  { id: "Vegetarian", label: "🥦 Vegetarian" },
  { id: "Pescatarian", label: "🐟 Pescatarian" },
  { id: "Vegan", label: "🌱 Vegan" },
] as const;

export default function EatPage() {
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const toggleFilter = (id: string) => {
    setSelectedFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const filtered = EAT_PLACES.filter((place) => {
    const matchesSearch =
      search.trim() === "" ||
      place.name.toLowerCase().includes(search.toLowerCase()) ||
      place.area.toLowerCase().includes(search.toLowerCase());
    const matchesDiet =
      selectedFilters.length === 0 ||
      selectedFilters.some((f) => place.dietTags.includes(f as never));
    return matchesSearch && matchesDiet;
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-[--color-text]">Eat</h1>
      </header>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search restaurants..."
        className="w-full rounded-xl border border-[--color-border] bg-[--color-surface] px-4 py-2.5 text-sm outline-none focus:border-[#2d6a4f]"
      />

      {/* Diet filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {DIET_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => toggleFilter(f.id)}
            className={[
              "rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              selectedFilters.includes(f.id)
                ? "bg-[#2d6a4f] text-white"
                : "border border-[--color-border] bg-[--color-surface] text-[--color-text-muted] hover:border-[#2d6a4f]",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Map placeholder */}
      <section className="rounded-2xl border border-[--color-border] bg-[--color-surface] p-3 shadow-sm">
        <div className="flex h-44 items-center justify-center rounded-xl bg-[#efe7dc] text-[--color-text-muted]">
          <div className="text-center">
            <p className="text-3xl">🗺️</p>
            <p className="mt-2 text-sm font-medium">Map Preview</p>
          </div>
        </div>
      </section>

      {/* Restaurant list */}
      <section className="rounded-2xl border border-[--color-border] bg-[--color-surface] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[--color-text]">
            Nearby Restaurants{filtered.length < EAT_PLACES.length && ` (${filtered.length})`}
          </h2>
          {selectedFilters.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFilters([])}
              className="text-xs text-[#2d6a4f]"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-[--color-text-muted] py-4">No restaurants match your filters.</p>
          ) : (
            filtered.map((place) => (
              <Link
                key={place.id}
                href={`/eat/${place.id}`}
                className="block rounded-xl border border-[--color-border] p-3 transition-colors hover:border-[#2d6a4f]"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[--color-text]">{place.name}</h3>
                  <span className="text-xs text-[--color-text-muted]">{place.distance}</span>
                </div>
                <p className="mt-1 text-sm text-[--color-text-muted]">{place.area}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {place.dietTags.map((tag) => (
                    <span
                      key={tag}
                      className={[
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                        tag === "Halal"
                          ? "bg-[#d8e7df] text-[#2d6a4f]"
                          : tag === "Vegan"
                          ? "bg-green-100 text-green-700"
                          : tag === "Vegetarian"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-blue-50 text-blue-700",
                      ].join(" ")}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
