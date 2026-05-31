"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { searchNearbyRestaurants, getPlaceDetails, type Place, type Diet, type HalalTier, type Constraint, type PlaceDetails } from "@/lib/places";

const TIERS: { key: HalalTier; label: string }[] = [
  { key: "certified", label: "Halal Certified" },
  { key: "self", label: "Muslim-owned" },
  { key: "options", label: "Halal options" },
];

const CONSTRAINTS: { key: Constraint; label: string }[] = [
  { key: "porkFree", label: "Pork-free" },
  { key: "alcoholFree", label: "Alcohol-free" },
];

const DIETS: { key: Diet; label: string }[] = [
  { key: "vegetarian", label: "Vegetarian" },
  { key: "pescatarian", label: "Pescatarian" },
  { key: "vegan", label: "Vegan" },
];

const CENTER = { lat: 37.5345, lng: 126.9945 };

// Map pin color by halal tier: darkest green → certified, medium → self, amber → options, gray → none.
function pinColor(tier?: HalalTier): string {
  switch (tier) {
    case "certified": return "#14532d";
    case "self": return "#2d6a4f";
    case "options": return "#f59e0b";
    default: return "#9ca3af";
  }
}

function tierLabel(tier: HalalTier): string {
  return TIERS.find((t) => t.key === tier)?.label ?? tier;
}

function tierBadgeClass(tier: HalalTier): string {
  const base = "rounded px-1.5 py-0.5";
  if (tier === "certified") return `${base} bg-emerald-100 text-emerald-800`;
  if (tier === "self") return `${base} bg-emerald-50 text-emerald-700`;
  return `${base} bg-amber-100 text-amber-700`;
}

// Shared chip style — matches the original filter buttons.
function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${on ? "border-emerald-700 bg-emerald-700 text-white" : "border-gray-300 bg-white text-gray-700"}`}>
      {label}
    </button>
  );
}

export default function EatPage() {
  const [all, setAll] = useState<Place[]>([]);
  const [tier, setTier] = useState<HalalTier | null>(null);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [diets, setDiets] = useState<Diet[]>([]);
  const [prayerOnly, setPrayerOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Load nearby restaurants once (mock now; swap source in lib/places.ts later).
  useEffect(() => {
    searchNearbyRestaurants().then(setAll);
  }, []);

  // Fetch the "expensive" details only when the panel opens (on tap), not per list item.
  useEffect(() => {
    if (selectedId === null) {
      setDetails(null);
      return;
    }
    setDetailsLoading(true);
    let cancelled = false;
    getPlaceDetails(selectedId).then((d) => {
      if (cancelled) return;
      setDetails(d);
      setDetailsLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  // Halal tier is single-select: clicking the active one clears it.
  const selectTier = (t: HalalTier) => setTier((p) => (p === t ? null : t));
  const toggleConstraint = (c: Constraint) =>
    setConstraints((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const toggleDiet = (d: Diet) =>
    setDiets((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));

  // Passes only if it matches the selected tier AND every selected constraint AND
  // every selected diet AND has a prayer space when that toggle is on. No selection = no filtering.
  const restaurants = all.filter((r) =>
    (tier === null || r.halalTier === tier) &&
    constraints.every((c) => r[c]) &&
    diets.every((d) => r[d]) &&
    (!prayerOnly || r.hasPrayerRoom)
  );

  const selected = selectedId === null ? null : all.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="flex flex-col">
      <div className="space-y-3 px-4 py-3">
        <div>
          <p className="mb-1 text-xs text-gray-500">Halal</p>
          <div className="flex gap-2 overflow-x-auto">
            {TIERS.map(({ key, label }) => (
              <Chip key={key} label={label} on={tier === key} onClick={() => selectTier(key)} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-gray-500">Constraints</p>
          <div className="flex gap-2 overflow-x-auto">
            {CONSTRAINTS.map(({ key, label }) => (
              <Chip key={key} label={label} on={constraints.includes(key)} onClick={() => toggleConstraint(key)} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-gray-500">Diet</p>
          <div className="flex gap-2 overflow-x-auto">
            {DIETS.map(({ key, label }) => (
              <Chip key={key} label={label} on={diets.includes(key)} onClick={() => toggleDiet(key)} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-gray-500">Amenity</p>
          <div className="flex gap-2 overflow-x-auto">
            <Chip label="Prayer space" on={prayerOnly} onClick={() => setPrayerOnly((v) => !v)} />
          </div>
        </div>
      </div>

      <div className="h-[55vh] w-full">
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string}>
          <Map defaultCenter={CENTER} defaultZoom={14} mapId="DEMO_MAP_ID"
            gestureHandling="greedy" style={{ width: "100%", height: "100%" }}>
            {restaurants.map((r) => (
              <AdvancedMarker key={r.id} position={{ lat: r.lat, lng: r.lng }}
                onClick={() => setSelectedId(r.id)}>
                <Pin background={pinColor(r.halalTier)} glyphColor="#ffffff" borderColor="#ffffff" />
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>
      </div>

      <div className="px-4 py-3">
        <p className="mb-2 text-sm text-gray-500">{restaurants.length} places</p>
        {restaurants.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">No places match these filters.</p>
        ) : (
          <ul className="space-y-2">
            {restaurants.map((r) => (
              <li key={r.id} onClick={() => setSelectedId(r.id)}
                className={`cursor-pointer rounded-lg border p-3 ${selectedId === r.id ? "border-emerald-700 bg-emerald-50" : "border-gray-200 bg-white"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{r.name}</span>
                  <span className="text-sm text-gray-500">★ {r.rating}</span>
                </div>
                {r.address && <p className="mt-0.5 text-xs text-gray-500">{r.address}</p>}
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  <span className="text-gray-500">{r.cuisine}</span>
                  {r.halalTier && <span className={tierBadgeClass(r.halalTier)}>{tierLabel(r.halalTier)}</span>}
                  {r.vegetarian && <span className="rounded bg-lime-100 px-1.5 py-0.5 text-lime-700">Vegetarian</span>}
                  {r.pescatarian && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-700">Pescatarian</span>}
                  {r.vegan && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-purple-700">Vegan</span>}
                  {r.hasPrayerRoom && <span className="rounded bg-teal-100 px-1.5 py-0.5 text-teal-700">Prayer space</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detail panel — bottom sheet; backdrop and X both close (clear selectedId). */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setSelectedId(null)}>
          <div className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selected.name}</h2>
                {selected.address && <p className="mt-0.5 text-sm text-gray-500">{selected.address}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-sm text-gray-500">★ {selected.rating}</span>
                  {selected.halalTier && <span className={tierBadgeClass(selected.halalTier)}>{tierLabel(selected.halalTier)}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} aria-label="Close"
                className="shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="mt-4">
              {detailsLoading || !details ? (
                <p className="py-4 text-center text-sm text-gray-500">Loading details…</p>
              ) : (
                <div className="space-y-3">
                  {details.openNow !== undefined && (
                    <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${details.openNow ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                      {details.openNow ? "Open now" : "Closed"}
                    </span>
                  )}
                  {details.hours && details.hours.length > 0 && (
                    <ul className="space-y-0.5 text-sm text-gray-600">
                      {details.hours.map((h) => <li key={h}>{h}</li>)}
                    </ul>
                  )}
                  {details.phone && <p className="text-sm text-gray-600">{details.phone}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
