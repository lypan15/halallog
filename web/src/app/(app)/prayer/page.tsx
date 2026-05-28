import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pray",
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
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-[--color-text]">Prayer</h1>
      </header>

      <section className="grid grid-cols-3 gap-2">
        {[
          { href: "/qibla", label: "Qibla", icon: "🧭" },
          { href: "/mosques", label: "Mosques", icon: "🕌" },
          { href: "/ramadan", label: "Ramadan", icon: "🌙" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-[--color-border] bg-[--color-surface] p-3 text-center shadow-sm transition-colors hover:border-primary-600"
          >
            <p className="text-xl">{item.icon}</p>
            <p className="mt-1 text-xs font-semibold text-[--color-text]">{item.label}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-2xl border border-[--color-border] bg-[--color-surface] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-[--color-text]">Today&apos;s Prayer Times</h2>
          <span className="text-xs text-[--color-text-muted]">Auto by location</span>
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
              <span className="text-sm font-mono text-[--color-text-muted]">—:—</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
