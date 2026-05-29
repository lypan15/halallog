"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugifyTripId, upsertTrip } from "@/lib/trips-storage";
import { formatDate, formatDateLabel } from "@/lib/date-utils";
import { Calendar, SHORT_MONTHS } from "@/components/Calendar";

const COMPANIONS = ["Solo", "Friends", "Couple", "Spouse", "Family"];
const STYLES = ["Activities", "Food Tour", "Relaxation", "Sightseeing", "Shopping"];

const POPULAR_CITIES = [
  { name: "Seoul", image: "🌆" },
  { name: "Istanbul", image: "🕌" },
  { name: "Tokyo", image: "🗼" },
  { name: "Dubai", image: "🏜️" },
];

export default function NewTripPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState("");
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [companion, setCompanion] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [tripName, setTripName] = useState("");
  const [description, setDescription] = useState("");

  const selectedLabel = !rangeStart
    ? "Select your travel dates"
    : !rangeEnd
    ? `${formatDateLabel(rangeStart, SHORT_MONTHS)} – ?`
    : `${formatDateLabel(rangeStart, SHORT_MONTHS)} – ${formatDateLabel(rangeEnd, SHORT_MONTHS)} (${Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1} days)`;

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((item) => item !== style) : [...prev, style]
    );
  };

  const createTrip = () => {
    const finalDestination = destination || "My Trip";
    const tripSlug = slugifyTripId(finalDestination) || "new-trip";
    const startDate = rangeStart ? formatDate(rangeStart) : formatDate(new Date());
    const endDate = rangeEnd ? formatDate(rangeEnd) : startDate;
    const finalName = tripName.trim() || `${finalDestination} Trip`;

    upsertTrip({
      id: tripSlug,
      title: finalName,
      tripName: finalName,
      description: description.trim() || undefined,
      destination: finalDestination,
      startDate,
      endDate,
      companion: companion || "Solo",
      styles: selectedStyles,
      createdAt: new Date().toISOString(),
    });

    router.push(`/planner/${tripSlug}`);
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[--color-text]">Create Trip</h1>
        <span className="rounded-full bg-[--color-background] px-3 py-1 text-xs text-[--color-text-muted]">
          Step {step} / 4
        </span>
      </header>

      {step === 1 && (
        <section className="space-y-4 rounded-xl border border-[--color-border] bg-[--color-surface] p-4">
          <h2 className="font-medium text-[--color-text]">Step 1: Destination</h2>
          <input
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="Search city or country"
            className="w-full rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm outline-none focus:border-primary-600"
          />
          <div className="grid grid-cols-2 gap-3">
            {POPULAR_CITIES.map((city) => (
              <button
                type="button"
                key={city.name}
                onClick={() => setDestination(city.name)}
                className="rounded-xl border border-[--color-border] bg-[--color-background] p-3 text-left"
              >
                <p className="text-2xl">{city.image}</p>
                <p className="mt-2 text-sm font-medium text-[--color-text]">{city.name}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3 rounded-xl border border-[--color-border] bg-[--color-surface] p-4">
          <h2 className="font-medium text-[--color-text]">Step 2: Select Dates</h2>
          <Calendar
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onRangeChange={(start, end) => { setRangeStart(start); setRangeEnd(end); }}
            disablePastMonths
          />
          <p className="rounded-lg bg-[--color-background] px-3 py-2 text-sm text-[--color-text-muted]">
            {selectedLabel}
          </p>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-5 rounded-xl border border-[--color-border] bg-[--color-surface] p-4">
          <div>
            <h2 className="font-medium text-[--color-text]">Step 3: Travel Style</h2>
            <p className="mt-1 text-xs text-[--color-text-muted]">Optional (can skip)</p>
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

          <div className="space-y-2">
            <p className="text-sm font-medium text-[--color-text]">Travel style</p>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((style) => (
                <button
                  type="button"
                  key={style}
                  onClick={() => toggleStyle(style)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-sm",
                    selectedStyles.includes(style)
                      ? "border-[--color-accent-500] bg-[#f6e7e1] text-[--color-accent-500]"
                      : "border-[--color-border] bg-[--color-background] text-[--color-text-muted]",
                  ].join(" ")}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[--color-text]">Trip Name</p>
              <input
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="My Tokyo Trip"
                className="w-full rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm outline-none focus:border-primary-600"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[--color-text]">
                Description{" "}
                <span className="text-xs font-normal text-[--color-text-muted]">optional</span>
              </p>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Solo adventure! 🌙"
                className="w-full rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm outline-none focus:border-primary-600"
              />
            </div>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-3 rounded-xl border border-[--color-border] bg-[--color-surface] p-6 text-center">
          <p className="text-3xl">✅</p>
          <h2 className="text-lg font-medium text-[--color-text]">Trip is ready</h2>
          <p className="text-sm text-[--color-text-muted]">
            We will now move you to your trip detail page.
          </p>
          <button
            type="button"
            onClick={createTrip}
            className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white"
          >
            Go to Trip Detail
          </button>
        </section>
      )}

      <div className="flex items-center justify-between">
        <Link href="/planner" className="text-sm text-[--color-text-muted]">
          Cancel
        </Link>
        <div className="flex gap-2">
          {step > 1 && step < 4 && (
            <button
              type="button"
              onClick={() => setStep((prev) => prev - 1)}
              className="rounded-lg border border-[--color-border] px-4 py-2 text-sm"
            >
              Back
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep((prev) => prev + 1)}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white"
            >
              Next
            </button>
          )}
          {step === 3 && (
            <>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="rounded-lg border border-[--color-border] px-4 py-2 text-sm"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white"
              >
                Complete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
