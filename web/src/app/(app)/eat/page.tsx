"use client";

import { useEffect, useState } from "react";
import { Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
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

// Radius presets just pick a zoom level (smaller radius = closer). No circle, no distance filter.
const RADII: { value: number; label: string; zoom: number }[] = [
  { value: 500, label: "500 m", zoom: 16 },
  { value: 1000, label: "1 km", zoom: 15 },
  { value: 2000, label: "2 km", zoom: 14 },
  { value: 5000, label: "5 km", zoom: 13 },
];

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

// Floating "My location" control. Uses browser geolocation (free) and panTo() so a
// recenter doesn't fight the user's manual panning. Lives inside APIProvider for useMap().
function MyLocationButton({ mapId, onLocate }: { mapId: string; onLocate: (pos: { lat: number; lng: number }) => void }) {
  const map = useMap(mapId);
  const [error, setError] = useState(false);

  const locate = () => {
    setError(false);
    if (!navigator.geolocation) {
      setError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude };
        onLocate(next);
        map?.panTo(next);
      },
      () => setError(true) // permission denied / unavailable: keep current center
    );
  };

  return (
    <>
      {error && (
        <p className="absolute bottom-16 left-4 z-10 rounded bg-white px-2 py-1 text-xs text-red-600 shadow">
          Couldn&apos;t get your location
        </p>
      )}
      <button onClick={locate} aria-label="My location"
        className="absolute bottom-4 left-4 z-10 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-md">
        📍 My location
      </button>
    </>
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
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  // Single search center shared by the map zoom/recenter and the address bar.
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number }>(CENTER);
  const [radius, setRadius] = useState(1000);
  const geocodingLib = useMapsLibrary("geocoding");
  const [address, setAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const map = useMap("eat-map");

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

  // Reverse-geocode the search center → address. Runs ONLY for the initial center
  // and when searchCenter changes (the My-location tap), never on map pan — keeps cost low.
  useEffect(() => {
    if (!geocodingLib) return; // geocoder not ready yet → bar shows "Location unavailable"
    setAddressLoading(true);
    let cancelled = false;
    const geocoder = new geocodingLib.Geocoder();
    geocoder
      .geocode({ location: searchCenter })
      .then(({ results }) => {
        if (cancelled) return;
        setAddress(results[0]?.formatted_address ?? null);
        setAddressLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAddress(null);
        setAddressLoading(false);
      });
    return () => { cancelled = true; };
  }, [geocodingLib, searchCenter]);

  // Radius preset = zoom level. Recenter on the search center and apply the matching
  // zoom whenever either changes (no circle, no fitBounds — that was the zoom-out cause).
  useEffect(() => {
    if (!map) return;
    const zoom = RADII.find((r) => r.value === radius)?.zoom ?? 15;
    map.panTo(searchCenter);
    map.setZoom(zoom);
  }, [map, searchCenter, radius]);

  // Halal tier is single-select: clicking the active one clears it.
  const selectTier = (t: HalalTier) => setTier((p) => (p === t ? null : t));
  const toggleConstraint = (c: Constraint) =>
    setConstraints((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const toggleDiet = (d: Diet) =>
    setDiets((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));

  // My-location tap: drop the user marker AND move the shared search center
  // (circle, distance filter, and address bar all key off searchCenter).
  const handleLocate = (pos: { lat: number; lng: number }) => {
    setUserPos(pos);
    setSearchCenter(pos);
  };

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
      <div className="relative h-[55vh] w-full">
        <Map id="eat-map" defaultCenter={CENTER} defaultZoom={14} mapId="DEMO_MAP_ID"
          gestureHandling="greedy" streetViewControl={false} style={{ width: "100%", height: "100%" }}>
          {restaurants.map((r) => (
            <AdvancedMarker key={r.id} position={{ lat: r.lat, lng: r.lng }}
              onClick={() => setSelectedId(r.id)}>
              <Pin background={pinColor(r.halalTier)} glyphColor="#ffffff" borderColor="#ffffff" />
            </AdvancedMarker>
          ))}
          {userPos && (
            <AdvancedMarker position={userPos}>
              <Pin background="#2563eb" glyphColor="#ffffff" borderColor="#ffffff" />
            </AdvancedMarker>
          )}
        </Map>
        <MyLocationButton mapId="eat-map" onLocate={handleLocate} />
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
          {addressLoading ? "Locating…" : address ? `Near: ${address}` : "Location unavailable"}
        </div>
      </div>

      {/* Single scrollable row holding every filter chip — tier (single), constraints/diet (multi), amenity, radius (single). */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        {TIERS.map(({ key, label }) => (
          <Chip key={key} label={label} on={tier === key} onClick={() => selectTier(key)} />
        ))}
        {CONSTRAINTS.map(({ key, label }) => (
          <Chip key={key} label={label} on={constraints.includes(key)} onClick={() => toggleConstraint(key)} />
        ))}
        {DIETS.map(({ key, label }) => (
          <Chip key={key} label={label} on={diets.includes(key)} onClick={() => toggleDiet(key)} />
        ))}
        <Chip label="Prayer space" on={prayerOnly} onClick={() => setPrayerOnly((v) => !v)} />
        {RADII.map(({ value, label }) => (
          <Chip key={value} label={label} on={radius === value} onClick={() => setRadius(value)} />
        ))}
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

      {/* Detail panel — centered modal; backdrop and X both close (clear selectedId). */}
      {selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedId(null)}>
          <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex shrink-0 items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selected.name}</h2>
                {selected.address && (
                  <p className="mt-0.5 flex items-start gap-1.5 text-sm text-gray-500">
                    <span aria-hidden>📍</span>
                    <span>{selected.address}</span>
                  </p>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700"
                >
                  🧭 Directions
                </a>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-sm text-gray-500">★ {selected.rating}</span>
                  {selected.halalTier && <span className={tierBadgeClass(selected.halalTier)}>{tierLabel(selected.halalTier)}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} aria-label="Close"
                className="shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="mt-4 min-h-0 overflow-y-auto">
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
                    <div className="flex items-start gap-1.5 text-sm text-gray-600">
                      <span aria-hidden>🕐</span>
                      <ul className="space-y-0.5">
                        {details.hours.map((h) => <li key={h}>{h}</li>)}
                      </ul>
                    </div>
                  )}
                  {details.phone && (
                    <p className="flex items-center gap-1.5 text-sm text-gray-600">
                      <span aria-hidden>📞</span>
                      <span>{details.phone}</span>
                      <a href={`tel:${details.phone}`}
                        className="ml-1 inline-flex items-center rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                        Call
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
