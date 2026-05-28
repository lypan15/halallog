import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trips",
};

export default function PlannerPage() {
  const trips = [
    { id: "seoul-spring", title: "Seoul Spring Escape", days: "4 days", date: "Jun 12 - Jun 15" },
    { id: "istanbul-weekend", title: "Istanbul Weekend", days: "3 days", date: "Jul 02 - Jul 04" },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-[--color-text]">Trips</h1>
      </header>

      <button className="w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700">
        + Add New Trip
      </button>

      <div className="space-y-3">
        {trips.map((trip) => (
          <article
            key={trip.id}
            className="rounded-xl border border-[--color-border] bg-[--color-surface] p-4 shadow-sm"
          >
            <h2 className="font-semibold text-[--color-text]">{trip.title}</h2>
            <p className="mt-1 text-sm text-[--color-text-muted]">
              {trip.days} · {trip.date}
            </p>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-[--color-border] bg-[--color-surface] p-5 text-center">
        <p className="text-sm text-[--color-text-muted]">
          Keep your itinerary simple: flights, halal food spots, and prayer-friendly stops.
        </p>
      </div>
    </div>
  );
}
