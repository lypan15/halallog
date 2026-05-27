import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Prayer Times",
};

const PRAYER_NAMES = [
  { name: "Fajr",    arabic: "الفجر",   icon: "🌙" },
  { name: "Dhuhr",   arabic: "الظهر",   icon: "☀️" },
  { name: "Asr",     arabic: "العصر",   icon: "🌤️" },
  { name: "Maghrib", arabic: "المغرب",  icon: "🌅" },
  { name: "Isha",    arabic: "العشاء",  icon: "🌙" },
];

export default function PrayerPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[--color-text]">Prayer</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Prayer times and nearby mosques
        </p>
      </header>

      <div className="rounded-xl border border-[--color-border] bg-[--color-surface] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-[--color-text]">Need Qibla direction now?</h2>
            <p className="mt-1 text-sm text-[--color-text-muted]">
              Open the dedicated compass screen for faster access.
            </p>
          </div>
          <Link
            href="/qibla"
            className="inline-flex items-center justify-center rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
          >
            Open Qibla Compass
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Prayer times card */}
        <div className="col-span-full rounded-xl border border-[--color-border] bg-[--color-surface] p-5 sm:col-span-1 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[--color-text]">Today&apos;s Prayer Times</h2>
            <span className="text-xs text-[--color-text-muted]">
              📍 Location required
            </span>
          </div>
          <div className="divide-y divide-[--color-border]">
            {PRAYER_NAMES.map((prayer) => (
              <div key={prayer.name} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{prayer.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-[--color-text]">{prayer.name}</p>
                    <p className="text-xs text-[--color-text-muted]">{prayer.arabic}</p>
                  </div>
                </div>
                <span className="text-sm font-mono text-[--color-text-muted]">
                  —:—
                </span>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600">
            Enable Location
          </button>
        </div>

        {/* Nearby mosques card */}
        <div className="rounded-xl border border-[--color-border] bg-[--color-surface] p-5">
          <h2 className="mb-4 font-semibold text-[--color-text]">Nearby Mosques</h2>
          <div className="flex flex-col items-center justify-center gap-3 py-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-blue-200 bg-blue-50 text-4xl">
              🕌
            </div>
            <p className="text-center text-sm text-[--color-text-muted]">
              Enable location to<br />find mosques around you
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
