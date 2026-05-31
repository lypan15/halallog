"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { haversine } from "@/lib/places";

// Kaaba, Mecca.
const KAABA = { lat: 21.4225, lng: 39.8262 };

// Great-circle initial bearing from `from` to `to`, degrees clockwise from true north (0–360).
function qiblaBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const f1 = toRad(from.lat);
  const f2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export default function QiblaPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [compassOn, setCompassOn] = useState(false);
  const [compassError, setCompassError] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);

  // Geolocation → user position (graceful on denial).
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGeoError(true)
    );
  }, []);

  // Live compass — only while enabled. iOS exposes webkitCompassHeading; Android fires
  // deviceorientationabsolute, from which heading ≈ 360 − alpha.
  useEffect(() => {
    if (!compassOn) return;
    const handler = (e: DeviceOrientationEvent) => {
      const ev = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      let h: number | null = null;
      if (typeof ev.webkitCompassHeading === "number") h = ev.webkitCompassHeading;
      else if (ev.absolute && ev.alpha != null) h = 360 - ev.alpha;
      if (h != null) setHeading(((h % 360) + 360) % 360);
    };
    window.addEventListener("deviceorientationabsolute", handler, true);
    window.addEventListener("deviceorientation", handler, true);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handler, true);
      window.removeEventListener("deviceorientation", handler, true);
    };
  }, [compassOn]);

  // iOS Safari needs DeviceOrientationEvent.requestPermission() from a user tap.
  const enableCompass = async () => {
    setCompassError(false);
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (DOE && typeof DOE.requestPermission === "function") {
      try {
        const res = await DOE.requestPermission();
        if (res !== "granted") {
          setCompassError(true);
          return;
        }
      } catch {
        setCompassError(true);
        return;
      }
    }
    setCompassOn(true);
  };

  const bearing = coords ? qiblaBearing(coords, KAABA) : null;
  const distanceKm = coords ? haversine(coords, KAABA) / 1000 : null;
  // Rotate the whole dial by the live heading so the needle keeps pointing at Mecca.
  const dialHeading = compassOn && heading != null ? heading : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[--color-text]">Qibla Compass</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Dedicated direction screen for quick prayer preparation
        </p>
      </header>

      <div className="rounded-xl border border-[--color-border] bg-[--color-surface] p-6">
        {bearing == null ? (
          <div className="flex flex-col items-center justify-center gap-4 py-6 text-center">
            <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-primary-200 bg-primary-50 text-6xl">
              🧭
            </div>
            <p className="text-sm text-[--color-text-muted]">
              {geoError
                ? "Couldn't get your location. Enable location access to find the Qibla."
                : "Locating…"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-2 text-center">
            <svg viewBox="0 0 200 200" className="h-56 w-56">
              <circle cx="100" cy="100" r="92" fill="var(--color-background)" stroke="var(--color-border)" strokeWidth="4" />
              <g transform={`rotate(${-dialHeading} 100 100)`}>
                <text x="100" y="28" textAnchor="middle" fontSize="15" fontWeight="700" fill="#475569">N</text>
                <text x="176" y="106" textAnchor="middle" fontSize="15" fontWeight="600" fill="#94a3b8">E</text>
                <text x="100" y="184" textAnchor="middle" fontSize="15" fontWeight="600" fill="#94a3b8">S</text>
                <text x="24" y="106" textAnchor="middle" fontSize="15" fontWeight="600" fill="#94a3b8">W</text>
                <g transform={`rotate(${bearing} 100 100)`}>
                  <polygon points="100,20 90,104 110,104" fill="#16a34a" />
                  <polygon points="100,176 94,104 106,104" fill="#cbd5e1" />
                  <circle cx="100" cy="100" r="7" fill="#0f172a" />
                </g>
              </g>
            </svg>

            <div>
              <p className="text-2xl font-bold text-[--color-text]">{Math.round(bearing)}°</p>
              <p className="mt-1 text-sm text-[--color-text-muted]">
                {Math.round(distanceKm ?? 0).toLocaleString()} km to Mecca
              </p>
            </div>

            {!compassOn && (
              <button
                onClick={enableCompass}
                className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
              >
                Enable compass
              </button>
            )}
            {compassError && (
              <p className="text-sm text-red-600">
                Compass unavailable or permission denied — showing the fixed bearing.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[--color-border] bg-[--color-surface] p-5">
        <h2 className="font-semibold text-[--color-text]">Usage Tips</h2>
        <ul className="mt-3 space-y-2 text-sm text-[--color-text-muted]">
          <li>• Keep your phone flat for better compass accuracy.</li>
          <li>• Stay away from strong magnetic objects when calibrating.</li>
          <li>• Verify once before prayer if GPS signal is weak.</li>
        </ul>
      </div>

      <Link
        href="/prayer"
        className="inline-flex items-center rounded-lg border border-[--color-border] px-3 py-2 text-sm font-medium text-[--color-text-muted] transition-colors hover:bg-[--color-surface]"
      >
        Back to Pray
      </Link>
    </div>
  );
}
