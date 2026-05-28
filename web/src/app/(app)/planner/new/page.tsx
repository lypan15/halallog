"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { slugifyTripId, upsertTrip } from "@/lib/trips-storage";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COMPANIONS = ["Solo", "Friends", "Couple", "Spouse", "Family"];
const STYLES = ["Activities", "Food Tour", "Relaxation", "Sightseeing", "Shopping"];

const POPULAR_CITIES = [
  { name: "Seoul", image: "🌆" },
  { name: "Istanbul", image: "🕌" },
  { name: "Tokyo", image: "🗼" },
  { name: "Dubai", image: "🏜️" },
];

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const displayDate = (date: Date) =>
  `${date.getMonth() + 1}/${date.getDate()}`;

export default function NewTripPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState("");
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [dragging, setDragging] = useState(false);
  const [companion, setCompanion] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDate = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0);
    const leadingEmpty = firstDate.getDay();
    const totalDays = lastDate.getDate();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < leadingEmpty; i += 1) cells.push(null);
    for (let day = 1; day <= totalDays; day += 1) cells.push(new Date(year, month, day));
    return cells;
  }, []);

  const updateRange = (date: Date) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }
    if (date < rangeStart) {
      setRangeEnd(rangeStart);
      setRangeStart(date);
      return;
    }
    setRangeEnd(date);
  };

  const inRange = (date: Date) => {
    if (!rangeStart) return false;
    const start = rangeStart.getTime();
    const end = (rangeEnd ?? rangeStart).getTime();
    const value = date.getTime();
    return value >= start && value <= end;
  };

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

    upsertTrip({
      id: tripSlug,
      title: `${finalDestination} Trip`,
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
        <section className="space-y-4 rounded-xl border border-[--color-border] bg-[--color-surface] p-4">
          <h2 className="font-medium text-[--color-text]">Step 2: Select Dates</h2>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-[--color-text-muted]">
            {WEEK_DAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div
            className="grid grid-cols-7 gap-1"
            onMouseLeave={() => setDragging(false)}
          >
            {calendarDays.map((date, index) =>
              date ? (
                <button
                  type="button"
                  key={date.toISOString()}
                  onMouseDown={() => {
                    setDragging(true);
                    updateRange(date);
                  }}
                  onMouseEnter={() => {
                    if (dragging) updateRange(date);
                  }}
                  onMouseUp={() => setDragging(false)}
                  className={[
                    "rounded-md py-2 text-sm transition-colors",
                    inRange(date)
                      ? "bg-primary-600 text-white"
                      : "bg-[--color-background] text-[--color-text] hover:bg-[--color-border]",
                  ].join(" ")}
                >
                  {date.getDate()}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              )
            )}
          </div>
          <p className="rounded-lg bg-[--color-background] px-3 py-2 text-sm text-[--color-text-muted]">
            Selected:{" "}
            {rangeStart
              ? `${displayDate(rangeStart)} - ${displayDate(rangeEnd ?? rangeStart)}`
              : "Choose your range"}
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
