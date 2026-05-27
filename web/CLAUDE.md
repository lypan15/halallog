# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HalalLog Web** — Next.js 16 web app for the HalalLog Muslim travel planner. Part of the `halallog/web` sub-project inside the monorepo root.

> ⚠️ This is **Next.js 16** with **React 19** and **Tailwind CSS v4**. APIs and conventions differ from earlier versions. Read `node_modules/next/dist/docs/` before making changes.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 — configured via `@theme` in `globals.css`, **no `tailwind.config.js`** |
| Runtime | React 19 Server Components by default |

## Key Next.js 16 Differences

- **`params` is now a `Promise`** — always `await params` in page/layout props: `const { id } = await params`
- **Tailwind v4** uses `@import "tailwindcss"` and `@theme {}` in CSS — no JS config file
- **No `turbopack`** flag (use `next dev` directly, not `--turbopack`)
- Server Components are the default; add `"use client"` only for interactivity, hooks, or browser APIs
- Client-side env vars must be prefixed with `NEXT_PUBLIC_`

## Development Commands

```bash
# Run from halallog/web/
npm run dev     # Start dev server on http://localhost:3000
npm run build   # Production build
npm run start   # Start production server
npm run lint    # ESLint
npx tsc --noEmit  # Type-check
```

## Route Structure

```
src/app/
  layout.tsx              # Root layout: Inter font, metadata, globals.css
  globals.css             # Tailwind v4 @theme — brand colors, semantic tokens
  page.tsx                # Landing page (/)
  (app)/
    layout.tsx            # App shell with <AppNav> (sticky top nav bar)
    planner/page.tsx      # /planner — Trip Planner
    map/page.tsx          # /map     — Halal Map
    prayer/page.tsx       # /prayer  — Prayer times + Qibla
    scanner/page.tsx      # /scanner — Halal Scanner (Claude Vision)
src/components/
  layout/
    app-nav.tsx           # Top nav with 4 tab links (Client Component — usePathname)
```

## Styling Conventions

Tailwind CSS v4 CSS variables are defined in `globals.css` under `@theme`. Reference them with `var()` in className strings:
```tsx
// ✅ correct
<div className="bg-[--color-surface] text-[--color-text]">

// ✅ also correct for theme-extended colors
<div className="bg-primary-500 text-primary-600">
```

Brand palette:
- **Primary green**: `primary-500` = `#22c55e` (halal brand color)
- **Gold accent**: `gold-500` = `#f59e0b`
- **Semantic**: `--color-background`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`

## Server vs Client Components

- Pages (`page.tsx`) and layouts are **Server Components** by default — keep them that way
- Add `"use client"` only when you need `useState`, `useEffect`, event handlers, or browser APIs
- `AppNav` is a Client Component because it uses `usePathname()`
- Pass server-fetched data as **props** to Client Components

## Environment Variables

Copy `.env.example` → `.env.local`. Only `NEXT_PUBLIC_*` vars are exposed to the browser.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ANTHROPIC_API_KEY        # server-only — Claude Vision for /scanner
```

## Planned API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `app/api/scanner/route.ts` | POST | Proxy Claude Vision API (keeps key server-side) |
| `app/api/prayer/route.ts` | GET | Proxy Aladhan API (prayer times) |
