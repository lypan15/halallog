# Trips Feature — Data Flow Map

> Read-only analysis of what the code **actually does** (not what it should do).
> Sources:
> - `web/src/lib/trips-storage.ts` (persistence + types)
> - `web/src/app/(app)/planner/[tripId]/page.tsx` (the entire trip-detail UI — ~2,524 lines, single file)

---

## 1. Data Model

All trip data lives in **browser localStorage**. Two keys:

| Key | Shape | Written by |
|-----|-------|-----------|
| `halallog-trips` | `TripRecord[]` | trip list / edit |
| `halallog-trip-detail-<tripId>` | `TripDetailRecord` | trip-detail page (auto-saved on every change) |

### Exported types (`trips-storage.ts`)

**`TripRecord`** — the trip summary card
```ts
{ id, title, tripName?, description?, destination, startDate, endDate,
  companion, styles[], createdAt }
```

**`TripPlace`** — a Day Plan entry (also reused for "note" rows)
```ts
{ id, name, category, icon, time?, endTime?, duration?, noteBody?,
  type?: "note", period?, subType?, price?, priceCurrency?,
  address?, lat?, lng? }
```

**`TripBudgetItem`** — a Cost row
```ts
{ id, category, subcategory, amount, date, currencyCode?, isPaid? }
```

**`TripChecklistItem`** = `{ id, text, done }`
**`TripChecklistSections`** = `{ essential[], packing[], quick[] }`

**`FlightItem`**
```ts
{ id, from, to, departureDate, departureTime, arrivalDate, arrivalTime,
  airline, flightNumber, attachmentName?, price?, priceCurrency? }
```

**`StayItem`** — ⚠️ **no `price` field**
```ts
{ id, propertyName, checkInDate, checkInTime, checkOutDate, checkOutTime,
  address, attachmentName? }
```

**`TransportItem`** = `{ id, type, from, to, date, time }` — *type is exported but never used by the detail page's persisted state.*

**`EssentialInfo`** = `{ flights: FlightItem[], stays: StayItem[] }`

### `TripDetailRecord` — the detail blob (full shape)
```ts
{
  notesByDay:        Record<number, string>;      // day index → free-text memo
  placesByDay:       Record<number, TripPlace[]>;  // day index → Day Plan items
  budgetItems:       TripBudgetItem[];             // flat Cost list
  checklistSections: TripChecklistSections;        // { essential, packing, quick }
  essentialInfo:     EssentialInfo;                // { flights, stays }
}
```

### Exported functions
- `getTrips()` → seeds two `DEFAULT_TRIPS` (Seoul, Istanbul) on first run.
- `saveTrips(trips)`, `upsertTrip(trip)`, `deleteTrip(id)`, `getTripById(id)`
- `getTripDetail(id)` — on read, back-fills missing `essentialInfo` and **strips legacy budget seed ids `b1`/`b2`**.
- `saveTripDetail(id, detail)`, `defaultTripDetail()`
- `slugifyTripId(value)`, `formatTripDateRange(start, end)`, `countTripDays(start, end)`

---

## 2. Tabs and Shared State

The detail page is a single client component. Tab ids (internal → label):

| Internal id | Tab label | Role |
|-------------|-----------|------|
| `summary` | **Summary** | Read-only chronological timeline assembled from flights + stays + Day Plan. Each row has Edit / Delete that jump back to the source tab. |
| `essential` | **Most Used** | Add/edit/delete **flights** and **stays**. Both forms can attach a price. |
| `day_plan` | **Day Plan** | Per-day list of `TripPlace` items via a category FAB. Drag-to-reorder. Price optional. |
| `budget` | **Cost** | **Read-only display** of `budgetItems`, grouped by day + an "Other" bucket, plus a manual "+ Add Cost" form. No edit/delete in the list. |
| `checklist` | **Checklist** | Toggle essential/packing items, add quick items. |

**State sharing:** every tab reads/writes the same top-level `useState` hooks in `TripDetailPage` — `essentialInfo`, `placesByDay`, `notesByDay`, `budgetItems`, `checklistSections`. A single `useEffect` (deps on all of them) calls `saveTripDetail` on **every** change, so all tabs persist together. There is no context/store — it's all prop-less local state in one component.

---

## 3. Cross-Tab Data Flow

### ID-prefix convention for `budgetItems`
The linkage between source records and Cost rows is encoded entirely in the **budget item `id`**:

| Cost row source | Budget item `id` | Set in |
|-----------------|------------------|--------|
| Day Plan place | `d-<placeId>` | `addFabPlace` → `linkBudget` |
| Flight | `f-<flightId>` | `saveFlight` |
| Stay | `s-<stayId>` | `saveStay` |
| Manual "+ Add Cost" | `<Date.now()>` (no prefix) | `addBudgetItem` |

Source-record ids (`placeId`, `flightId`, `stayId`) are all `${Date.now()}` strings.

### Day Plan item with a price → Cost
1. In `addFabPlace`, `dayPlanBudgetCategory(category)` maps the Day Plan category to a Budget parent category:
   - `Food → 🍽️ Food`
   - `Place`, `Things to Do → 🎫 Activities`
   - `Transport → 🚌 Transport`
   - `Shopping → 🛍️ Shopping`
   - `Other → 📎 Others`
   - `Prayer Space → null` (never links; price input is also force-disabled for Prayer Space)
2. `linkBudget(placeId)` upserts a budget item with id `d-<placeId>`. Subcategory = the place's `subType` (Food/Things to Do/Transport) or `"Other"`; for `📎 Others` the subcategory is `""`.
3. The `date` is the ISO date of the current day (`formatDate(dayDates[currentDayIndex])`).
4. **If the price is removed/zeroed on edit**, `linkBudget` deletes the `d-` budget item. `isPaid` is preserved across updates; a brand-new linked item starts `isPaid: false`.

### Flight / Stay in Most Used → Cost
- `saveFlight`: if price > 0, upserts a `f-<id>` budget item → `🚌 Transport / Flight`, dated `departureDate`. If price cleared, the `f-` item is filtered out.
- `saveStay`: if price > 0, upserts a `s-<id>` budget item → `🏨 Accommodation / Hotel`, dated `checkInDate`. If price cleared, the `s-` item is filtered out.

### How Summary assembles its timeline (`buildTimeline`)
Reads **three sources** and groups by date string:
1. **Flights** (`essentialInfo.flights`) — placed on `departureDate`; **deduplicated by `flightNumber|departureDate`**.
2. **Stays** (`essentialInfo.stays`) — emits up to two rows: `<id>-in` on `checkInDate` and `<id>-out` on `checkOutDate`.
3. **Day Plan** (`placesByDay`) — every non-`note` place, dated by mapping its day index through `dayDates`; row id `dayplan-<placeId>`, carries `dayIndex` + `sourceId`.

Groups are sorted by date; items within a day sorted by `time` string. **Budget/Cost is not read by the timeline.**

### Deleting an item

| Action | Cleans up source? | Cleans up Cost? |
|--------|-------------------|-----------------|
| Day Plan place delete (`removePlace`) | ✅ removes from `placesByDay` | ✅ removes `d-<id>` |
| Summary delete of a dayplan row | ✅ | ✅ removes `d-<id>` |
| `deleteFlight` | ✅ | ✅ removes `f-<id>` |
| `deleteStay` | ✅ | ✅ removes `s-<id>` |
| **Cost tab** | — | **❌ there is no delete (or edit) control in the Cost list at all** |

So Cost deletion is **only** reachable from the source (Day Plan / Most Used / Summary). The Cost tab itself can only **add** manual rows; it never reads back into the source.

---

## 4. Day Plan Categories & Sub-types (as coded)

**Categories** (`QUICK_ADD_CATEGORIES`): `Place 📍`, `Food 🍽️`, `Prayer Space 🕌`, `Things to Do 🎫`, `Shopping 🛍️`, `Transport 🚌`, `Other 📌`.

**Sub-type selector** shows only for `Food`, `Transport`, `Things to Do`:
- **Food** sub-types: `Restaurant`, `Café & Beverage`, `Convenience Store`, `Snacks`, `Groceries`, `Other` (default `Restaurant`).
- **Transport**: `Train`, `Car`, `Bus`, `Ferry`, `Cruise`, `Taxi`, `Other` (default `Train`).
- **Things to Do**: `Tour`, `Activity`, `Experience`, `Class`, `Other` (default `Activity`).

`Prayer Space` has a **period** selector instead (`Fajr/Dhuhr/Asr/Maghrib/Isha`) and never carries a price/cost.

Searchable categories (mock location autocomplete): `Place`, `Food`, `Prayer Space`, `Things to Do`, `Shopping`.

---

## 5. Mismatches Between Code and Typical Expectations

1. **Stays have no `price` field, yet the stay form collects a price.** `StayItem` defines no `price`/`priceCurrency`; the stay's price lives **only** in the `s-<id>` budget item. On **edit**, `handleSummaryEdit`/stay form does **not** repopulate `stayPriceInput` (it's cleared when the form closes). Result: editing an existing stay without re-typing the price makes `hasPrice` false → **the linked `s-` Cost row is silently deleted.** Flights don't have this bug (they store `price` on the record and the edit path re-fills `flightPriceInput`).

2. **Manual Cost rows can never be removed.** "+ Add Cost" creates a prefix-less id and the Cost list renders no delete/edit affordance. Once added (or if its source linkage breaks), a manual row is permanent through the UI.

3. **Mixed-currency totals are summed naively.** Each budget item keeps its own `currencyCode`, but `totalBudget` and per-group totals just `+ amount` across items and render a single `budgetCurrency` symbol. A trip mixing, e.g., KRW and USD shows an arithmetically meaningless total.

4. **`isPaid` is written but never surfaced.** Linked Day Plan items set `isPaid: false` (and there's logic to preserve it on update), but the Cost render shows no paid/unpaid toggle or indicator. The field is effectively dead in the UI.

5. **`TransportItem` type is exported but unused** by the detail page's persisted model — transport is represented as a Day Plan `TripPlace` with category `Transport`, not as a `TransportItem`.

6. **Cost↔date coupling is implicit.** A Day Plan item's Cost row is dated to the day it was added (`dayDates[currentDayIndex]`). If trip dates later change, `costDayIndex` re-buckets by matching the stored ISO date or a `Day N` string; rows whose stored date no longer matches any trip day fall into the **"Other"** bucket rather than being re-dated.

7. **Legacy seed cleanup is silent.** `getTripDetail` hard-strips budget ids `b1`/`b2` on every read — a migration shim that will quietly drop any real future item that happens to use those ids.
