"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { searchNearbyMosques, haversine, formatDistance, type Place } from "@/lib/places";

type ShowCategory = "mosque" | "prayerRoom";

const SHOW_OPTIONS: { key: ShowCategory; label: string }[] = [
  { key: "mosque", label: "Mosque" },
  { key: "prayerRoom", label: "Prayer space" },
];

const CENTER = { lat: 37.5345, lng: 126.9945 };

// Map pin color by category: mosque → brand green, prayer room → teal.
function pinColor(category: Place["category"]): string {
  return category === "mosque" ? "#2d6a4f" : "#0d9488";
}

function categoryLabel(category: Place["category"]): string {
  return category === "mosque" ? "Mosque" : "Prayer space";
}

function categoryBadgeClass(category: Place["category"]): string {
  const base = "rounded px-1.5 py-0.5";
  return category === "mosque" ? `${base} bg-emerald-100 text-emerald-800` : `${base} bg-teal-100 text-teal-700`;
}

// Build a neighbourhood-level label from geocoder components: 동/sublocality + 구 + city.
// Drops street number/name and country. Falls back gracefully when components are missing.
function shortAddress(result: google.maps.GeocoderResult): string {
  const comps = result.address_components;
  const pick = (types: string[]) =>
    comps.find((c) => types.some((t) => c.types.includes(t)))?.long_name;
  const neighbourhood = pick(["sublocality_level_2", "neighborhood"]);
  const district = pick(["sublocality_level_1", "administrative_area_level_2"]);
  const city = pick(["locality", "administrative_area_level_1"]);
  const parts = [neighbourhood, district, city].filter((p): p is string => !!p);
  return parts.filter((p, i) => parts.indexOf(p) === i).join(", ");
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

// "My location" control. Uses browser geolocation (free) and panTo() so a recenter
// doesn't fight the user's manual panning. Renders inline inside the controls stack.
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
      <button onClick={locate} aria-label="My location"
        className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-md">
        📍 My location
      </button>
      {error && (
        <p className="rounded bg-white px-2 py-1 text-xs text-red-600 shadow">
          Couldn&apos;t get your location
        </p>
      )}
    </>
  );
}

export default function MosquesPage() {
  const [all, setAll] = useState<Place[]>([]);
  const [shown, setShown] = useState<ShowCategory[]>(["mosque", "prayerRoom"]);
  // Single search center shared by the My-location recenter and the address bar.
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number }>(CENTER);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const geocodingLib = useMapsLibrary("geocoding");
  const [address, setAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  // Load nearby mosques once (mock now; swap source in lib/places.ts later).
  useEffect(() => {
    searchNearbyMosques().then(setAll);
  }, []);

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
        const r = results[0];
        setAddress(r ? shortAddress(r) || r.formatted_address : null);
        setAddressLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAddress(null);
        setAddressLoading(false);
      });
    return () => { cancelled = true; };
  }, [geocodingLib, searchCenter]);

  const toggleShown = (c: ShowCategory) =>
    setShown((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  // My-location tap: drop the user marker AND move the shared search center.
  const handleLocate = (pos: { lat: number; lng: number }) => {
    setUserPos(pos);
    setSearchCenter(pos);
  };

  const places = all.filter((p) => shown.includes(p.category as ShowCategory));

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-3">
        <Link
          href="/prayer"
          className="inline-flex rounded-lg border border-[--color-border] px-3 py-1.5 text-sm font-medium text-[--color-text-muted] transition-colors hover:text-[--color-text]"
        >
          ← Back to Pray
        </Link>
      </div>

      <div className="relative mt-3 h-[55vh] w-full">
        <Map id="mosques-map" defaultCenter={CENTER} defaultZoom={15} mapId="DEMO_MAP_ID"
          gestureHandling="greedy" streetViewControl={false} style={{ width: "100%", height: "100%" }}>
          {places.map((p) => (
            <AdvancedMarker key={p.id} position={{ lat: p.lat, lng: p.lng }}>
              <Pin background={pinColor(p.category)} glyphColor="#ffffff" borderColor="#ffffff" />
            </AdvancedMarker>
          ))}
          {userPos && (
            <AdvancedMarker position={userPos}>
              <Pin background="#2563eb" glyphColor="#ffffff" borderColor="#ffffff" />
            </AdvancedMarker>
          )}
        </Map>
        {/* Category toggles overlaid top-center — clear of Google's native controls. */}
        <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 gap-2">
          {SHOW_OPTIONS.map(({ key, label }) => (
            <Chip key={key} label={label} on={shown.includes(key)} onClick={() => toggleShown(key)} />
          ))}
        </div>
        {/* My-location control, above the bottom-left Google logo. */}
        <div className="absolute bottom-8 left-4 z-10 flex flex-col items-start gap-2">
          <MyLocationButton mapId="mosques-map" onLocate={handleLocate} />
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
          {addressLoading ? "Locating…" : address ? `Current location: ${address}` : "Location unavailable"}
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="mb-2 text-sm text-gray-500">{places.length} places</p>
        {places.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">No places match these filters.</p>
        ) : (
          <ul className="space-y-2">
            {places.map((p) => (
              <li key={p.id} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-start justify-between">
                  <span className="font-medium text-gray-900">{p.name}</span>
                  <span className="text-sm text-gray-500">{formatDistance(haversine(searchCenter, p))}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className={categoryBadgeClass(p.category)}>{categoryLabel(p.category)}</span>
                  {p.address && <span className="text-gray-500">{p.address}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
