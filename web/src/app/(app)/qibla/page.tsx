import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Qibla Compass",
};

export default function QiblaPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[--color-text]">Qibla Compass</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Dedicated direction screen for quick prayer preparation
        </p>
      </header>

      <div className="rounded-xl border border-[--color-border] bg-[--color-surface] p-6">
        <div className="flex flex-col items-center justify-center gap-4 py-6 text-center">
          <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-primary-200 bg-primary-50 text-6xl">
            🧭
          </div>
          <p className="text-sm text-[--color-text-muted]">
            Enable location and motion permissions to calculate direction.
          </p>
          <button className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600">
            Enable Sensors
          </button>
        </div>
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
