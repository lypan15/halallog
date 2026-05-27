import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trip Planner",
};

export default function PlannerPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[--color-text]">Trip Planner</h1>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Build your day-by-day halal travel itinerary
        </p>
      </header>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[--color-border] bg-[--color-surface] py-20 text-center">
        <span className="text-5xl">🗺️</span>
        <h2 className="mt-4 text-lg font-semibold text-[--color-text]">
          No trips yet
        </h2>
        <p className="mt-1 text-sm text-[--color-text-muted]">
          Create your first trip to get started
        </p>
        <button className="mt-6 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600">
          + New Trip
        </button>
      </div>
    </div>
  );
}
