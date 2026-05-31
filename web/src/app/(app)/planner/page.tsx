"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  countTripDays,
  formatTripDateRange,
  getTrips,
} from "@/lib/trips-storage";

export default function PlannerPage() {
  const [trips] = useState(getTrips);

  // localStorage-backed data differs between server (none) and client. Gate the
  // first render so server HTML and client hydration match, then reveal after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <p className="py-10 text-center text-sm text-[--color-text-muted]">Loading…</p>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-[--color-text]">Trips</h1>
      </header>

      <Link
        href="/planner/new"
        className="block w-full rounded-xl bg-primary-600 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-700"
      >
        + Add New Trip
      </Link>

      <div className="space-y-3">
        {trips.map((trip) => (
          <Link
            key={trip.id}
            href={`/planner/${trip.id}`}
            className="block rounded-xl border border-[--color-border] bg-[--color-surface] p-4 shadow-sm"
          >
            <h2 className="font-semibold text-[--color-text]">{trip.title}</h2>
            <p className="mt-1 text-sm text-[--color-text-muted]">
              {countTripDays(trip.startDate, trip.endDate)} · {formatTripDateRange(trip.startDate, trip.endDate)}
            </p>
            <p className="mt-1 text-xs text-[--color-text-muted]">With {trip.companion}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-[--color-border] bg-[--color-surface] p-5 text-center">
        <p className="text-sm text-[--color-text-muted]">
          Keep your day plan simple: flights, halal food spots, and prayer-friendly stops.
        </p>
      </div>
    </div>
  );
}
