# CLAUDE.md — HalalLog (monorepo root)

Project-wide guidance for Claude Code. Each app subfolder has its own CLAUDE.md
with stack-specific detail (e.g. `web/CLAUDE.md`). This file holds only what
applies across the whole project. When working inside a subfolder, that folder's
CLAUDE.md ADDS to (does not replace) this one.

## Project Overview
HalalLog is a travel planner for English-speaking Muslim travelers. Core: a
Todoist-style day-by-day trip planner, plus Halal restaurant search, Prayer
tools, a Claude-Vision Halal Scanner, and affiliate tour booking. UI reference:
Wanderlog (clean, light).

Tabs: **Trips / Eat / Scanner (center FAB) / Pray / Explore** (+ My/profile, last).
- Trips (core): Summary · Most Used (flights/hotels) · Day Plan (categories: Place, Food, Prayer Space, Things to Do, Shopping, Transport, Other) · Cost (auto-linked from Day Plan/flight/stay prices) · Checklist
- Eat: nearby restaurant search + filters (Halal / Vegetarian / Pescatarian / Vegan) + map
- Scanner (core differentiator): camera → Claude Vision → Halal / Haram / Doubtful (disclaimer required)
- Pray: Qibla · Mosques · Today's Prayer Times (GPS, alarm) · Ramadan (TBD)
- Explore (core / revenue): Viator + BeMyGuest OTA affiliate tours

## Build Roadmap
1. **Web app** (current) — Next.js, in `web/`. Build features on mock/localStorage data.
2. **Design pass** — polish UI/UX once features work.
3. **Mobile app** (final) — port to React Native + Expo + NativeWind. NOT started; do not add mobile/Expo code yet.

Backend: data is currently in browser localStorage (no auth, no sync). Supabase
(auth + DB) is planned, not wired. All external data is mocked for now.

## Core Principles
1. Think Before Coding — Don't assume. If ambiguous, state assumptions and ask first. Present multiple interpretations. If a simpler way exists, say so.
2. Simplicity First — Minimum code that solves the problem. No unrequested features/abstractions/flexibility. If 200 lines could be 50, rewrite.
3. Surgical Changes — Touch only what you must. Every changed line traces to the request. Don't edit unrelated code/comments/formatting; don't refactor what isn't broken.
4. Goal-Driven Execution — Define "what passes = done". Verify with build/tsc/tests. Split multi-step work into STEPs; verify each.

## Workflow & Version Control
- Work in small units (STEPs), sequentially. Give SHORT English STEP commands (long pastes truncate).
- Summarize progress before hitting context limits.
- When a feature/debug is done: list changed files + summary, then Commit & Push that unit.
- On any route/folder rename, grep the OLD path across ALL of `src/` and confirm 0 leftover references (files outside route groups — e.g. the root `page.tsx` — are easy to miss).
- Large refactors or file splits ONLY when explicitly requested.

## Response Rules
- If a request is ambiguous, ask first — don't guess and code (overrides "skip preamble").
- On errors, give a logical analysis of the most likely cause before listing fixes.
- Skip unnecessary preamble; focus on code and technical explanation.
- Flag anything uncertain as "uncertain"; if it's a guess, say so.