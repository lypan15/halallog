"use client";

import { useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";

type Diet = "halal" | "vegetarian" | "pescatarian" | "vegan";

type Restaurant = {
  id: string; name: string; cuisine: string; rating: number;
  lat: number; lng: number;
  halal: boolean; vegetarian: boolean; pescatarian: boolean; vegan: boolean;
};

// Mock data — this is the adapter seam; swap to Google Places later.
const MOCK_RESTAURANTS: Restaurant[] = [
  { id: "1", name: "Eid Halal Korean Food", cuisine: "Korean", rating: 4.6, lat: 37.5340, lng: 126.9948, halal: true, vegetarian: false, pescatarian: true, vegan: false },
  { id: "2", name: "Murree Restaurant", cuisine: "Pakistani", rating: 4.4, lat: 37.5326, lng: 126.9905, halal: true, vegetarian: true, pescatarian: true, vegan: false },
  { id: "3", name: "Plant Cafe Seoul", cuisine: "Vegan", rating: 4.5, lat: 37.5392, lng: 126.9870, halal: false, vegetarian: true, pescatarian: true, vegan: true },
  { id: "4", name: "Seoul Seafood House", cuisine: "Seafood", rating: 4.2, lat: 37.5300, lng: 127.0000, halal: false, vegetarian: false, pescatarian: true, vegan: false },
  { id: "5", name: "Halal Guys Itaewon", cuisine: "Middle Eastern", rating: 4.3, lat: 37.5345, lng: 126.9945, halal: true, vegetarian: false, pescatarian: false, vegan: false },
  { id: "6", name: "Sanchon Temple Veggie", cuisine: "Temple", rating: 4.7, lat: 37.5760, lng: 126.9840, halal: false, vegetarian: true, pescatarian: false, vegan: true },
];

const FILTERS: { key: Diet; label: string }[] = [
  { key: "halal", label: "Halal" },
  { key: "vegetarian", label: "Vegetarian" },
  { key: "pescatarian", label: "Pescatarian" },
  { key: "vegan", label: "Vegan" },
];

const CENTER = { lat: 37.5345, lng: 126.9945 };

// All selected filters must match (AND). No filter = show all.
function getRestaurants(active: Diet[]): Restaurant[] {
  if (active.length === 0) return MOCK_RESTAURANTS;
  return MOCK_RESTAURANTS.filter((r) => active.every((f) => r[f]));
}

export default function EatPage() {
  const [active, setActive] = useState<Diet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const toggle = (f: Diet) =>
    setActive((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));
  const restaurants = getRestaurants(active);

  return (
    <div className="flex flex-col">
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {FILTERS.map(({ key, label }) => {
          const on = active.includes(key);
          return (
            <button key={key} onClick={() => toggle(key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${on ? "border-emerald-700 bg-emerald-700 text-white" : "border-gray-300 bg-white text-gray-700"}`}>
              {label}
            </button>
          );
        })}
      </div>

      <div className="h-[55vh] w-full">
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string}>
          <Map defaultCenter={CENTER} defaultZoom={14} mapId="DEMO_MAP_ID"
            gestureHandling="greedy" style={{ width: "100%", height: "100%" }}>
            {restaurants.map((r) => (
              <AdvancedMarker key={r.id} position={{ lat: r.lat, lng: r.lng }}
                onClick={() => setSelectedId(r.id)}>
                <Pin background={r.halal ? "#2d6a4f" : "#9ca3af"} glyphColor="#ffffff" borderColor="#ffffff" />
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
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  <span className="text-gray-500">{r.cuisine}</span>
                  {r.halal && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">Halal</span>}
                  {r.vegetarian && <span className="rounded bg-lime-100 px-1.5 py-0.5 text-lime-700">Vegetarian</span>}
                  {r.pescatarian && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-700">Pescatarian</span>}
                  {r.vegan && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-purple-700">Vegan</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
