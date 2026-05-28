"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { slugifyTripId, upsertTrip } from "@/lib/trips-storage";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

const formatDateLabel = (date: Date) =>
  `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}`;

export default function NewTripPage() {
  const router = useRouter();
  const now = new Date();

  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState("");
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [companion, setCompanion] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [tripName, setTripName] = useState("");
  const [description, setDescription] = useState("");

  // Calendar month navigation
  const [calendarMonth, setCalendarMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [slideY, setSlideY] = useState(0);
  const [withTransition, setWithTransition] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartY = useRef(0);

  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDate = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0);
    const leadingEmpty = firstDate.getDay();
    const totalDays = lastDate.getDate();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < leadingEmpty; i += 1) cells.push(null);
    for (let day = 1; day <= totalDays; day += 1) cells.push(new Date(year, month, day));
    return cells;
  }, [calendarMonth]);

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

  const isEndpoint = (date: Date) =>
    (rangeStart !== null && date.getTime() === rangeStart.getTime()) ||
    (rangeEnd !== null && date.getTime() === rangeEnd.getTime());

  const isInRangeMiddle = (date: Date) => {
    if (!rangeStart || !rangeEnd) return false;
    const t = date.getTime();
    return t > rangeStart.getTime() && t < rangeEnd.getTime();
  };

  const navigate = (direction: "next" | "prev") => {
    if (isAnimating) return;
    if (direction === "prev") {
      const n = new Date();
      if (calendarMonth.year === n.getFullYear() && calendarMonth.month === n.getMonth()) return;
    }
    setIsAnimating(true);
    setWithTransition(true);
    setSlideY(direction === "next" ? -100 : 100);

    setTimeout(() => {
      setWithTransition(false);
      setSlideY(direction === "next" ? 100 : -100);
      setCalendarMonth((prev) => {
        if (direction === "next") {
          return prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 };
        }
        return prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 };
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setWithTransition(true);
          setSlideY(0);
          setTimeout(() => setIsAnimating(false), 300);
        });
      });
    }, 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 30) return;
    navigate(delta > 0 ? "next" : "prev");
  };

  const handleWheel = (e: React.WheelEvent) => {
    navigate(e.deltaY > 0 ? "next" : "prev");
  };

  const selectedLabel = !rangeStart
    ? "Select your travel dates"
    : !rangeEnd
    ? `${formatDateLabel(rangeStart)} – ?`
    : `${formatDateLabel(rangeStart)} – ${formatDateLabel(rangeEnd)} (${Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1} days)`;

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

          {/* Month / year header */}
          <p className="text-center text-sm font-semibold text-[--color-text]">
            {MONTHS[calendarMonth.month]} {calendarMonth.year}
          </p>

          {/* Week day labels */}
          <div className="grid grid-cols-7 text-center text-xs text-[--color-text-muted]">
            {WEEK_DAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>

          {/* Animated calendar grid */}
          <div
            className="overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <div
              className="grid grid-cols-7"
              style={{
                transform: `translateY(${slideY}%)`,
                transition: withTransition ? "transform 0.3s ease" : "none",
              }}
            >
              {calendarDays.map((date, index) =>
                date ? (
                  <div
                    key={date.toISOString()}
                    className="flex items-center justify-center py-1"
                    style={{
                      backgroundColor: isInRangeMiddle(date) ? "rgba(45, 106, 79, 0.15)" : undefined,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => updateRange(date)}
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors",
                        isEndpoint(date)
                          ? "bg-[#2d6a4f] text-white"
                          : "text-[--color-text] hover:bg-[--color-border]",
                      ].join(" ")}
                    >
                      {date.getDate()}
                    </button>
                  </div>
                ) : (
                  <span key={`empty-${index}`} />
                )
              )}
            </div>
          </div>

          {/* Selected date label */}
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
