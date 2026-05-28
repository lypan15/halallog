export type TripRecord = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  companion: string;
  styles: string[];
  createdAt: string;
};

export type TripPlace = { id: string; name: string; category: string; icon: string };
export type TripBudgetItem = { id: string; category: string; amount: number; date: string };
export type TripChecklistItem = { id: string; text: string; done: boolean };
export type TripChecklistSections = {
  essential: TripChecklistItem[];
  packing: TripChecklistItem[];
  quick: TripChecklistItem[];
};

export type TripDetailRecord = {
  notesByDay: Record<number, string>;
  placesByDay: Record<number, TripPlace[]>;
  budgetItems: TripBudgetItem[];
  checklistSections: TripChecklistSections;
};

const TRIPS_KEY = "halallog-trips";
const TRIP_DETAIL_PREFIX = "halallog-trip-detail-";

const DEFAULT_TRIPS: TripRecord[] = [
  {
    id: "seoul-spring",
    title: "Seoul Spring Escape",
    destination: "Seoul",
    startDate: "2026-06-12",
    endDate: "2026-06-15",
    companion: "Friends",
    styles: ["Food Tour", "Sightseeing"],
    createdAt: "2026-05-01T10:00:00.000Z",
  },
  {
    id: "istanbul-weekend",
    title: "Istanbul Weekend",
    destination: "Istanbul",
    startDate: "2026-07-02",
    endDate: "2026-07-04",
    companion: "Couple",
    styles: ["Activities", "Relaxation"],
    createdAt: "2026-05-03T08:30:00.000Z",
  },
];

const DEFAULT_CHECKLIST: TripChecklistSections = {
  essential: [
    { id: "e1", text: "Passport & copies", done: false },
    { id: "e2", text: "Visa (if required)", done: false },
    { id: "e3", text: "Travel insurance", done: false },
    { id: "e4", text: "Flight tickets", done: false },
  ],
  packing: [
    { id: "p1", text: "Charger & adapter", done: false },
    { id: "p2", text: "SIM card / eSIM", done: false },
    { id: "p3", text: "Cash & card", done: false },
    { id: "p4", text: "Medications", done: false },
  ],
  quick: [],
};

function parseJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getTrips(): TripRecord[] {
  if (typeof window === "undefined") return DEFAULT_TRIPS;
  const saved = parseJSON<TripRecord[]>(window.localStorage.getItem(TRIPS_KEY), []);
  if (saved.length === 0) {
    window.localStorage.setItem(TRIPS_KEY, JSON.stringify(DEFAULT_TRIPS));
    return DEFAULT_TRIPS;
  }
  return saved;
}

export function saveTrips(trips: TripRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
}

export function upsertTrip(trip: TripRecord) {
  const all = getTrips();
  const idx = all.findIndex((item) => item.id === trip.id);
  if (idx >= 0) {
    all[idx] = trip;
  } else {
    all.unshift(trip);
  }
  saveTrips(all);
}

export function getTripById(id: string): TripRecord | null {
  return getTrips().find((item) => item.id === id) ?? null;
}

export function getTripDetail(id: string): TripDetailRecord {
  if (typeof window === "undefined") {
    return defaultTripDetail();
  }
  const key = `${TRIP_DETAIL_PREFIX}${id}`;
  return parseJSON<TripDetailRecord>(window.localStorage.getItem(key), defaultTripDetail());
}

export function saveTripDetail(id: string, detail: TripDetailRecord) {
  if (typeof window === "undefined") return;
  const key = `${TRIP_DETAIL_PREFIX}${id}`;
  window.localStorage.setItem(key, JSON.stringify(detail));
}

export function defaultTripDetail(): TripDetailRecord {
  return {
    notesByDay: {},
    placesByDay: {
      0: [{ id: "default-1", name: "Myeongdong Mosque", category: "Mosque", icon: "🕌" }],
    },
    budgetItems: [
      { id: "b1", category: "🍽️Food", amount: 28, date: "Day 1" },
      { id: "b2", category: "✈️Transport", amount: 65, date: "Day 2" },
    ],
    checklistSections: DEFAULT_CHECKLIST,
  };
}

export function slugifyTripId(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function formatTripDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startLabel = `${start.toLocaleString("en-US", { month: "short" })} ${start.getDate()}`;
  const endLabel = `${end.toLocaleString("en-US", { month: "short" })} ${end.getDate()}`;
  return `${startLabel} - ${endLabel}`;
}

export function countTripDays(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return `${Math.max(diff, 1)} days`;
}

export function buildDayTabs(startDate: string, endDate: string): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return ["Day1 8/16", "Day2 8/17", "Day3 8/18"];
  }
  const result: string[] = [];
  let day = new Date(start);
  let idx = 1;
  while (day <= end && idx <= 30) {
    result.push(`Day${idx} ${day.getMonth() + 1}/${day.getDate()}`);
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    idx += 1;
  }
  return result;
}
