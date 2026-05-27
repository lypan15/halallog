import Link from "next/link";

const FEATURES = [
  {
    href: "/planner",
    icon: "🗺️",
    title: "Trip Planner",
    desc: "Build day-by-day halal itineraries with smart place search",
  },
  {
    href: "/map",
    icon: "📍",
    title: "Halal Map",
    desc: "Discover halal restaurants, mosques, and prayer rooms worldwide",
  },
  {
    href: "/prayer",
    icon: "🕌",
    title: "Prayer Times",
    desc: "Accurate prayer times, Qibla direction, and nearby mosques",
  },
  {
    href: "/scanner",
    icon: "📷",
    title: "Halal Scanner",
    desc: "Scan food labels instantly — Halal, Doubtful, or Haram",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-[--color-border]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌙</span>
            <span className="font-bold text-lg text-primary-600">HalalLog</span>
          </div>
          <Link
            href="/planner"
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
          >
            Open App
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700">
          🌍 Muslim travel, simplified
        </div>
        <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-[--color-text] sm:text-5xl">
          Plan your perfect{" "}
          <span className="text-primary-600">halal trip</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-[--color-text-muted]">
          Find halal food, prayer times, and mosques anywhere in the world.
          All in one place, designed for Muslim travelers.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/planner"
            className="rounded-xl bg-primary-500 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
          >
            Start Planning →
          </Link>
          <Link
            href="/map"
            className="rounded-xl border border-[--color-border] bg-[--color-surface] px-6 py-3 text-base font-semibold text-[--color-text] transition-colors hover:bg-[--color-border]"
          >
            Explore Map
          </Link>
        </div>
      </section>

      {/* Feature section */}
      <section className="border-t border-[--color-border] bg-[--color-surface] py-12 sm:py-16">
        {/* Title */}
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-8 text-center text-2xl font-bold text-[--color-text] sm:mb-10">
            Everything a Muslim traveler needs
          </h2>
        </div>

        {/*
          Mobile  : horizontal scroll slider (flex + snap)
          sm+     : 2-column grid
          lg+     : 4-column grid
          -mx / px trick makes the slider bleed to screen edges on mobile
          while the sm: variant re-contains it inside max-w-6xl
        */}
        <div
          className={[
            /* mobile: full-bleed horizontal scroller */
            "flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory",
            "px-4 pb-4",
            /* sm+: switch to contained grid */
            "sm:mx-auto sm:max-w-6xl sm:px-4",
            "sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0",
            /* lg+: 4-column grid */
            "lg:grid-cols-4",
          ].join(" ")}
        >
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className={[
                "group rounded-xl border border-[--color-border] bg-[--color-background] p-6",
                "transition-shadow hover:shadow-md",
                /* mobile: fixed width so cards peek (75 vw ≈ 3/4 screen) */
                "shrink-0 w-[75vw] max-w-[300px]",
                /* sm+: let the grid control width */
                "sm:w-auto sm:shrink",
              ].join(" ")}
            >
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-3 font-semibold text-[--color-text] group-hover:text-primary-600">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-[--color-text-muted]">{f.desc}</p>
            </Link>
          ))}
        </div>

        {/* Swipe hint — visible only on mobile */}
        <p className="mt-3 text-center text-xs text-[--color-text-muted] sm:hidden">
          Swipe to explore →
        </p>
      </section>

      <footer className="border-t border-[--color-border] py-6 text-center text-xs text-[--color-text-muted]">
        © 2026 HalalLog. Built for Muslim travelers worldwide.
      </footer>
    </div>
  );
}
