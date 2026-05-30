"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  defaultTripDetail,
  formatTripDateRange,
  getTripById,
  getTripDetail,
  saveTripDetail,
  upsertTrip,
  type EssentialInfo,
  type FlightItem,
  type StayItem,
  type TransportItem,
  type TripBudgetItem,
  type TripChecklistItem,
  type TripPlace,
  type TripRecord,
} from "@/lib/trips-storage";
import { formatDate, formatDateLabel as fmtDateLabel } from "@/lib/date-utils";
import { Calendar, SHORT_MONTHS } from "@/components/Calendar";

// ── Types ──────────────────────────────────────────────────────────────
type TripTab = "summary" | "essential" | "day_plan" | "budget" | "checklist";
type BudgetItem = TripBudgetItem;
type PlaceItem = TripPlace;
type ChecklistItem = TripChecklistItem;

// ── Constants ──────────────────────────────────────────────────────────
const TRIP_TABS: Array<{ id: TripTab; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "essential", label: "Most Used" },
  { id: "day_plan", label: "Day Plan" },
  { id: "budget", label: "Budget" },
  { id: "checklist", label: "Checklist" },
];

const QUICK_ADD_CATEGORIES = [
  { label: "Place", icon: "📍" },
  { label: "Restaurant", icon: "🍽️" },
  { label: "Prayer Space", icon: "🕌" },
  { label: "Activity", icon: "🎫" },
  { label: "Shopping", icon: "🛍️" },
  { label: "Flight", icon: "✈️" },
  { label: "Stay", icon: "🏨" },
  { label: "Car Rental", icon: "🚗" },
  { label: "Train", icon: "🚂" },
  { label: "Bus", icon: "🚌" },
  { label: "Ferry", icon: "⛴️" },
  { label: "Note", icon: "📝" },
];

const QUICK_ADD = [
  "🕌 Prayer times checked", "🧭 Qibla direction saved", "🍱 Halal restaurants researched",
  "🛏️ Prayer mat", "🥪 Halal snacks packed", "💊 Halal-certified medications", "👗 Modest clothing packed",
];

const BUDGET_CATEGORY_MAP: Record<string, string[]> = {
  "🍽️ Food": ["Breakfast", "Lunch", "Dinner", "Beverage & Snacks", "Groceries"],
  "🚌 Transport": ["Bus", "Subway", "Taxi", "Flight", "Car Rental", "Ferry", "Other"],
  "🏨 Accommodation": ["Hotel", "Hostel", "Airbnb", "Guesthouse", "Other"],
  "🎫 Activities": ["Tour", "Museum", "Theme Park", "Sports", "Other"],
  "🛍️ Shopping": ["Clothing", "Souvenirs", "Cosmetics", "Other"],
  "📎 Others": [],
};
const BUDGET_PARENT_CATEGORIES = Object.keys(BUDGET_CATEGORY_MAP);

const CURRENCIES: { code: string; symbol: string }[] = [
  { code: "USD", symbol: "$" }, { code: "EUR", symbol: "€" }, { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" }, { code: "KRW", symbol: "₩" }, { code: "CNY", symbol: "¥" },
  { code: "AED", symbol: "د.إ" }, { code: "SAR", symbol: "﷼" }, { code: "QAR", symbol: "QR" },
  { code: "KWD", symbol: "KD" }, { code: "BHD", symbol: "BD" }, { code: "OMR", symbol: "OR" },
  { code: "JOD", symbol: "JD" }, { code: "EGP", symbol: "E£" }, { code: "MAD", symbol: "MAD" },
  { code: "DZD", symbol: "DA" }, { code: "TND", symbol: "DT" }, { code: "LYD", symbol: "LD" },
  { code: "LBP", symbol: "L£" }, { code: "SYP", symbol: "S£" }, { code: "IQD", symbol: "IQD" },
  { code: "IRR", symbol: "﷼" }, { code: "PKR", symbol: "₨" }, { code: "BDT", symbol: "৳" },
  { code: "INR", symbol: "₹" }, { code: "LKR", symbol: "Rs" }, { code: "NPR", symbol: "Rs" },
  { code: "MVR", symbol: "Rf" }, { code: "AFN", symbol: "Af" }, { code: "MYR", symbol: "RM" },
  { code: "IDR", symbol: "Rp" }, { code: "SGD", symbol: "S$" }, { code: "THB", symbol: "฿" },
  { code: "PHP", symbol: "₱" }, { code: "VND", symbol: "₫" }, { code: "TWD", symbol: "NT$" },
  { code: "HKD", symbol: "HK$" }, { code: "MOP", symbol: "P" }, { code: "KHR", symbol: "CR" },
  { code: "LAK", symbol: "₭" }, { code: "MMK", symbol: "K" }, { code: "BND", symbol: "B$" },
  { code: "MNT", symbol: "₮" }, { code: "KZT", symbol: "₸" }, { code: "UZS", symbol: "лв" },
  { code: "KGS", symbol: "лв" }, { code: "TJS", symbol: "SM" }, { code: "TMT", symbol: "T" },
  { code: "AZN", symbol: "₼" }, { code: "GEL", symbol: "₾" }, { code: "AMD", symbol: "֏" },
  { code: "TRY", symbol: "₺" }, { code: "ILS", symbol: "₪" }, { code: "AUD", symbol: "A$" },
  { code: "NZD", symbol: "NZ$" }, { code: "FJD", symbol: "FJ$" }, { code: "PGK", symbol: "K" },
  { code: "SBD", symbol: "SI$" }, { code: "VUV", symbol: "VT" }, { code: "WST", symbol: "T" },
  { code: "CAD", symbol: "C$" }, { code: "MXN", symbol: "Mex$" }, { code: "BRL", symbol: "R$" },
  { code: "ARS", symbol: "AR$" }, { code: "CLP", symbol: "CLP$" }, { code: "COP", symbol: "COL$" },
  { code: "PEN", symbol: "S/" }, { code: "BOB", symbol: "Bs" }, { code: "PYG", symbol: "Gs" },
  { code: "UYU", symbol: "UY$" }, { code: "VES", symbol: "Bs.S" }, { code: "GTQ", symbol: "Q" },
  { code: "HNL", symbol: "L" }, { code: "NIO", symbol: "C$" }, { code: "CRC", symbol: "₡" },
  { code: "DOP", symbol: "RD$" }, { code: "JMD", symbol: "J$" }, { code: "TTD", symbol: "TT$" },
  { code: "BBD", symbol: "Bds$" }, { code: "BSD", symbol: "B$" }, { code: "HTG", symbol: "G" },
  { code: "CHF", symbol: "Fr" }, { code: "SEK", symbol: "kr" }, { code: "NOK", symbol: "kr" },
  { code: "DKK", symbol: "kr" }, { code: "ISK", symbol: "kr" }, { code: "CZK", symbol: "Kč" },
  { code: "PLN", symbol: "zł" }, { code: "HUF", symbol: "Ft" }, { code: "RON", symbol: "lei" },
  { code: "BGN", symbol: "лв" }, { code: "RSD", symbol: "din" }, { code: "HRK", symbol: "kn" },
  { code: "BAM", symbol: "KM" }, { code: "ALL", symbol: "L" }, { code: "MKD", symbol: "ден" },
  { code: "MDL", symbol: "L" }, { code: "UAH", symbol: "₴" }, { code: "BYN", symbol: "Br" },
  { code: "RUB", symbol: "₽" }, { code: "ZAR", symbol: "R" }, { code: "NGN", symbol: "₦" },
  { code: "GHS", symbol: "GH₵" }, { code: "KES", symbol: "KSh" }, { code: "TZS", symbol: "TSh" },
  { code: "UGX", symbol: "USh" }, { code: "ETB", symbol: "Br" }, { code: "ZMW", symbol: "ZK" },
  { code: "ZWL", symbol: "Z$" }, { code: "BWP", symbol: "P" }, { code: "NAD", symbol: "N$" },
  { code: "MZN", symbol: "MT" }, { code: "AOA", symbol: "Kz" }, { code: "XOF", symbol: "CFA" },
  { code: "XAF", symbol: "FCFA" }, { code: "XCD", symbol: "EC$" }, { code: "SCR", symbol: "SR" },
  { code: "MUR", symbol: "Rs" }, { code: "MGA", symbol: "Ar" },
  { code: "SDG", symbol: "SDG" }, { code: "SOS", symbol: "Sh" }, { code: "DJF", symbol: "Fdj" },
  { code: "ERN", symbol: "Nfk" }, { code: "RWF", symbol: "RF" }, { code: "BIF", symbol: "Fr" },
  { code: "CDF", symbol: "FC" }, { code: "GMD", symbol: "D" }, { code: "GNF", symbol: "Fr" },
  { code: "SLL", symbol: "Le" }, { code: "LRD", symbol: "L$" }, { code: "CVE", symbol: "CV$" },
  { code: "STD", symbol: "Db" }, { code: "KMF", symbol: "CF" },
];

function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

const TRANSPORT_TYPES = [
  { type: "Train", icon: "🚂" }, { type: "Car", icon: "🚗" }, { type: "Bus", icon: "🚌" },
  { type: "Ferry", icon: "⛴️" }, { type: "Cruise", icon: "🚢" }, { type: "Taxi", icon: "🚕" },
];
const TRANSPORT_ICON_MAP: Record<string, string> = {
  Train: "🚂", Car: "🚗", Bus: "🚌", Ferry: "⛴️", Cruise: "🚢", Taxi: "🚕",
};

const AIRLINES: { name: string; iata: string }[] = [
  { name: "Korean Air", iata: "KE" },
  { name: "Asiana Airlines", iata: "OZ" },
  { name: "Jeju Air", iata: "7C" },
  { name: "Jin Air", iata: "LJ" },
  { name: "T'way Air", iata: "TW" },
  { name: "Air Seoul", iata: "RS" },
  { name: "Emirates", iata: "EK" },
  { name: "Qatar Airways", iata: "QR" },
  { name: "Etihad Airways", iata: "EY" },
  { name: "Turkish Airlines", iata: "TK" },
  { name: "Saudi Arabian Airlines", iata: "SV" },
  { name: "flydubai", iata: "FZ" },
  { name: "Air Arabia", iata: "G9" },
  { name: "Royal Jordanian", iata: "RJ" },
  { name: "Gulf Air", iata: "GF" },
  { name: "Oman Air", iata: "WY" },
  { name: "Pakistan International Airlines", iata: "PK" },
  { name: "EgyptAir", iata: "MS" },
  { name: "Singapore Airlines", iata: "SQ" },
  { name: "Scoot", iata: "TR" },
  { name: "Cathay Pacific", iata: "CX" },
  { name: "Hong Kong Airlines", iata: "HX" },
  { name: "Japan Airlines", iata: "JL" },
  { name: "All Nippon Airways", iata: "NH" },
  { name: "Peach Aviation", iata: "MM" },
  { name: "Air China", iata: "CA" },
  { name: "China Eastern Airlines", iata: "MU" },
  { name: "China Southern Airlines", iata: "CZ" },
  { name: "China Airlines", iata: "CI" },
  { name: "Hainan Airlines", iata: "HU" },
  { name: "EVA Air", iata: "BR" },
  { name: "Malaysia Airlines", iata: "MH" },
  { name: "AirAsia", iata: "AK" },
  { name: "Thai Airways", iata: "TG" },
  { name: "Vietnam Airlines", iata: "VN" },
  { name: "Garuda Indonesia", iata: "GA" },
  { name: "Lion Air", iata: "JT" },
  { name: "Batik Air", iata: "ID" },
  { name: "Philippine Airlines", iata: "PR" },
  { name: "Cebu Pacific", iata: "5J" },
  { name: "Air India", iata: "AI" },
  { name: "IndiGo", iata: "6E" },
  { name: "SpiceJet", iata: "SG" },
  { name: "Air New Zealand", iata: "NZ" },
  { name: "Qantas", iata: "QF" },
  { name: "British Airways", iata: "BA" },
  { name: "Lufthansa", iata: "LH" },
  { name: "Air France", iata: "AF" },
  { name: "KLM", iata: "KL" },
  { name: "Swiss International Air Lines", iata: "LX" },
  { name: "Austrian Airlines", iata: "OS" },
  { name: "Finnair", iata: "AY" },
  { name: "SAS Scandinavian Airlines", iata: "SK" },
  { name: "TAP Air Portugal", iata: "TP" },
  { name: "Iberia", iata: "IB" },
  { name: "Aeroflot", iata: "SU" },
  { name: "El Al Israel Airlines", iata: "LY" },
  { name: "Ethiopian Airlines", iata: "ET" },
  { name: "Kenya Airways", iata: "KQ" },
  { name: "Royal Air Maroc", iata: "AT" },
  { name: "United Airlines", iata: "UA" },
  { name: "American Airlines", iata: "AA" },
  { name: "Delta Air Lines", iata: "DL" },
  { name: "Southwest Airlines", iata: "WN" },
  { name: "Air Canada", iata: "AC" },
  { name: "WestJet", iata: "WS" },
  { name: "Aeromexico", iata: "AM" },
  { name: "LATAM Airlines", iata: "LA" },
  { name: "Avianca", iata: "AV" },
  { name: "Copa Airlines", iata: "CM" },
];


// ── Helpers ────────────────────────────────────────────────────────────
function fmtDayTab(d: Date) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getCategoryIcon(cat: string): string {
  return cat.split(" ")[0] ?? "";
}

function getPeriodOptions(categoryLabel: string): string[] {
  if (categoryLabel === "Restaurant") return ["Breakfast", "Lunch", "Dinner"];
  if (categoryLabel === "Activity") return ["Tour", "Activity", "Show"];
  return ["Morning", "Afternoon", "Evening"];
}

type TimelineItem = { id: string; time: string; icon: string; line1: string; line2?: string; line3?: string };
type TimelineGroup = { date: string; dateLabel: string; items: TimelineItem[] };

function buildTimeline(info: EssentialInfo): TimelineGroup[] {
  const byDate: Record<string, TimelineItem[]> = {};
  const add = (date: string, item: TimelineItem) => {
    if (!date) return;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(item);
  };

  for (const f of info.flights) {
    add(f.departureDate, {
      id: f.id, time: f.departureTime, icon: "✈️",
      line1: [f.from, f.to].filter(Boolean).join(" → ") || "Flight",
      line2: f.airline && f.flightNumber
        ? `${f.airline} (${f.flightNumber})`
        : (f.airline || f.flightNumber || undefined),
      line3: f.arrivalTime ? `Arrival: ${f.arrivalTime}` : undefined,
    });
  }

  for (const s of info.stays) {
    if (s.checkInDate) {
      add(s.checkInDate, {
        id: `${s.id}-in`, time: s.checkInTime, icon: "🏨",
        line1: s.propertyName || "Stay",
        line2: s.checkInTime ? `Check-in ${s.checkInTime}` : "Check-in",
      });
    }
    if (s.checkOutDate) {
      add(s.checkOutDate, {
        id: `${s.id}-out`, time: s.checkOutTime, icon: "🏨",
        line1: s.propertyName || "Stay",
        line2: s.checkOutTime ? `Check-out ${s.checkOutTime}` : "Check-out",
      });
    }
  }

  for (const t of info.transports) {
    add(t.date, {
      id: t.id, time: t.time, icon: TRANSPORT_ICON_MAP[t.type] ?? "🚌",
      line1: [t.from, t.to].filter(Boolean).join(" → ") || t.type,
      line2: t.type || undefined,
    });
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date, dateLabel: formatDayHeader(date),
      items: [...items].sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    }));
}

const emptyFlight = (): Omit<FlightItem, "id"> => ({
  from: "", to: "", departureDate: "", departureTime: "",
  arrivalDate: "", arrivalTime: "", airline: "", flightNumber: "",
});
const emptyStay = (): Omit<StayItem, "id"> => ({
  propertyName: "", checkInDate: "", checkInTime: "",
  checkOutDate: "", checkOutTime: "", address: "",
});
const emptyTransport = (): Omit<TransportItem, "id"> => ({
  type: "Train", from: "", to: "", date: "", time: "",
});

// ── Main Component ─────────────────────────────────────────────────────
export default function TripDetailPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = typeof params.tripId === "string" ? params.tripId : "";

  const initialTrip = useMemo(() => getTripById(tripId), [tripId]);
  const detail = useMemo(() => getTripDetail(tripId), [tripId]);

  const [tripMeta, setTripMeta] = useState<TripRecord | null>(initialTrip);
  const [activeTab, setActiveTab] = useState<TripTab>("summary");
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [customChecklistInput, setCustomChecklistInput] = useState("");

  // Combined trip edit popup (name + dates)
  const [showEditPopup, setShowEditPopup] = useState(false);

  // Most Used
  const [essentialInfo, setEssentialInfo] = useState<EssentialInfo>(
    detail.essentialInfo ?? { flights: [], stays: [], transports: [] }
  );
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [showStayForm, setShowStayForm] = useState(false);
  const [showTransportForm, setShowTransportForm] = useState(false);
  const [draftFlight, setDraftFlight] = useState(emptyFlight());
  const [draftStay, setDraftStay] = useState(emptyStay());
  const [draftTransport, setDraftTransport] = useState(emptyTransport());
  const [airlineSearch, setAirlineSearch] = useState("");
  const [airlineDropdownOpen, setAirlineDropdownOpen] = useState(false);
  const [flightIataPrefix, setFlightIataPrefix] = useState("");
  const [flightNumberSuffix, setFlightNumberSuffix] = useState("");

  // Day Plan quick-add
  const [memoFocused, setMemoFocused] = useState(false);
  const [fabCategory, setFabCategory] = useState<{ label: string; icon: string } | null>(null);
  const [fabInput, setFabInput] = useState("");
  const [fabNoteBody, setFabNoteBody] = useState("");
  const [fabPeriod, setFabPeriod] = useState("");
  const [fabOthersNote, setFabOthersNote] = useState("");
  const fabInputRef = useRef<HTMLInputElement>(null);
  const fabTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Budget
  const [showStats, setShowStats] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCategory, setBudgetCategory] = useState(BUDGET_PARENT_CATEGORIES[0]);
  const [budgetSubcategory, setBudgetSubcategory] = useState(BUDGET_CATEGORY_MAP[BUDGET_PARENT_CATEGORIES[0]][0]);
  const [budgetDay, setBudgetDay] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("USD");

  // Persistent detail data
  const [notesByDay, setNotesByDay] = useState<Record<number, string>>(detail.notesByDay ?? {});
  const [placesByDay, setPlacesByDay] = useState<Record<number, PlaceItem[]>>(detail.placesByDay ?? {});
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(detail.budgetItems ?? []);
  const [checklistSections, setChecklistSections] = useState<{
    essential: ChecklistItem[];
    packing: ChecklistItem[];
    quick: ChecklistItem[];
  }>(detail.checklistSections ?? defaultTripDetail().checklistSections);

  const tripStart = tripMeta?.startDate ?? "2026-08-16";
  const tripEnd = tripMeta?.endDate ?? "2026-08-18";
  const destination = tripMeta?.destination ?? tripId.replace(/-/g, " ");

  const nameValue = tripMeta?.tripName ?? tripMeta?.title ??
    tripId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Day dates array for Day Plan tabs
  const dayDates = useMemo(() => {
    const start = new Date(tripStart + "T00:00:00");
    const end = new Date(tripEnd + "T00:00:00");
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return [new Date("2026-08-16T00:00:00"), new Date("2026-08-17T00:00:00"), new Date("2026-08-18T00:00:00")];
    }
    const result: Date[] = [];
    let d = new Date(start);
    let i = 0;
    while (d <= end && i < 30) {
      result.push(new Date(d));
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      i++;
    }
    return result;
  }, [tripStart, tripEnd]);

  const totalBudget = budgetItems.reduce((sum, item) => sum + item.amount, 0);
  const dayPlaces = placesByDay[currentDayIndex] ?? [];
  const noteText = notesByDay[currentDayIndex] ?? "";

  const allChecklist = [
    ...checklistSections.essential,
    ...checklistSections.packing,
    ...checklistSections.quick,
  ];
  const checklistDone = allChecklist.filter((i) => i.done).length;
  const timeline = useMemo(() => buildTimeline(essentialInfo), [essentialInfo]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    saveTripDetail(tripId, { notesByDay, placesByDay, budgetItems, checklistSections, essentialInfo });
  }, [tripId, notesByDay, placesByDay, budgetItems, checklistSections, essentialInfo]);

  useEffect(() => {
    if (fabCategory?.label !== "Note" && fabCategory) {
      setTimeout(() => fabInputRef.current?.focus(), 20);
    }
    if (fabCategory?.label === "Note") {
      setTimeout(() => fabTextareaRef.current?.focus(), 20);
    }
  }, [fabCategory]);

  useEffect(() => {
    if (!showFlightForm) {
      setAirlineSearch("");
      setAirlineDropdownOpen(false);
      setFlightIataPrefix("");
      setFlightNumberSuffix("");
    }
  }, [showFlightForm]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const saveTripEdit = (newName: string, start: string, end: string) => {
    if (!tripMeta) return;
    const updated = { ...tripMeta, tripName: newName.trim() || tripMeta.title, title: newName.trim() || tripMeta.title, startDate: start, endDate: end };
    upsertTrip(updated);
    setTripMeta(updated);
    setShowEditPopup(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPlacesByDay((prev) => {
      const places = prev[currentDayIndex] ?? [];
      const oldIndex = places.findIndex((p) => p.id === active.id);
      const newIndex = places.findIndex((p) => p.id === over.id);
      return { ...prev, [currentDayIndex]: arrayMove(places, oldIndex, newIndex) };
    });
  };

  const addFabPlace = () => {
    if (!fabInput.trim() || !fabCategory) return;
    setPlacesByDay((prev) => ({
      ...prev,
      [currentDayIndex]: [
        ...(prev[currentDayIndex] ?? []),
        {
          id: `${Date.now()}`,
          name: fabInput.trim(),
          category: fabCategory.label,
          icon: fabCategory.icon,
          ...(fabPeriod ? { period: fabPeriod } : {}),
          ...(fabOthersNote.trim() ? { noteBody: fabOthersNote.trim() } : {}),
        },
      ],
    }));
    setFabInput("");
    setFabPeriod("");
    setFabOthersNote("");
    setFabCategory(null);
  };

  const addFabNote = () => {
    setPlacesByDay((prev) => ({
      ...prev,
      [currentDayIndex]: [
        ...(prev[currentDayIndex] ?? []),
        {
          id: `${Date.now()}`,
          name: fabInput.trim(),
          category: "Note",
          icon: "📝",
          noteBody: fabNoteBody.trim(),
          type: "note" as const,
        },
      ],
    }));
    setFabInput("");
    setFabNoteBody("");
    setFabCategory(null);
  };

  const removePlace = (id: string) => {
    setPlacesByDay((prev) => ({
      ...prev,
      [currentDayIndex]: (prev[currentDayIndex] ?? []).filter((p) => p.id !== id),
    }));
  };

  const updatePlaceTime = (id: string, time: string) => {
    setPlacesByDay((prev) => ({
      ...prev,
      [currentDayIndex]: (prev[currentDayIndex] ?? []).map((p) => p.id === id ? { ...p, time } : p),
    }));
  };

  const updatePlaceEndTime = (id: string, endTime: string) => {
    setPlacesByDay((prev) => ({
      ...prev,
      [currentDayIndex]: (prev[currentDayIndex] ?? []).map((p) => p.id === id ? { ...p, endTime } : p),
    }));
  };

  const saveFlight = () => {
    setEssentialInfo((prev) => ({ ...prev, flights: [...prev.flights, { id: `${Date.now()}`, ...draftFlight }] }));
    setDraftFlight(emptyFlight());
    setShowFlightForm(false);
  };
  const saveStay = () => {
    setEssentialInfo((prev) => ({ ...prev, stays: [...prev.stays, { id: `${Date.now()}`, ...draftStay }] }));
    setDraftStay(emptyStay());
    setShowStayForm(false);
  };
  const saveTransport = () => {
    setEssentialInfo((prev) => ({ ...prev, transports: [...prev.transports, { id: `${Date.now()}`, ...draftTransport }] }));
    setDraftTransport(emptyTransport());
    setShowTransportForm(false);
  };
  const deleteFlight = (id: string) => setEssentialInfo((prev) => ({ ...prev, flights: prev.flights.filter((f) => f.id !== id) }));
  const deleteStay = (id: string) => setEssentialInfo((prev) => ({ ...prev, stays: prev.stays.filter((s) => s.id !== id) }));
  const deleteTransport = (id: string) => setEssentialInfo((prev) => ({ ...prev, transports: prev.transports.filter((t) => t.id !== id) }));

  const toggleChecklist = (section: "essential" | "packing" | "quick", id: string) => {
    setChecklistSections((prev) => ({
      ...prev,
      [section]: prev[section].map((item) => item.id === id ? { ...item, done: !item.done } : item),
    }));
  };
  const addQuickChecklist = (text: string) => {
    setChecklistSections((prev) => ({
      ...prev,
      quick: [...prev.quick, { id: `${Date.now()}-${text}`, text, done: false }],
    }));
  };
  const addBudgetItem = () => {
    const amount = Number(budgetAmount);
    if (!amount || !budgetDay) return;
    setBudgetItems((prev) => [
      ...prev,
      { id: `${Date.now()}`, category: budgetCategory, subcategory: budgetSubcategory, amount, date: budgetDay, currencyCode: budgetCurrency },
    ]);
    setBudgetAmount("");
    setBudgetDay("");
    const subs = BUDGET_CATEGORY_MAP[budgetCategory];
    setBudgetSubcategory(subs.length > 0 ? subs[0] : "");
  };

  const filteredAirlines = airlineSearch.trim()
    ? AIRLINES.filter(
        (a) =>
          a.name.toLowerCase().includes(airlineSearch.toLowerCase()) ||
          a.iata.toLowerCase().includes(airlineSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/planner" className="text-sm text-[--color-text-muted]">← Back</Link>
        <p className="text-sm text-[--color-text-muted]">{destination}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide rounded-xl border border-[--color-border] bg-[--color-surface] p-1.5">
        {TRIP_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              "rounded-lg px-3 py-1.5 text-xs whitespace-nowrap transition-colors font-medium",
              activeTab === tab.id ? "bg-[#2d6a4f] text-white" : "text-[--color-text-muted] hover:bg-[--color-background]",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div key={activeTab} className="animate-fade-in rounded-xl border border-[--color-border] bg-[--color-surface] p-4">

        {/* ── Summary ── */}
        {activeTab === "summary" && (
          <div className="space-y-5">
            {/* Cover */}
            <div
              className="relative flex min-h-36 items-end rounded-xl p-4"
              style={{ background: "linear-gradient(135deg, #d8e7df 0%, #efe1d8 100%)" }}
            >
              {/* Single edit button top-right */}
              <button
                type="button"
                onClick={() => setShowEditPopup(true)}
                className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-sm hover:bg-white/90 transition-colors"
                aria-label="Edit trip"
              >
                ✏️
              </button>
              <div className="space-y-1">
                <p className="text-xl font-bold text-[--color-text]">{nameValue}</p>
                <p className="text-xs text-[--color-text-muted]">{formatTripDateRange(tripStart, tripEnd)}</p>
              </div>
            </div>

            {/* Timeline */}
            {timeline.length > 0 && (
              <div className="space-y-1">
                {timeline.map((group) => (
                  <div key={group.date}>
                    <p className="py-2 text-sm font-bold text-[--color-text]">{group.dateLabel}</p>
                    {group.items.map((item, idx) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-12 shrink-0 pt-0.5 text-right text-xs text-[--color-text-muted]">{item.time}</div>
                        <div className="flex flex-col items-center">
                          <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#2d6a4f]" />
                          {idx < group.items.length - 1 && (
                            <div className="min-h-8 w-0.5 flex-1 bg-[#2d6a4f] opacity-25" />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="text-sm font-medium text-[--color-text]">{item.icon} {item.line1}</p>
                          {item.line2 && <p className="text-xs text-[--color-text-muted]">{item.line2}</p>}
                          {item.line3 && <p className="text-xs text-[--color-text-muted]">{item.line3}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Checklist count */}
            <button
              type="button"
              onClick={() => setActiveTab("checklist")}
              className="text-xs text-[--color-text-muted] underline-offset-2 hover:underline"
            >
              Checklist {checklistDone}/{allChecklist.length} completed
            </button>
          </div>
        )}

        {/* ── Most Used ── */}
        {activeTab === "essential" && (
          <div className="space-y-5">
            <div className="flex gap-2">
              {[["+ Flight", () => { setShowFlightForm(true); setShowStayForm(false); setShowTransportForm(false); }],
                ["+ Stay", () => { setShowStayForm(true); setShowFlightForm(false); setShowTransportForm(false); }],
                ["+ Transport", () => { setShowTransportForm(true); setShowFlightForm(false); setShowStayForm(false); }],
              ].map(([label, handler]) => (
                <button key={label as string} type="button" onClick={handler as () => void}
                  className="rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm font-medium text-[--color-text] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors"
                >
                  {label as string}
                </button>
              ))}
            </div>

            {/* Flight form */}
            {showFlightForm && (
              <div className="space-y-3 rounded-xl border border-[--color-border] bg-[--color-background] p-4">
                <p className="font-medium text-[--color-text]">✈️ Flight Details</p>
                <div className="grid grid-cols-2 gap-2">
                  {[["From", "from", "ICN"], ["To", "to", "NRT"]].map(([lbl, key, ph]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-[--color-text-muted]">{lbl}</label>
                      <input value={(draftFlight as never)[key]} onChange={(e) => setDraftFlight((p) => ({ ...p, [key]: e.target.value }))} placeholder={ph} className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                    </div>
                  ))}
                  {[["Departure date", "departureDate", "date"], ["Departure time", "departureTime", "time"], ["Arrival date", "arrivalDate", "date"], ["Arrival time", "arrivalTime", "time"]].map(([lbl, key, type]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-[--color-text-muted]">{lbl}</label>
                      <input type={type} value={(draftFlight as never)[key]} onChange={(e) => setDraftFlight((p) => ({ ...p, [key]: e.target.value }))} className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                    </div>
                  ))}
                  {/* Airline autocomplete */}
                  <div className="relative">
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Airline</label>
                    <input
                      value={airlineSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAirlineSearch(val);
                        setAirlineDropdownOpen(true);
                        setDraftFlight((p) => ({ ...p, airline: val }));
                      }}
                      onFocus={() => setAirlineDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setAirlineDropdownOpen(false), 150)}
                      placeholder="Korean Air"
                      autoComplete="off"
                      className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm"
                    />
                    {airlineDropdownOpen && filteredAirlines.length > 0 && (
                      <div className="absolute left-0 right-0 z-10 mt-1 max-h-44 overflow-y-auto rounded-lg border border-[--color-border] bg-[--color-background] shadow-lg">
                        {filteredAirlines.map((a) => (
                          <button
                            key={a.iata}
                            type="button"
                            onMouseDown={() => {
                              setAirlineSearch(a.name);
                              setFlightIataPrefix(a.iata);
                              setDraftFlight((p) => ({
                                ...p,
                                airline: a.name,
                                flightNumber: a.iata + flightNumberSuffix,
                              }));
                              setAirlineDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-[--color-surface]"
                          >
                            <span className="text-[--color-text]">{a.name}</span>
                            <span className="ml-3 shrink-0 text-xs font-semibold text-[--color-text-muted]">{a.iata}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Flight number with IATA prefix */}
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Flight number</label>
                    <div className="flex overflow-hidden rounded border border-[--color-border]">
                      {flightIataPrefix && (
                        <span className="flex shrink-0 items-center border-r border-[--color-border] bg-[--color-surface] px-2 text-sm font-semibold text-[--color-text]">
                          {flightIataPrefix}
                        </span>
                      )}
                      <input
                        value={flightNumberSuffix}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const val = flightIataPrefix ? raw.replace(/\D/g, "") : raw.toUpperCase();
                          setFlightNumberSuffix(val);
                          setDraftFlight((p) => ({ ...p, flightNumber: flightIataPrefix + val }));
                        }}
                        placeholder={flightIataPrefix ? "706" : "KE703"}
                        className="w-full bg-transparent px-2 py-1.5 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 border-t border-[--color-border] pt-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[--color-border] px-3 py-2 text-xs text-[--color-text-muted] transition-colors hover:border-[#2d6a4f] hover:text-[#2d6a4f]">
                    <span>📎</span>
                    <span className="flex-1 truncate">{draftFlight.attachmentName ?? "Attach file (PDF / image)"}</span>
                    {draftFlight.attachmentName && (
                      <button type="button" onClick={(e) => { e.preventDefault(); setDraftFlight((p) => ({ ...p, attachmentName: undefined })); }} className="text-[#c4704a]">✕</button>
                    )}
                    <input type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setDraftFlight((p) => ({ ...p, attachmentName: f.name })); }} />
                  </label>
                  <button type="button" disabled className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-[--color-border] px-3 py-2 text-xs opacity-60">
                    <span>✉️</span>
                    <span className="flex-1 text-left text-[--color-text-muted]">Import from Gmail</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Premium</span>
                  </button>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={saveFlight} className="rounded-lg bg-[#2d6a4f] px-4 py-2 text-sm font-medium text-white">Save</button>
                  <button type="button" onClick={() => { setShowFlightForm(false); setDraftFlight(emptyFlight()); }} className="rounded-lg border border-[--color-border] px-4 py-2 text-sm text-[--color-text-muted]">Cancel</button>
                </div>
              </div>
            )}

            {essentialInfo.flights.length > 0 && (
              <div className="space-y-2">
                {essentialInfo.flights.map((f) => (
                  <div key={f.id} className="flex items-start justify-between rounded-lg border border-[--color-border] bg-[--color-background] p-3">
                    <div>
                      <p className="text-sm font-medium text-[--color-text]">✈️ {[f.from, f.to].filter(Boolean).join(" → ") || "Flight"}</p>
                      {(f.flightNumber || f.airline) && (
                        <p className="text-xs text-[--color-text-muted]">
                          {f.airline && f.flightNumber
                            ? `${f.airline} (${f.flightNumber})`
                            : f.airline || f.flightNumber}
                        </p>
                      )}
                      {f.departureDate && <p className="text-xs text-[--color-text-muted]">{f.departureDate} {f.departureTime}{f.arrivalDate && f.arrivalDate !== f.departureDate ? ` → ${f.arrivalDate}` : ""} {f.arrivalTime}</p>}
                    </div>
                    <button type="button" onClick={() => deleteFlight(f.id)} className="text-xs text-[#c4704a]">✕</button>
                  </div>
                ))}
                {!showFlightForm && (
                  <button type="button" onClick={() => setShowFlightForm(true)} className="w-full rounded-lg border border-dashed border-[--color-border] py-2 text-xs text-[--color-text-muted] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors">+ Add Another Flight</button>
                )}
              </div>
            )}

            {/* Stay form */}
            {showStayForm && (
              <div className="space-y-3 rounded-xl border border-[--color-border] bg-[--color-background] p-4">
                <p className="font-medium text-[--color-text]">🏨 Stay Details</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Property name</label>
                    <input value={draftStay.propertyName} onChange={(e) => setDraftStay((p) => ({ ...p, propertyName: e.target.value }))} placeholder="Hotel Name" className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  {[["Check-in date", "checkInDate", "date"], ["Check-in time", "checkInTime", "time"], ["Check-out date", "checkOutDate", "date"], ["Check-out time", "checkOutTime", "time"]].map(([lbl, key, type]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-[--color-text-muted]">{lbl}</label>
                      <input type={type} value={(draftStay as never)[key]} onChange={(e) => setDraftStay((p) => ({ ...p, [key]: e.target.value }))} className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Address</label>
                    <input value={draftStay.address} onChange={(e) => setDraftStay((p) => ({ ...p, address: e.target.value }))} placeholder="Address" className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-2 border-t border-[--color-border] pt-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[--color-border] px-3 py-2 text-xs text-[--color-text-muted] transition-colors hover:border-[#2d6a4f] hover:text-[#2d6a4f]">
                    <span>📎</span>
                    <span className="flex-1 truncate">{draftStay.attachmentName ?? "Attach file (PDF / image)"}</span>
                    {draftStay.attachmentName && (
                      <button type="button" onClick={(e) => { e.preventDefault(); setDraftStay((p) => ({ ...p, attachmentName: undefined })); }} className="text-[#c4704a]">✕</button>
                    )}
                    <input type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setDraftStay((p) => ({ ...p, attachmentName: f.name })); }} />
                  </label>
                  <button type="button" disabled className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-[--color-border] px-3 py-2 text-xs opacity-60">
                    <span>✉️</span>
                    <span className="flex-1 text-left text-[--color-text-muted]">Import from Gmail</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Premium</span>
                  </button>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={saveStay} className="rounded-lg bg-[#2d6a4f] px-4 py-2 text-sm font-medium text-white">Save</button>
                  <button type="button" onClick={() => { setShowStayForm(false); setDraftStay(emptyStay()); }} className="rounded-lg border border-[--color-border] px-4 py-2 text-sm text-[--color-text-muted]">Cancel</button>
                </div>
              </div>
            )}

            {essentialInfo.stays.length > 0 && (
              <div className="space-y-2">
                {essentialInfo.stays.map((s) => (
                  <div key={s.id} className="flex items-start justify-between rounded-lg border border-[--color-border] bg-[--color-background] p-3">
                    <div>
                      <p className="text-sm font-medium text-[--color-text]">🏨 {s.propertyName || "Stay"}</p>
                      {s.checkInDate && <p className="text-xs text-[--color-text-muted]">Check-in {s.checkInDate} {s.checkInTime}</p>}
                      {s.checkOutDate && <p className="text-xs text-[--color-text-muted]">Check-out {s.checkOutDate} {s.checkOutTime}</p>}
                    </div>
                    <button type="button" onClick={() => deleteStay(s.id)} className="text-xs text-[#c4704a]">✕</button>
                  </div>
                ))}
                {!showStayForm && (
                  <button type="button" onClick={() => setShowStayForm(true)} className="w-full rounded-lg border border-dashed border-[--color-border] py-2 text-xs text-[--color-text-muted] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors">+ Add Another Stay</button>
                )}
              </div>
            )}

            {/* Transport form */}
            {showTransportForm && (
              <div className="space-y-3 rounded-xl border border-[--color-border] bg-[--color-background] p-4">
                <p className="font-medium text-[--color-text]">🚌 Transport Details</p>
                <div className="flex flex-wrap gap-2">
                  {TRANSPORT_TYPES.map((t) => (
                    <button key={t.type} type="button" onClick={() => setDraftTransport((p) => ({ ...p, type: t.type }))}
                      className={["rounded-lg border px-3 py-1.5 text-sm transition-colors", draftTransport.type === t.type ? "border-[#2d6a4f] bg-[#2d6a4f] text-white" : "border-[--color-border] text-[--color-text-muted]"].join(" ")}
                    >{t.icon} {t.type}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[["From", "from", "text"], ["To", "to", "text"], ["Date", "date", "date"], ["Time", "time", "time"]].map(([lbl, key, type]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-[--color-text-muted]">{lbl}</label>
                      <input type={type} value={(draftTransport as never)[key]} onChange={(e) => setDraftTransport((p) => ({ ...p, [key]: e.target.value }))} placeholder={type === "text" ? "City / Station" : undefined} className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={saveTransport} className="rounded-lg bg-[#2d6a4f] px-4 py-2 text-sm font-medium text-white">Save</button>
                  <button type="button" onClick={() => { setShowTransportForm(false); setDraftTransport(emptyTransport()); }} className="rounded-lg border border-[--color-border] px-4 py-2 text-sm text-[--color-text-muted]">Cancel</button>
                </div>
              </div>
            )}

            {essentialInfo.transports.length > 0 && (
              <div className="space-y-2">
                {essentialInfo.transports.map((t) => (
                  <div key={t.id} className="flex items-start justify-between rounded-lg border border-[--color-border] bg-[--color-background] p-3">
                    <div>
                      <p className="text-sm font-medium text-[--color-text]">{TRANSPORT_ICON_MAP[t.type] ?? "🚌"} {[t.from, t.to].filter(Boolean).join(" → ") || t.type}</p>
                      {t.date && <p className="text-xs text-[--color-text-muted]">{t.date} {t.time}</p>}
                    </div>
                    <button type="button" onClick={() => deleteTransport(t.id)} className="text-xs text-[#c4704a]">✕</button>
                  </div>
                ))}
                {!showTransportForm && (
                  <button type="button" onClick={() => setShowTransportForm(true)} className="w-full rounded-lg border border-dashed border-[--color-border] py-2 text-xs text-[--color-text-muted] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors">+ Add Another Transport</button>
                )}
              </div>
            )}

            {!showFlightForm && !showStayForm && !showTransportForm &&
              essentialInfo.flights.length === 0 && essentialInfo.stays.length === 0 && essentialInfo.transports.length === 0 && (
                <p className="text-center text-sm text-[--color-text-muted]">Add your flights, stays, and transport to build your timeline.</p>
            )}
          </div>
        )}

        {/* ── Day Plan ── */}
        {activeTab === "day_plan" && (
          <div className="space-y-4">
            {/* Day tabs — two-line format */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {dayDates.map((date, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentDayIndex(index)}
                  className={[
                    "flex shrink-0 flex-col items-center rounded-lg px-3 py-2 transition-colors",
                    currentDayIndex === index
                      ? "bg-[#2d6a4f] text-white"
                      : "border border-[--color-border] text-[--color-text-muted]",
                  ].join(" ")}
                >
                  <span className="text-xs font-bold leading-tight">Day {index + 1}</span>
                  <span className="text-[10px] leading-tight opacity-80">{fmtDayTab(date)}</span>
                </button>
              ))}
            </div>

            {/* Quick-add horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {QUICK_ADD_CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => {
                    setFabCategory(fabCategory?.label === cat.label ? null : cat);
                    setFabInput("");
                    setFabNoteBody("");
                    setFabPeriod("");
                    setFabOthersNote("");
                  }}
                  className={[
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                    fabCategory?.label === cat.label
                      ? "border-[#2d6a4f] bg-[#2d6a4f] text-white"
                      : "border-[#2d6a4f] bg-white text-[#2d6a4f] hover:bg-[#d8e7df]",
                  ].join(" ")}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* Inline input for selected category */}
            {fabCategory && fabCategory.label !== "Note" && (
              <div className="space-y-2.5 rounded-lg border border-[#2d6a4f] bg-[--color-background] p-3">
                <div className="flex gap-2">
                  <span className="text-base">{fabCategory.icon}</span>
                  <input
                    ref={fabInputRef}
                    value={fabInput}
                    onChange={(e) => setFabInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addFabPlace()}
                    placeholder={`${fabCategory.label} name`}
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                {/* Period chips */}
                <div className="flex flex-wrap gap-1.5">
                  {getPeriodOptions(fabCategory.label).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFabPeriod(fabPeriod === opt ? "" : opt)}
                      className={[
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        fabPeriod === opt
                          ? "border-[#2d6a4f] bg-[#2d6a4f] text-white"
                          : "border-[--color-border] text-[--color-text-muted] hover:border-[#2d6a4f]",
                      ].join(" ")}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {/* Others free-text */}
                <input
                  value={fabOthersNote}
                  onChange={(e) => setFabOthersNote(e.target.value)}
                  placeholder="Others (optional note)"
                  className="w-full rounded border border-[--color-border] bg-[--color-surface] px-2 py-1.5 text-xs outline-none focus:border-[#2d6a4f]"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={addFabPlace} className="rounded bg-[#2d6a4f] px-3 py-1 text-xs text-white">Add</button>
                  <button type="button" onClick={() => { setFabCategory(null); setFabInput(""); setFabPeriod(""); setFabOthersNote(""); }} className="rounded border border-[--color-border] px-3 py-1 text-xs text-[--color-text-muted]">✕</button>
                </div>
              </div>
            )}

            {fabCategory?.label === "Note" && (
              <div className="space-y-2 rounded-lg border border-[#2d6a4f] bg-[--color-background] p-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">📝</span>
                  <input
                    ref={fabInputRef}
                    value={fabInput}
                    onChange={(e) => setFabInput(e.target.value)}
                    placeholder="Note title... (optional)"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                <textarea
                  ref={fabTextareaRef}
                  value={fabNoteBody}
                  onChange={(e) => setFabNoteBody(e.target.value)}
                  placeholder="Write anything freely..."
                  rows={3}
                  className="w-full resize-none rounded border border-[--color-border] bg-[--color-surface] px-2 py-1.5 text-sm outline-none focus:border-[#2d6a4f]"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={addFabNote} className="rounded bg-[#2d6a4f] px-3 py-1.5 text-xs text-white">Add</button>
                  <button type="button" onClick={() => { setFabCategory(null); setFabInput(""); setFabNoteBody(""); setFabPeriod(""); setFabOthersNote(""); }} className="rounded border border-[--color-border] px-3 py-1.5 text-xs text-[--color-text-muted]">Cancel</button>
                </div>
              </div>
            )}

            {/* Day memo */}
            <textarea
              value={noteText}
              rows={memoFocused || noteText ? 3 : 1}
              onFocus={() => setMemoFocused(true)}
              onBlur={() => setMemoFocused(false)}
              onChange={(e) => setNotesByDay((prev) => ({ ...prev, [currentDayIndex]: e.target.value }))}
              placeholder="Day memo... (optional)"
              className="w-full resize-none rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm transition-all duration-150 outline-none focus:border-[#2d6a4f]"
            />

            {/* Place list */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={dayPlaces.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {dayPlaces.map((place, idx) => (
                    <div key={place.id}>
                      <SortablePlaceCard
                        place={place}
                        onRemove={removePlace}
                        onTimeChange={updatePlaceTime}
                        onEndTimeChange={updatePlaceEndTime}
                      />
                      {idx < dayPlaces.length - 1 && (
                        <p className="py-1 pl-14 text-xs text-[--color-text-muted]">~ Travel time: ~18 min</p>
                      )}
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {dayPlaces.length === 0 && !fabCategory && (
              <p className="text-center text-sm text-[--color-text-muted]">Tap a category above to add to this day.</p>
            )}
          </div>
        )}

        {/* ── Budget ── */}
        {activeTab === "budget" && (
          <div className="space-y-4">
            {showStats ? (
              <BudgetStats items={budgetItems} total={totalBudget} currency={budgetCurrency} onBack={() => setShowStats(false)} />
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg bg-[#2d6a4f] px-4 py-3 text-white">
                  <div>
                    <p className="text-xs opacity-80">Total Spend</p>
                    <p className="text-2xl font-semibold">{getCurrencySymbol(budgetCurrency)}{totalBudget}</p>
                  </div>
                  <button type="button" onClick={() => setShowStats(true)}
                    className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20 transition-colors"
                  >
                    View Stats
                  </button>
                </div>

                <div className="space-y-2">
                  {budgetItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm">
                      <p className="text-[--color-text]">{getCategoryIcon(item.category)} {item.subcategory} · {item.date}</p>
                      <p className="font-medium text-[--color-text]">{getCurrencySymbol(item.currencyCode ?? "USD")}{item.amount}</p>
                    </div>
                  ))}
                  {budgetItems.length === 0 && <p className="text-center text-sm text-[--color-text-muted]">No expenses yet.</p>}
                </div>

                <div className="space-y-2 rounded-lg border border-[--color-border] bg-[--color-background] p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select value={budgetCategory} onChange={(e) => { const cat = e.target.value; setBudgetCategory(cat); const subs = BUDGET_CATEGORY_MAP[cat]; setBudgetSubcategory(subs.length > 0 ? subs[0] : ""); }} className="rounded border border-[--color-border] bg-[--color-surface] px-2 py-1.5 text-sm">
                      {BUDGET_PARENT_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    {BUDGET_CATEGORY_MAP[budgetCategory].length > 0 ? (
                      <select value={budgetSubcategory} onChange={(e) => setBudgetSubcategory(e.target.value)} className="rounded border border-[--color-border] bg-[--color-surface] px-2 py-1.5 text-sm">
                        {BUDGET_CATEGORY_MAP[budgetCategory].map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                      </select>
                    ) : (
                      <input value={budgetSubcategory} onChange={(e) => setBudgetSubcategory(e.target.value)} placeholder="Note (optional)" className="rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Currency dropdown */}
                    <select
                      value={budgetCurrency}
                      onChange={(e) => setBudgetCurrency(e.target.value)}
                      className="w-28 rounded border border-[--color-border] bg-[--color-surface] px-2 py-1.5 text-xs text-[--color-text]"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                      ))}
                    </select>
                    {/* Amount */}
                    <input
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      placeholder="Amount"
                      type="number"
                      min="0"
                      className="w-28 rounded border border-[--color-border] px-2 py-1.5 text-sm"
                    />
                    {/* Day dropdown — limited to trip's actual days */}
                    <select
                      value={budgetDay}
                      onChange={(e) => setBudgetDay(e.target.value)}
                      className="w-24 rounded border border-[--color-border] bg-[--color-surface] px-2 py-1.5 text-sm text-[--color-text]"
                    >
                      <option value="">Day</option>
                      {dayDates.map((_, idx) => (
                        <option key={idx} value={`Day ${idx + 1}`}>Day {idx + 1}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addBudgetItem}
                      className="rounded bg-[#2d6a4f] px-4 py-1.5 text-sm font-medium text-white"
                    >
                      + Add Cost
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Checklist ── */}
        {activeTab === "checklist" && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg border border-[--color-border] bg-[--color-background] p-3">
              <p className="text-sm font-medium text-[--color-text]">Quick Add</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_ADD.map((item) => (
                  <button key={item} type="button" onClick={() => addQuickChecklist(item)}
                    className="rounded-full border border-[--color-border] px-3 py-1 text-xs text-[--color-text-muted] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors"
                  >{item}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={customChecklistInput} onChange={(e) => setCustomChecklistInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && customChecklistInput.trim()) { addQuickChecklist(customChecklistInput.trim()); setCustomChecklistInput(""); } }}
                  placeholder="Custom item" className="flex-1 rounded border border-[--color-border] px-2 py-1.5 text-sm"
                />
                <button type="button" onClick={() => { if (!customChecklistInput.trim()) return; addQuickChecklist(customChecklistInput.trim()); setCustomChecklistInput(""); }} className="rounded bg-[#2d6a4f] px-3 py-1.5 text-sm text-white">Add</button>
              </div>
            </div>
            <ChecklistSection title="Essential Documents" items={checklistSections.essential} onToggle={(id) => toggleChecklist("essential", id)} />
            <ChecklistSection title="General Packing" items={checklistSections.packing} onToggle={(id) => toggleChecklist("packing", id)} />
            <ChecklistSection title="Quick Added" items={checklistSections.quick} onToggle={(id) => toggleChecklist("quick", id)} />
          </div>
        )}
      </div>

      {/* ── Trip Edit Popup ── */}
      {showEditPopup && (
        <TripEditPopup
          initialName={nameValue}
          initialStart={tripStart}
          initialEnd={tripEnd}
          onConfirm={saveTripEdit}
          onClose={() => setShowEditPopup(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function SortablePlaceCard({
  place, onRemove, onTimeChange, onEndTimeChange,
}: {
  place: PlaceItem;
  onRemove: (id: string) => void;
  onTimeChange: (id: string, time: string) => void;
  onEndTimeChange: (id: string, endTime: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: place.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  if (place.type === "note") {
    return (
      <div ref={setNodeRef} style={style}
        className="rounded-lg border border-[--color-border] bg-[#fef9f0] p-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <span {...attributes} {...listeners} className="mt-0.5 cursor-grab select-none text-lg text-[--color-text-muted] active:cursor-grabbing">⠿</span>
            <div>
              <p className="text-sm font-medium text-[--color-text]">📝 {place.name || "Note"}</p>
              {place.noteBody && (
                <p className="mt-1 whitespace-pre-wrap text-xs text-[--color-text-muted]">{place.noteBody}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={() => onRemove(place.id)} className="shrink-0 text-sm text-[--color-text-muted] hover:text-[#c4704a]">✕</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}
      className="flex items-center gap-2 rounded-lg border border-[--color-border] bg-[--color-background] p-3"
    >
      <span {...attributes} {...listeners} className="cursor-grab select-none text-lg text-[--color-text-muted] active:cursor-grabbing">⠿</span>

      {/* Start time */}
      <input
        type="time"
        value={place.time ?? ""}
        onChange={(e) => onTimeChange(place.id, e.target.value)}
        className="w-[4.5rem] shrink-0 rounded border border-[--color-border] bg-[--color-surface] px-1.5 py-1 text-xs text-[--color-text-muted]"
      />

      {/* End time */}
      <span className="shrink-0 text-xs text-[--color-text-muted]">–</span>
      {place.endTime === "open" ? (
        <button type="button" onClick={() => onEndTimeChange(place.id, "")}
          className="flex shrink-0 items-center gap-0.5 rounded-full border border-[--color-border] px-2 py-0.5 text-xs text-[--color-text-muted] hover:border-[#c4704a]"
        >
          Open-ended <span>×</span>
        </button>
      ) : place.endTime ? (
        <div className="flex shrink-0 items-center gap-1">
          <input type="time" value={place.endTime} onChange={(e) => onEndTimeChange(place.id, e.target.value)}
            className="w-[4.5rem] rounded border border-[--color-border] bg-[--color-surface] px-1.5 py-1 text-xs text-[--color-text-muted]"
          />
          <button type="button" onClick={() => onEndTimeChange(place.id, "")} className="text-xs text-[--color-text-muted] hover:text-[#c4704a]">×</button>
        </div>
      ) : (
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            onEndTimeChange(place.id, v === "custom" ? "12:00" : v);
          }}
          className="w-24 shrink-0 rounded border border-[--color-border] bg-[--color-surface] px-1 py-1 text-xs text-[--color-text-muted]"
        >
          <option value="">–</option>
          <option value="open">Open-ended</option>
          <option value="custom">Set time</option>
        </select>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-medium text-[--color-text]">{place.icon} {place.name}</p>
        {(place.period || place.noteBody) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {place.period && (
              <span className="rounded-full bg-[#2d6a4f]/10 px-2 py-0.5 text-[10px] font-medium text-[#2d6a4f]">{place.period}</span>
            )}
            {place.noteBody && (
              <span className="truncate text-[10px] text-[--color-text-muted]">{place.noteBody}</span>
            )}
          </div>
        )}
      </div>
      <button type="button" onClick={() => onRemove(place.id)} className="shrink-0 text-sm text-[--color-text-muted] hover:text-[#c4704a]">✕</button>
    </div>
  );
}

function ChecklistSection({ title, items, onToggle }: { title: string; items: ChecklistItem[]; onToggle: (id: string) => void }) {
  return (
    <div className="rounded-lg border border-[--color-border] bg-[--color-background] p-3">
      <p className="mb-2 text-sm font-medium text-[--color-text]">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center gap-2 text-sm text-[--color-text-muted]">
            <input type="checkbox" checked={item.done} onChange={() => onToggle(item.id)} className="accent-[#2d6a4f]" />
            <span className={item.done ? "line-through opacity-50" : ""}>{item.text}</span>
          </label>
        ))}
        {items.length === 0 && <p className="text-xs text-[--color-text-muted]">No items yet.</p>}
      </div>
    </div>
  );
}

function BudgetStats({ items, total, currency, onBack }: { items: BudgetItem[]; total: number; currency: string; onBack: () => void }) {
  const categoryTotals = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + item.amount;
    return acc;
  }, {});

  const entries = Object.entries(categoryTotals);
  const CHART_COLORS = ["#2d6a4f", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#6b7280"];
  const sym = getCurrencySymbol(currency);

  const r = 44;
  const circumference = 2 * Math.PI * r;
  let cumOffset = 0;
  const segments = entries.map(([cat, amount], i) => {
    const seg = total > 0 ? (amount / total) * circumference : 0;
    const startOffset = cumOffset;
    cumOffset += seg;
    return { cat, amount, seg, startOffset, color: CHART_COLORS[i % CHART_COLORS.length] };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="rounded-lg border border-[--color-border] px-3 py-1.5 text-xs font-medium text-[--color-text-muted] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors">← Budget</button>
        <p className="font-semibold text-[--color-text]">Spending by Category</p>
      </div>

      {entries.length > 0 ? (
        <>
          {/* Donut chart */}
          <div className="flex justify-center py-2">
            <svg width="160" height="160" viewBox="0 0 100 100" aria-hidden="true">
              {/* Background ring */}
              <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-border)" strokeWidth="12" />
              <g transform="rotate(-90 50 50)">
                {segments.map(({ cat, seg, startOffset, color }) => (
                  <circle
                    key={cat}
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth="12"
                    strokeDasharray={`${seg} ${circumference - seg}`}
                    strokeDashoffset={-startOffset}
                  />
                ))}
              </g>
              {/* Center labels */}
              <text x="50" y="47" textAnchor="middle" style={{ fontSize: 7, fontWeight: 600, fill: "var(--color-text-muted)" }}>Total</text>
              <text x="50" y="59" textAnchor="middle" style={{ fontSize: 10, fontWeight: 700, fill: "var(--color-text)" }}>{sym}{total}</text>
            </svg>
          </div>

          {/* Category breakdown */}
          <div className="space-y-2.5">
            {segments.map(({ cat, amount, color }) => {
              const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <p className="flex-1 truncate text-sm text-[--color-text]">{cat}</p>
                  <p className="text-xs text-[--color-text-muted]">{pct}%</p>
                  <p className="w-20 text-right text-sm font-medium text-[--color-text]">{sym}{amount}</p>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-center text-sm text-[--color-text-muted]">No expenses yet.</p>
      )}
    </div>
  );
}

function TripEditPopup({
  initialName, initialStart, initialEnd, onConfirm, onClose,
}: {
  initialName: string;
  initialStart: string;
  initialEnd: string;
  onConfirm: (name: string, start: string, end: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [rangeStart, setRangeStart] = useState<Date | null>(() => {
    const d = new Date(initialStart + "T00:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  });
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => {
    const d = new Date(initialEnd + "T00:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  });

  const initialMonth = (() => {
    const d = new Date(initialStart + "T00:00:00");
    const base = Number.isNaN(d.getTime()) ? new Date() : d;
    return { year: base.getFullYear(), month: base.getMonth() };
  })();

  const dateLabel = !rangeStart ? "Select dates"
    : !rangeEnd ? `${fmtDateLabel(rangeStart, SHORT_MONTHS)} – ?`
    : `${fmtDateLabel(rangeStart, SHORT_MONTHS)} – ${fmtDateLabel(rangeEnd, SHORT_MONTHS)} (${Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1} days)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-80 rounded-xl bg-[--color-surface] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="mb-4 text-center text-sm font-semibold text-[--color-text]">Edit Trip</p>

        {/* Trip name */}
        <div className="mb-4 space-y-1">
          <label className="text-xs text-[--color-text-muted]">Trip Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm outline-none focus:border-[#2d6a4f]"
          />
        </div>

        {/* Calendar */}
        <Calendar
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onRangeChange={(start, end) => { setRangeStart(start); setRangeEnd(end); }}
          initialMonth={initialMonth}
        />

        <p className="mt-2 rounded-lg bg-[--color-background] px-3 py-1.5 text-center text-xs text-[--color-text-muted]">{dateLabel}</p>

        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[--color-border] py-2 text-sm text-[--color-text-muted]">Cancel</button>
          <button
            type="button"
            onClick={() => rangeStart && onConfirm(name, formatDate(rangeStart), rangeEnd ? formatDate(rangeEnd) : formatDate(rangeStart))}
            disabled={!rangeStart}
            className="flex-1 rounded-lg bg-[#2d6a4f] py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
