# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HalalLog** is a global Muslim travel planner app (React Native / Expo) targeting English-speaking Muslim travelers worldwide. Core focus: day-by-day itinerary builder (Todoist-style), with Halal Map, Prayer tools, Halal Scanner, and Tour Booking layered on top. UI quality reference: Wanderlog — clean and lightweight.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Mobile | React Native 0.85 + Expo SDK 56 |
| Routing | Expo Router v56 (file-based, `src/app/`) |
| Styling | NativeWind v4 (Tailwind CSS v3) |
| State | Zustand |
| Backend / Auth / DB | Supabase |
| Language | TypeScript (strict) |

## Development Commands

```bash
npm start              # Start Expo dev server (scan QR with Expo Go)
npm run android        # Run on Android emulator/device
npm run ios            # Run on iOS simulator (macOS only)
npm run web            # Run in browser
npm run lint           # ESLint via expo lint
npx tsc --noEmit       # Type-check without building
npm run reset-project  # Reset to blank template (destructive)
```

## Environment Variables

Copy `.env.example` → `.env.local` and fill in keys. Expo exposes only `EXPO_PUBLIC_*` prefixed vars to the client bundle.

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
ANTHROPIC_API_KEY          # server-side only — never expose to client
```

## Project Structure

```
src/
  app/               # Expo Router screens (file = route)
    _layout.tsx      # Root layout: Supabase session sync, NativeWind global.css import
    (tabs)/          # Bottom tab group (Trip, Map, Prayer, Scanner)
  components/        # Shared UI components
  constants/         # Colors, API base URLs, config values
  hooks/             # Custom React hooks
  lib/
    supabase.ts      # Supabase client (AsyncStorage session persistence)
  stores/
    auth-store.ts    # Zustand: user/session, signIn, signOut
    trip-store.ts    # Zustand: trips CRUD, day-plan management
  types/
    index.ts         # Shared TypeScript types (HalalStatus, MapPlace, PrayerTimes, Tour, ScanResult)
  global.css         # Tailwind directives (@tailwind base/components/utilities)
```

## NativeWind Setup Notes

- `babel.config.js` — uses `nativewind/babel` preset + `jsxImportSource: "nativewind"`
- `metro.config.js` — wraps default config with `withNativeWind({ input: './src/global.css' })`
- `tailwind.config.js` — content glob targets `src/**`, extends with brand green (`primary-500: #22c55e`) and Islamic gold
- `nativewind-env.d.ts` — TypeScript types for `className` prop (included in `tsconfig.json`)
- Use `className` prop on all RN primitives (`View`, `Text`, `TouchableOpacity`, etc.)

## Supabase & Auth

- Client initialized in `src/lib/supabase.ts` with `AsyncStorage` for session persistence
- Auth state is synced into Zustand (`useAuthStore`) via `onAuthStateChange` in root `_layout.tsx`
- Always read auth state from `useAuthStore`, never call `supabase.auth` directly in components

## Key APIs (to be integrated)

| API | Feature | Notes |
|-----|---------|-------|
| Google Places API | Map search, travel time | Requires billing account |
| Aladhan API | Prayer times, Qibla | Free, no key needed |
| Claude Vision API | Halal Scanner OCR | Call from Supabase Edge Function (keep key server-side) |
| Viator Merchant API | Tour booking (Phase 2) | 8–12% commission |
| BeMyGuest API | Asia/Korea tours (Phase 2) | Net rate |
| AdMob | Interstitial ads | Screen transitions |

## Core Features (MVP Build Order)

1. **Trip Planner** — day-by-day itinerary, Google Places search, travel time
2. **Halal Map** — restaurant/masjid/prayer-room layers, filter UI
3. **Prayer** — prayer times (Aladhan), Qibla compass (GPS), nearby mosques
4. **Halal Scanner** — camera → Claude Vision → Halal/Haram/Doubtful verdict
5. **Tour Booking** *(Phase 2)* — Viator + BeMyGuest, in-app booking
6. **Korea Features** *(Phase 3)* — KMF DB, Muslim-friendly hotels, Creatrip affiliate
