export type TripRecord = {
  id: string;
  title: string;
  tripName?: string;
  description?: string;
  destination: string;
  startDate: string;
  endDate: string;
  companion: string;
  styles: string[];
  createdAt: string;
};

export type TripPlace = { id: string; name: string; category: string; icon: string; time?: string; endTime?: string; duration?: string; noteBody?: string; type?: "note"; period?: string; subType?: string; price?: number; priceCurrency?: string; address?: string; lat?: number; lng?: number };
export type TripBudgetItem = { id: string; category: string; subcategory: string; amount: number; date: string; currencyCode?: string; isPaid?: boolean };
export type TripChecklistItem = { id: string; text: string; done: boolean };
export type TripChecklistSections = {
  essential: TripChecklistItem[];
  packing: TripChecklistItem[];
  quick: TripChecklistItem[];
};

export type FlightItem = {
  id: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  airline: string;
  flightNumber: string;
  attachmentName?: string;
  price?: number;
  priceCurrency?: string;
};

export type StayItem = {
  id: string;
  propertyName: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  address: string;
  attachmentName?: string;
};

export type TransportItem = {
  id: string;
  type: string;
  from: string;
  to: string;
  date: string;
  time: string;
};

export type EssentialInfo = {
  flights: FlightItem[];
  stays: StayItem[];
};

export type TripDetailRecord = {
  notesByDay: Record<number, string>;
  placesByDay: Record<number, TripPlace[]>;
  budgetItems: TripBudgetItem[];
  checklistSections: TripChecklistSections;
  essentialInfo: EssentialInfo;
};

const TRIPS_KEY = "halallog-trips";
const TRIP_DETAIL_PREFIX = "halallog-trip-detail-";

const DEFAULT_TRIPS: TripRecord[] = [
  {
    id: "seoul-spring",
    title: "Seoul Spring Escape",
    tripName: "Seoul Spring Escape",
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
    tripName: "Istanbul Weekend",
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
  if (typeof window === "undefined") return defaultTripDetail();
  const key = `${TRIP_DETAIL_PREFIX}${id}`;
  const saved = parseJSON<TripDetailRecord>(window.localStorage.getItem(key), defaultTripDetail());
  if (!saved.essentialInfo) saved.essentialInfo = { flights: [], stays: [] };
  // Remove legacy hardcoded seed data
  const LEGACY_IDS = new Set(["b1", "b2"]);
  saved.budgetItems = (saved.budgetItems ?? []).filter((item) => !LEGACY_IDS.has(item.id));
  return saved;
}

export function saveTripDetail(id: string, detail: TripDetailRecord) {
  if (typeof window === "undefined") return;
  const key = `${TRIP_DETAIL_PREFIX}${id}`;
  window.localStorage.setItem(key, JSON.stringify(detail));
}

export function defaultTripDetail(): TripDetailRecord {
  return {
    notesByDay: {},
    placesByDay: {},
    budgetItems: [],
    checklistSections: DEFAULT_CHECKLIST,
    essentialInfo: { flights: [], stays: [] },
  };
}

export function slugifyTripId(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function formatTripDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const startLabel = `${start.toLocaleString("en-US", { month: "short" })} ${start.getDate()}`;
  const endLabel = `${end.toLocaleString("en-US", { month: "short" })} ${end.getDate()}`;
  return `${startLabel} - ${endLabel}`;
}

export function countTripDays(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return `${Math.max(diff, 1)} days`;
}
