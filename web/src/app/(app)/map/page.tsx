import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Halal Map",
};

const FILTER_LAYERS = [
  { id: "halal", label: "Halal Restaurants", emoji: "🍽️", color: "bg-primary-100 text-primary-700" },
  { id: "masjid", label: "Masjid", emoji: "🕌", color: "bg-blue-100 text-blue-700" },
  { id: "prayer_room", label: "Prayer Rooms", emoji: "🙏", color: "bg-purple-100 text-purple-700" },
];

export default function MapPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-[--color-text]">Halal Map</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Find halal restaurants, mosques, and prayer rooms near you
        </p>
      </header>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_LAYERS.map((layer) => (
          <button
            key={layer.id}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80 ${layer.color}`}
          >
            <span>{layer.emoji}</span>
            <span>{layer.label}</span>
          </button>
        ))}
      </div>

      {/* Map placeholder */}
      <div className="flex h-[480px] items-center justify-center rounded-xl border border-[--color-border] bg-[--color-surface]">
        <div className="text-center">
          <span className="text-5xl">📍</span>
          <p className="mt-3 text-sm font-medium text-[--color-text-muted]">
            Google Maps will render here
          </p>
          <p className="mt-1 text-xs text-[--color-text-muted]">
            Requires <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>
          </p>
        </div>
      </div>
    </div>
  );
}
