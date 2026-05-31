# CLAUDE.md — HalalLog Web (`web/`)

Web stack-specific guidance. This ADDS to the root `../CLAUDE.md` (overview,
principles, workflow, response rules) — read that too. This file is the single
source of truth for WEB technical detail.

## Tech Stack
| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 (Server Components by default) |
| Styling | Tailwind CSS v4 — via `@theme` in `globals.css`, NO `tailwind.config.js` |
| State | Zustand |
| Data (now) | Browser `localStorage` — no auth, no cross-device sync |
| Data (planned) | Supabase (auth + DB) — set up, not wired |
| Hosting | Vercel (halallog.vercel.app) |
| Language | TypeScript 5 (strict) |

## Next.js 16 / React 19 gotchas
- `params` is a Promise — `const { id } = await params` in page/layout props.
- Tailwind v4: `@import "tailwindcss"` + `@theme {}` in CSS; no JS config file.
- Server Components are the default; add `"use client"` only for hooks, event handlers, or browser APIs.
- Pass server-fetched data to Client Components as props.
- Dev runs on Turbopack.

## Dev Commands (run inside `web/`)
\```bash
npm run dev        # dev server → http://localhost:3000
npm run build      # production build (deploy gate — must pass)
npm run start      # serve production build
npm run lint       # ESLint
npx tsc --noEmit   # type-check
\```

## Route Structure
\```
src/app/
  page.tsx                       # landing (/) — OUTSIDE (app); easy to miss on renames
  globals.css                    # Tailwind v4 @theme — brand colors/tokens
  (app)/
    layout.tsx                   # app shell + <AppNav>
    planner/page.tsx             # /planner — trip list
    planner/[tripId]/page.tsx    # trip detail (Summary/Most Used/Day Plan/Cost/Checklist) — large central file
    eat/                         # /eat — Eat (renamed from old `map/`)
    prayer/page.tsx              # /prayer — Pray
    explore/                     # /explore — Explore
    scanner/                     # /scanner — Scanner (Claude Vision) [in progress]
  api/
    scanner/route.ts             # POST → proxy Claude Vision (key server-side) [planned]
    prayer/route.ts              # GET → proxy Aladhan prayer times [planned]
src/lib/
  trips-storage.ts               # trips state (localStorage)
  prayer-store.ts                # prayer settings (localStorage)
src/components/
  layout/app-nav.tsx             # nav: 5 tabs (Trips/Eat/Pray/Explore) + center Scanner FAB — Client Component (usePathname)
\```

## Styling
- Brand colors and semantic tokens are defined in `globals.css` under `@theme`. That file is the source of truth — read it; do NOT hardcode hex in components.
- Reference tokens via Tailwind / `var()`, e.g. `className="bg-[--color-surface] text-[--color-text]"`.
- Design direction: light mode default + dark toggle.

## Server vs Client
- Pages and layouts are Server Components by default — keep them so.
- Add `"use client"` only when needed (state, effects, events, browser APIs).
- localStorage-backed screens MUST guard hydration (server has no localStorage): use a `mounted` flag and render a placeholder until mounted, so the first client render matches the server.

## Environment Variables
`web/.env.local` (gitignored). Only `NEXT_PUBLIC_*` reaches the browser. On Vercel, set the same vars in Project Settings. Never commit keys.
\```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY   # Maps/Places (client) — restrict by referrer
ANTHROPIC_API_KEY                 # server-only — Claude Vision for /scanner
NEXT_PUBLIC_SUPABASE_URL          # (later)
NEXT_PUBLIC_SUPABASE_ANON_KEY     # (later)
\```

## Web Coding Conventions
- Functional components; clear, intuitive names.
- One-line purpose comment on NEW logic; don't touch unrelated existing comments/code/formatting.
- Match existing code style (quotes, indentation).