"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  countTripDays,
  deleteTrip,
  formatTripDateRange,
  getTrips,
  upsertTrip,
  type TripRecord,
} from "@/lib/trips-storage";

const COMPANIONS = ["Solo", "Friends", "Couple", "Spouse", "Family"];

export default function PlannerPage() {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TripRecord | null>(null);

  // localStorage-backed data differs between server (none) and client. Gate the
  // first render so server HTML and client hydration match, then reveal after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setTrips(getTrips());
  }, []);

  const refresh = () => setTrips(getTrips());

  const handleDelete = (trip: TripRecord) => {
    setMenuOpenId(null);
    if (window.confirm("Delete this trip?")) {
      deleteTrip(trip.id);
      refresh();
    }
  };

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
            className="relative block rounded-xl border border-[--color-border] bg-[--color-surface] p-4 shadow-sm"
          >
            {/* Kebab menu — must not trigger the card Link navigation */}
            <div className="absolute right-2 top-2">
              <button
                type="button"
                aria-label="Trip options"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenuOpenId((prev) => (prev === trip.id ? null : trip.id));
                }}
                className="rounded-lg px-2 py-1 text-lg leading-none text-[--color-text-muted] hover:bg-[--color-background]"
              >
                ⋯
              </button>
              {menuOpenId === trip.id && (
                <div className="absolute right-0 z-10 mt-1 w-32 overflow-hidden rounded-lg border border-[--color-border] bg-[--color-surface] shadow-md">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setMenuOpenId(null);
                      setEditing(trip);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-[--color-text] hover:bg-[--color-background]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleDelete(trip);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-[--color-accent-500] hover:bg-[--color-background]"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            <h2 className="pr-8 font-semibold text-[--color-text]">{trip.title}</h2>
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

      {editing && (
        <EditTripModal
          trip={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function EditTripModal({
  trip,
  onClose,
  onSaved,
}: {
  trip: TripRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(trip.title);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate);
  const [companion, setCompanion] = useState(trip.companion);
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!title.trim()) {
      setError("Title can't be empty.");
      return;
    }
    if (endDate < startDate) {
      setError("End date can't be before start date.");
      return;
    }
    // Spread the existing trip so untouched fields (styles, destination, etc.) are preserved.
    upsertTrip({ ...trip, title: title.trim(), startDate, endDate, companion });
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-4 rounded-xl border border-[--color-border] bg-[--color-surface] p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[--color-text]">Edit Trip</h2>

        <div className="space-y-1">
          <label className="text-sm font-medium text-[--color-text]">Title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm outline-none focus:border-primary-600"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-[--color-text]">Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm outline-none focus:border-primary-600"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-[--color-text]">End</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm outline-none focus:border-primary-600"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-[--color-text]">Who are you with?</p>
          <div className="flex flex-wrap gap-2">
            {COMPANIONS.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setCompanion(item)}
                className={[
                  "rounded-full border px-3 py-1.5 text-sm",
                  companion === item
                    ? "border-primary-600 bg-primary-600 text-white"
                    : "border-[--color-border] bg-[--color-background] text-[--color-text-muted]",
                ].join(" ")}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-[--color-accent-500]">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[--color-border] px-4 py-2 text-sm text-[--color-text]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
