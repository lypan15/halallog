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
  buildDayTabs,
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
  type TripRecord,
} from "@/lib/trips-storage";

// ── Types ──────────────────────────────────────────────────────────────
type TripTab = "summary" | "essential" | "itinerary" | "budget" | "checklist";
type BudgetItem = { id: string; category: string; subcategory: string; amount: number; date: string };
type PlaceItem = { id: string; name: string; category: string; icon: string; time?: string };
type ChecklistItem = { id: string; text: string; done: boolean };

// ── Constants ──────────────────────────────────────────────────────────
const TRIP_TABS: Array<{ id: TripTab; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "essential", label: "Essential Info" },
  { id: "itinerary", label: "Itinerary" },
  { id: "budget", label: "Budget" },
  { id: "checklist", label: "Checklist" },
];

const QUICK_ADD = [
  "🕌 Prayer times checked",
  "🧭 Qibla direction saved",
  "🍱 Halal restaurants researched",
  "🛏️ Prayer mat",
  "🥪 Halal snacks packed",
  "💊 Halal-certified medications",
  "👗 Modest clothing packed",
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

const TRANSPORT_TYPES = [
  { type: "Train", icon: "🚂" },
  { type: "Car", icon: "🚗" },
  { type: "Bus", icon: "🚌" },
  { type: "Ferry", icon: "⛴️" },
  { type: "Cruise", icon: "🚢" },
  { type: "Taxi", icon: "🚕" },
];

const TRANSPORT_ICON_MAP: Record<string, string> = {
  Train: "🚂", Car: "🚗", Bus: "🚌", Ferry: "⛴️", Cruise: "🚢", Taxi: "🚕",
};

const FAB_CATEGORIES = [
  {
    section: "Most Used",
    items: [
      { label: "Place", icon: "📍" },
      { label: "Restaurant", icon: "🍽️" },
      { label: "Prayer Space", icon: "🕌" },
      { label: "Activity", icon: "🎫" },
      { label: "Shopping", icon: "🛍️" },
    ],
  },
  {
    section: "Getting Around",
    items: [
      { label: "Flight", icon: "✈️" },
      { label: "Stay", icon: "🏨" },
      { label: "Car Rental", icon: "🚗" },
      { label: "Train", icon: "🚂" },
      { label: "Bus", icon: "🚌" },
      { label: "Ferry", icon: "⛴️" },
    ],
  },
  {
    section: "Other",
    items: [{ label: "Memo", icon: "📝" }],
  },
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Helpers ────────────────────────────────────────────────────────────
function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getCategoryIcon(cat: string): string {
  return cat.split(" ")[0] ?? "";
}

type TimelineItem = {
  id: string;
  time: string;
  icon: string;
  line1: string;
  line2?: string;
  line3?: string;
};

type TimelineGroup = {
  date: string;
  dateLabel: string;
  items: TimelineItem[];
};

function buildTimeline(info: EssentialInfo): TimelineGroup[] {
  const byDate: Record<string, TimelineItem[]> = {};
  const add = (date: string, item: TimelineItem) => {
    if (!date) return;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(item);
  };

  for (const f of info.flights) {
    add(f.departureDate, {
      id: f.id,
      time: f.departureTime,
      icon: "✈️",
      line1: [f.from, f.to].filter(Boolean).join(" → ") || "Flight",
      line2: [f.flightNumber, f.airline].filter(Boolean).join(" · ") || undefined,
      line3: f.arrivalTime ? `Arrival: ${f.arrivalTime}` : undefined,
    });
  }

  for (const s of info.stays) {
    add(s.checkInDate, {
      id: s.id,
      time: s.checkInTime,
      icon: "🏨",
      line1: s.propertyName || "Stay",
      line2: s.checkInTime ? `Check-in ${s.checkInTime}` : undefined,
    });
  }

  for (const t of info.transports) {
    add(t.date, {
      id: t.id,
      time: t.time,
      icon: TRANSPORT_ICON_MAP[t.type] ?? "🚌",
      line1: [t.from, t.to].filter(Boolean).join(" → ") || t.type,
      line2: t.type || undefined,
    });
  }

  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      dateLabel: formatDayHeader(date),
      items: [...items].sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    }));
}

// ── Empty draft factories ──────────────────────────────────────────────
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

// ── Main Component ────────────────────────────────────────────────────
export default function TripDetailPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = typeof params.tripId === "string" ? params.tripId : "";

  const initialTrip = useMemo(() => getTripById(tripId), [tripId]);
  const detail = useMemo(() => getTripDetail(tripId), [tripId]);

  const [tripMeta, setTripMeta] = useState<TripRecord | null>(initialTrip);
  const [activeTab, setActiveTab] = useState<TripTab>("summary");
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [customChecklistInput, setCustomChecklistInput] = useState("");

  // Inline trip name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(
    () =>
      initialTrip?.tripName ??
      initialTrip?.title ??
      tripId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Date popup
  const [showDatePopup, setShowDatePopup] = useState(false);

  // Essential Info
  const [essentialInfo, setEssentialInfo] = useState<EssentialInfo>(
    detail.essentialInfo ?? { flights: [], stays: [], transports: [] }
  );
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [showStayForm, setShowStayForm] = useState(false);
  const [showTransportForm, setShowTransportForm] = useState(false);
  const [draftFlight, setDraftFlight] = useState(emptyFlight());
  const [draftStay, setDraftStay] = useState(emptyStay());
  const [draftTransport, setDraftTransport] = useState(emptyTransport());

  // Itinerary
  const [memoFocused, setMemoFocused] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [fabCategory, setFabCategory] = useState<{ label: string; icon: string } | null>(null);
  const [fabInput, setFabInput] = useState("");
  const fabInputRef = useRef<HTMLInputElement>(null);

  // Budget
  const [showStats, setShowStats] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCategory, setBudgetCategory] = useState(BUDGET_PARENT_CATEGORIES[0]);
  const [budgetSubcategory, setBudgetSubcategory] = useState(BUDGET_CATEGORY_MAP[BUDGET_PARENT_CATEGORIES[0]][0]);
  const [budgetDay, setBudgetDay] = useState("");

  // Persistent detail data
  const [notesByDay, setNotesByDay] = useState<Record<number, string>>(detail.notesByDay ?? {});
  const [placesByDay, setPlacesByDay] = useState<Record<number, PlaceItem[]>>(
    detail.placesByDay ?? defaultTripDetail().placesByDay
  );
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(
    detail.budgetItems ?? defaultTripDetail().budgetItems
  );
  const [checklistSections, setChecklistSections] = useState<{
    essential: ChecklistItem[];
    packing: ChecklistItem[];
    quick: ChecklistItem[];
  }>(detail.checklistSections ?? defaultTripDetail().checklistSections);

  const tripStart = tripMeta?.startDate ?? "2026-08-16";
  const tripEnd = tripMeta?.endDate ?? "2026-08-18";
  const destination = tripMeta?.destination ?? tripId.replace(/-/g, " ");
  const companion = tripMeta?.companion ?? "Solo";
  const days = useMemo(() => buildDayTabs(tripStart, tripEnd), [tripStart, tripEnd]);

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

  // Auto-save detail
  useEffect(() => {
    saveTripDetail(tripId, { notesByDay, placesByDay, budgetItems, checklistSections, essentialInfo });
  }, [tripId, notesByDay, placesByDay, budgetItems, checklistSections, essentialInfo]);

  // Focus name input on edit
  useEffect(() => {
    if (editingName) {
      setTimeout(() => nameInputRef.current?.focus(), 20);
    }
  }, [editingName]);

  // Focus FAB input when category selected
  useEffect(() => {
    if (fabCategory) {
      setTimeout(() => fabInputRef.current?.focus(), 20);
    }
  }, [fabCategory]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const saveTripName = () => {
    if (!tripMeta) return;
    const updated = { ...tripMeta, tripName: nameValue.trim() || tripMeta.title, title: nameValue.trim() || tripMeta.title };
    upsertTrip(updated);
    setTripMeta(updated);
    setEditingName(false);
  };

  const saveTripDates = (start: string, end: string) => {
    if (!tripMeta) return;
    const updated = { ...tripMeta, startDate: start, endDate: end };
    upsertTrip(updated);
    setTripMeta(updated);
    setShowDatePopup(false);
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
        { id: `${Date.now()}`, name: fabInput.trim(), category: fabCategory.label, icon: fabCategory.icon },
      ],
    }));
    setFabInput("");
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

  const saveFlight = () => {
    const item: FlightItem = { id: `${Date.now()}`, ...draftFlight };
    setEssentialInfo((prev) => ({ ...prev, flights: [...prev.flights, item] }));
    setDraftFlight(emptyFlight());
    setShowFlightForm(false);
  };

  const saveStay = () => {
    const item: StayItem = { id: `${Date.now()}`, ...draftStay };
    setEssentialInfo((prev) => ({ ...prev, stays: [...prev.stays, item] }));
    setDraftStay(emptyStay());
    setShowStayForm(false);
  };

  const saveTransport = () => {
    const item: TransportItem = { id: `${Date.now()}`, ...draftTransport };
    setEssentialInfo((prev) => ({ ...prev, transports: [...prev.transports, item] }));
    setDraftTransport(emptyTransport());
    setShowTransportForm(false);
  };

  const deleteFlight = (id: string) => {
    setEssentialInfo((prev) => ({ ...prev, flights: prev.flights.filter((f) => f.id !== id) }));
  };
  const deleteStay = (id: string) => {
    setEssentialInfo((prev) => ({ ...prev, stays: prev.stays.filter((s) => s.id !== id) }));
  };
  const deleteTransport = (id: string) => {
    setEssentialInfo((prev) => ({ ...prev, transports: prev.transports.filter((t) => t.id !== id) }));
  };

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
    if (!amount || !budgetDay.trim()) return;
    const dayStr = /^\d+$/.test(budgetDay.trim()) ? `Day ${budgetDay.trim()}` : budgetDay.trim();
    setBudgetItems((prev) => [
      ...prev,
      { id: `${Date.now()}`, category: budgetCategory, subcategory: budgetSubcategory, amount, date: dayStr },
    ]);
    setBudgetAmount("");
    setBudgetDay("");
    const subs = BUDGET_CATEGORY_MAP[budgetCategory];
    setBudgetSubcategory(subs.length > 0 ? subs[0] : "");
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-24">
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
              activeTab === tab.id
                ? "bg-[#2d6a4f] text-white"
                : "text-[--color-text-muted] hover:bg-[--color-background]",
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
              <div className="space-y-1.5">
                {/* Trip name with inline edit */}
                <div className="flex items-center gap-2">
                  {editingName ? (
                    <input
                      ref={nameInputRef}
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveTripName()}
                      onBlur={saveTripName}
                      className="border-b border-[#2d6a4f] bg-transparent text-xl font-bold text-[--color-text] outline-none"
                    />
                  ) : (
                    <>
                      <p className="text-xl font-bold text-[--color-text]">{nameValue}</p>
                      <button
                        type="button"
                        onClick={() => setEditingName(true)}
                        className="text-base leading-none opacity-60 hover:opacity-100"
                        aria-label="Edit trip name"
                      >
                        ✏️
                      </button>
                    </>
                  )}
                </div>
                {/* Dates with edit */}
                <div className="flex items-center gap-2">
                  <p className="text-xs text-[--color-text-muted]">
                    {formatTripDateRange(tripStart, tripEnd)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDatePopup(true)}
                    className="text-xs leading-none opacity-60 hover:opacity-100"
                    aria-label="Edit dates"
                  >
                    ✏️
                  </button>
                </div>
              </div>
            </div>

            {/* Timeline (only shown when Essential Info has items) */}
            {timeline.length > 0 && (
              <div className="space-y-1">
                {timeline.map((group) => (
                  <div key={group.date}>
                    <p className="py-2 text-sm font-bold text-[--color-text]">{group.dateLabel}</p>
                    {group.items.map((item, idx) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-12 shrink-0 pt-0.5 text-right text-xs text-[--color-text-muted]">
                          {item.time}
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#2d6a4f]" />
                          {idx < group.items.length - 1 && (
                            <div className="min-h-8 w-0.5 flex-1 bg-[#2d6a4f] opacity-25" />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="text-sm font-medium text-[--color-text]">
                            {item.icon} {item.line1}
                          </p>
                          {item.line2 && (
                            <p className="text-xs text-[--color-text-muted]">{item.line2}</p>
                          )}
                          {item.line3 && (
                            <p className="text-xs text-[--color-text-muted]">{item.line3}</p>
                          )}
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

        {/* ── Essential Info ── */}
        {activeTab === "essential" && (
          <div className="space-y-5">
            {/* Quick add buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowFlightForm(true); setShowStayForm(false); setShowTransportForm(false); }}
                className="rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm font-medium text-[--color-text] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors"
              >
                + Flight
              </button>
              <button
                type="button"
                onClick={() => { setShowStayForm(true); setShowFlightForm(false); setShowTransportForm(false); }}
                className="rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm font-medium text-[--color-text] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors"
              >
                + Stay
              </button>
              <button
                type="button"
                onClick={() => { setShowTransportForm(true); setShowFlightForm(false); setShowStayForm(false); }}
                className="rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm font-medium text-[--color-text] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors"
              >
                + Transport
              </button>
            </div>

            {/* Flight form */}
            {showFlightForm && (
              <div className="space-y-3 rounded-xl border border-[--color-border] bg-[--color-background] p-4">
                <p className="font-medium text-[--color-text]">✈️ Flight Details</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">From</label>
                    <input value={draftFlight.from} onChange={(e) => setDraftFlight((p) => ({ ...p, from: e.target.value }))} placeholder="ICN" className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">To</label>
                    <input value={draftFlight.to} onChange={(e) => setDraftFlight((p) => ({ ...p, to: e.target.value }))} placeholder="NRT" className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Departure date</label>
                    <input type="date" value={draftFlight.departureDate} onChange={(e) => setDraftFlight((p) => ({ ...p, departureDate: e.target.value }))} className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Departure time</label>
                    <input type="time" value={draftFlight.departureTime} onChange={(e) => setDraftFlight((p) => ({ ...p, departureTime: e.target.value }))} placeholder="HH:MM" className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Arrival date</label>
                    <input type="date" value={draftFlight.arrivalDate} onChange={(e) => setDraftFlight((p) => ({ ...p, arrivalDate: e.target.value }))} className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Arrival time</label>
                    <input type="time" value={draftFlight.arrivalTime} onChange={(e) => setDraftFlight((p) => ({ ...p, arrivalTime: e.target.value }))} placeholder="HH:MM" className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Airline</label>
                    <input value={draftFlight.airline} onChange={(e) => setDraftFlight((p) => ({ ...p, airline: e.target.value }))} placeholder="Korean Air" className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Flight number</label>
                    <input value={draftFlight.flightNumber} onChange={(e) => setDraftFlight((p) => ({ ...p, flightNumber: e.target.value }))} placeholder="KE703" className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={saveFlight} className="rounded-lg bg-[#2d6a4f] px-4 py-2 text-sm font-medium text-white">Save</button>
                  <button type="button" onClick={() => { setShowFlightForm(false); setDraftFlight(emptyFlight()); }} className="rounded-lg border border-[--color-border] px-4 py-2 text-sm text-[--color-text-muted]">Cancel</button>
                </div>
              </div>
            )}

            {/* Saved flight cards */}
            {essentialInfo.flights.length > 0 && (
              <div className="space-y-2">
                {essentialInfo.flights.map((f) => (
                  <div key={f.id} className="flex items-start justify-between rounded-lg border border-[--color-border] bg-[--color-background] p-3">
                    <div>
                      <p className="text-sm font-medium text-[--color-text]">✈️ {[f.from, f.to].filter(Boolean).join(" → ") || "Flight"}</p>
                      {(f.flightNumber || f.airline) && <p className="text-xs text-[--color-text-muted]">{[f.flightNumber, f.airline].filter(Boolean).join(" · ")}</p>}
                      {f.departureDate && <p className="text-xs text-[--color-text-muted]">{f.departureDate} {f.departureTime} {f.arrivalDate && f.arrivalDate !== f.departureDate ? `→ ${f.arrivalDate}` : ""} {f.arrivalTime}</p>}
                    </div>
                    <button type="button" onClick={() => deleteFlight(f.id)} className="text-xs text-[#c4704a]">Delete</button>
                  </div>
                ))}
                {!showFlightForm && (
                  <button
                    type="button"
                    onClick={() => setShowFlightForm(true)}
                    className="w-full rounded-lg border border-dashed border-[--color-border] py-2 text-xs text-[--color-text-muted] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors"
                  >
                    + Add Another Flight
                  </button>
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
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Check-in date</label>
                    <input type="date" value={draftStay.checkInDate} onChange={(e) => setDraftStay((p) => ({ ...p, checkInDate: e.target.value }))} className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Check-in time</label>
                    <input type="time" value={draftStay.checkInTime} onChange={(e) => setDraftStay((p) => ({ ...p, checkInTime: e.target.value }))} className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Check-out date</label>
                    <input type="date" value={draftStay.checkOutDate} onChange={(e) => setDraftStay((p) => ({ ...p, checkOutDate: e.target.value }))} className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Check-out time</label>
                    <input type="time" value={draftStay.checkOutTime} onChange={(e) => setDraftStay((p) => ({ ...p, checkOutTime: e.target.value }))} className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Address</label>
                    <input value={draftStay.address} onChange={(e) => setDraftStay((p) => ({ ...p, address: e.target.value }))} placeholder="Address" className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={saveStay} className="rounded-lg bg-[#2d6a4f] px-4 py-2 text-sm font-medium text-white">Save</button>
                  <button type="button" onClick={() => { setShowStayForm(false); setDraftStay(emptyStay()); }} className="rounded-lg border border-[--color-border] px-4 py-2 text-sm text-[--color-text-muted]">Cancel</button>
                </div>
              </div>
            )}

            {/* Saved stay cards */}
            {essentialInfo.stays.length > 0 && (
              <div className="space-y-2">
                {essentialInfo.stays.map((s) => (
                  <div key={s.id} className="flex items-start justify-between rounded-lg border border-[--color-border] bg-[--color-background] p-3">
                    <div>
                      <p className="text-sm font-medium text-[--color-text]">🏨 {s.propertyName || "Stay"}</p>
                      {s.checkInDate && <p className="text-xs text-[--color-text-muted]">Check-in {s.checkInDate} {s.checkInTime}</p>}
                      {s.checkOutDate && <p className="text-xs text-[--color-text-muted]">Check-out {s.checkOutDate} {s.checkOutTime}</p>}
                    </div>
                    <button type="button" onClick={() => deleteStay(s.id)} className="text-xs text-[#c4704a]">Delete</button>
                  </div>
                ))}
                {!showStayForm && (
                  <button
                    type="button"
                    onClick={() => setShowStayForm(true)}
                    className="w-full rounded-lg border border-dashed border-[--color-border] py-2 text-xs text-[--color-text-muted] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors"
                  >
                    + Add Another Stay
                  </button>
                )}
              </div>
            )}

            {/* Transport form */}
            {showTransportForm && (
              <div className="space-y-3 rounded-xl border border-[--color-border] bg-[--color-background] p-4">
                <p className="font-medium text-[--color-text]">🚌 Transport Details</p>
                <div className="flex flex-wrap gap-2">
                  {TRANSPORT_TYPES.map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setDraftTransport((p) => ({ ...p, type: t.type }))}
                      className={[
                        "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                        draftTransport.type === t.type
                          ? "border-[#2d6a4f] bg-[#2d6a4f] text-white"
                          : "border-[--color-border] text-[--color-text-muted]",
                      ].join(" ")}
                    >
                      {t.icon} {t.type}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">From</label>
                    <input value={draftTransport.from} onChange={(e) => setDraftTransport((p) => ({ ...p, from: e.target.value }))} placeholder="City / Station" className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">To</label>
                    <input value={draftTransport.to} onChange={(e) => setDraftTransport((p) => ({ ...p, to: e.target.value }))} placeholder="City / Station" className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Date</label>
                    <input type="date" value={draftTransport.date} onChange={(e) => setDraftTransport((p) => ({ ...p, date: e.target.value }))} className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Time</label>
                    <input type="time" value={draftTransport.time} onChange={(e) => setDraftTransport((p) => ({ ...p, time: e.target.value }))} className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={saveTransport} className="rounded-lg bg-[#2d6a4f] px-4 py-2 text-sm font-medium text-white">Save</button>
                  <button type="button" onClick={() => { setShowTransportForm(false); setDraftTransport(emptyTransport()); }} className="rounded-lg border border-[--color-border] px-4 py-2 text-sm text-[--color-text-muted]">Cancel</button>
                </div>
              </div>
            )}

            {/* Saved transport cards */}
            {essentialInfo.transports.length > 0 && (
              <div className="space-y-2">
                {essentialInfo.transports.map((t) => (
                  <div key={t.id} className="flex items-start justify-between rounded-lg border border-[--color-border] bg-[--color-background] p-3">
                    <div>
                      <p className="text-sm font-medium text-[--color-text]">{TRANSPORT_ICON_MAP[t.type] ?? "🚌"} {[t.from, t.to].filter(Boolean).join(" → ") || t.type}</p>
                      {t.date && <p className="text-xs text-[--color-text-muted]">{t.date} {t.time}</p>}
                    </div>
                    <button type="button" onClick={() => deleteTransport(t.id)} className="text-xs text-[#c4704a]">Delete</button>
                  </div>
                ))}
                {!showTransportForm && (
                  <button
                    type="button"
                    onClick={() => setShowTransportForm(true)}
                    className="w-full rounded-lg border border-dashed border-[--color-border] py-2 text-xs text-[--color-text-muted] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors"
                  >
                    + Add Another Transport
                  </button>
                )}
              </div>
            )}

            {/* Empty state */}
            {!showFlightForm && !showStayForm && !showTransportForm &&
              essentialInfo.flights.length === 0 && essentialInfo.stays.length === 0 && essentialInfo.transports.length === 0 && (
                <p className="text-center text-sm text-[--color-text-muted]">
                  Add your flights, stays, and transport to build your timeline.
                </p>
            )}
          </div>
        )}

        {/* ── Itinerary ── */}
        {activeTab === "itinerary" && (
          <div className="space-y-4">
            {/* Day tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {days.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setCurrentDayIndex(index)}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs whitespace-nowrap font-medium",
                    currentDayIndex === index
                      ? "bg-[#2d6a4f] text-white"
                      : "border border-[--color-border] text-[--color-text-muted]",
                  ].join(" ")}
                >
                  {day}
                </button>
              ))}
            </div>

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

            {/* FAB input area */}
            {fabCategory && (
              <div className="flex gap-2 rounded-lg border border-[#2d6a4f] bg-[--color-background] p-3">
                <span className="text-base">{fabCategory.icon}</span>
                <input
                  ref={fabInputRef}
                  value={fabInput}
                  onChange={(e) => setFabInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFabPlace()}
                  placeholder={`${fabCategory.label} name`}
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <button type="button" onClick={addFabPlace} className="rounded bg-[#2d6a4f] px-3 py-1 text-xs text-white">Add</button>
                <button type="button" onClick={() => { setFabCategory(null); setFabInput(""); }} className="rounded border border-[--color-border] px-3 py-1 text-xs text-[--color-text-muted]">✕</button>
              </div>
            )}

            {/* Place list */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={dayPlaces.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {dayPlaces.map((place, idx) => (
                    <div key={place.id}>
                      <SortablePlaceCard place={place} onRemove={removePlace} onTimeChange={updatePlaceTime} />
                      {idx < dayPlaces.length - 1 && (
                        <p className="py-1 pl-14 text-xs text-[--color-text-muted]">~ Travel time: ~18 min</p>
                      )}
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {dayPlaces.length === 0 && !fabCategory && (
              <p className="text-center text-sm text-[--color-text-muted]">Tap + to add places for this day.</p>
            )}
          </div>
        )}

        {/* ── Budget ── */}
        {activeTab === "budget" && (
          <div className="space-y-4">
            {showStats ? (
              <BudgetStats items={budgetItems} total={totalBudget} onBack={() => setShowStats(false)} />
            ) : (
              <>
                {/* Total spend card */}
                <div className="flex items-center justify-between rounded-lg bg-[#2d6a4f] px-4 py-3 text-white">
                  <div>
                    <p className="text-xs opacity-80">Total Spend</p>
                    <p className="text-2xl font-semibold">${totalBudget}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowStats(true)}
                    className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20 transition-colors"
                  >
                    View Stats
                  </button>
                </div>

                {/* Expense list */}
                <div className="space-y-2">
                  {budgetItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm">
                      <p className="text-[--color-text]">
                        {getCategoryIcon(item.category)} {item.subcategory} · {item.date}
                      </p>
                      <p className="font-medium text-[--color-text]">${item.amount}</p>
                    </div>
                  ))}
                  {budgetItems.length === 0 && (
                    <p className="text-center text-sm text-[--color-text-muted]">No expenses yet.</p>
                  )}
                </div>

                {/* Add form */}
                <div className="space-y-2 rounded-lg border border-[--color-border] bg-[--color-background] p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={budgetCategory}
                      onChange={(e) => {
                        const cat = e.target.value;
                        setBudgetCategory(cat);
                        const subs = BUDGET_CATEGORY_MAP[cat];
                        setBudgetSubcategory(subs.length > 0 ? subs[0] : "");
                      }}
                      className="rounded border border-[--color-border] bg-[--color-surface] px-2 py-1.5 text-sm"
                    >
                      {BUDGET_PARENT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    {BUDGET_CATEGORY_MAP[budgetCategory].length > 0 ? (
                      <select
                        value={budgetSubcategory}
                        onChange={(e) => setBudgetSubcategory(e.target.value)}
                        className="rounded border border-[--color-border] bg-[--color-surface] px-2 py-1.5 text-sm"
                      >
                        {BUDGET_CATEGORY_MAP[budgetCategory].map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={budgetSubcategory}
                        onChange={(e) => setBudgetSubcategory(e.target.value)}
                        placeholder="Note (optional)"
                        className="rounded border border-[--color-border] px-2 py-1.5 text-sm"
                      />
                    )}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      placeholder="Amount ($)"
                      type="number"
                      min="0"
                      className="rounded border border-[--color-border] px-2 py-1.5 text-sm"
                    />
                    <input
                      value={budgetDay}
                      onChange={(e) => setBudgetDay(e.target.value)}
                      placeholder="Day (e.g. 1)"
                      inputMode="numeric"
                      className="rounded border border-[--color-border] px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={addBudgetItem}
                      className="rounded bg-[#2d6a4f] px-2 py-1.5 text-sm font-medium text-white"
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
                  <button
                    key={item}
                    type="button"
                    onClick={() => addQuickChecklist(item)}
                    className="rounded-full border border-[--color-border] px-3 py-1 text-xs text-[--color-text-muted] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={customChecklistInput}
                  onChange={(e) => setCustomChecklistInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customChecklistInput.trim()) {
                      addQuickChecklist(customChecklistInput.trim());
                      setCustomChecklistInput("");
                    }
                  }}
                  placeholder="Custom item"
                  className="flex-1 rounded border border-[--color-border] px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!customChecklistInput.trim()) return;
                    addQuickChecklist(customChecklistInput.trim());
                    setCustomChecklistInput("");
                  }}
                  className="rounded bg-[#2d6a4f] px-3 py-1.5 text-sm text-white"
                >
                  Add
                </button>
              </div>
            </div>

            <ChecklistSection title="Essential Documents" items={checklistSections.essential} onToggle={(id) => toggleChecklist("essential", id)} />
            <ChecklistSection title="General Packing" items={checklistSections.packing} onToggle={(id) => toggleChecklist("packing", id)} />
            <ChecklistSection title="Quick Added" items={checklistSections.quick} onToggle={(id) => toggleChecklist("quick", id)} />
          </div>
        )}
      </div>

      {/* ── FAB (Itinerary tab only) ── */}
      {activeTab === "itinerary" && (
        <div className="fixed bottom-20 right-6 z-[60]">
          {/* Bubble menu */}
          {fabOpen && !fabCategory && (
            <div
              className="absolute bottom-14 right-0 w-56 rounded-xl border border-[--color-border] bg-[--color-surface] shadow-xl"
              style={{ animation: "fade-in 0.15s ease-out both" }}
            >
              {FAB_CATEGORIES.map((group) => (
                <div key={group.section}>
                  <p className="px-3 pt-2.5 pb-1 text-xs font-semibold text-[--color-text-muted]">{group.section}</p>
                  {group.items.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => { setFabCategory(item); setFabOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[--color-text] hover:bg-[--color-background] transition-colors"
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
              <div className="h-2" />
            </div>
          )}

          {/* FAB button */}
          <button
            type="button"
            onClick={() => { setFabOpen((o) => !o); setFabCategory(null); setFabInput(""); }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2d6a4f] text-xl text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{ transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
          >
            +
          </button>
        </div>
      )}

      {/* ── Date range popup ── */}
      {showDatePopup && (
        <DateRangePopup
          initialStart={tripStart}
          initialEnd={tripEnd}
          onConfirm={saveTripDates}
          onClose={() => setShowDatePopup(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function SortablePlaceCard({
  place,
  onRemove,
  onTimeChange,
}: {
  place: PlaceItem;
  onRemove: (id: string) => void;
  onTimeChange: (id: string, time: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: place.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-2 rounded-lg border border-[--color-border] bg-[--color-background] p-3"
    >
      <span {...attributes} {...listeners} className="cursor-grab select-none text-lg text-[--color-text-muted] active:cursor-grabbing">⠿</span>
      <input
        type="time"
        value={place.time ?? ""}
        onChange={(e) => onTimeChange(place.id, e.target.value)}
        placeholder="time"
        className="w-[4.5rem] rounded border border-[--color-border] bg-[--color-surface] px-1.5 py-1 text-xs text-[--color-text-muted]"
      />
      <p className="flex-1 text-sm font-medium text-[--color-text]">{place.icon} {place.name}</p>
      <button type="button" onClick={() => onRemove(place.id)} className="text-xs text-[#c4704a]">✕</button>
    </div>
  );
}

function ChecklistSection({
  title, items, onToggle,
}: {
  title: string;
  items: ChecklistItem[];
  onToggle: (id: string) => void;
}) {
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

function BudgetStats({
  items, total, onBack,
}: {
  items: { category: string; amount: number }[];
  total: number;
  onBack: () => void;
}) {
  const categoryTotals = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + item.amount;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-sm text-[--color-text-muted]">← Back</button>
        <p className="font-semibold text-[--color-text]">Spending by Category</p>
      </div>
      <div className="space-y-3">
        {Object.entries(categoryTotals).map(([cat, amount]) => (
          <div key={cat} className="space-y-1">
            <div className="flex justify-between text-sm">
              <p className="text-[--color-text]">{cat}</p>
              <p className="font-medium text-[--color-text]">${amount}</p>
            </div>
            <div className="h-2 rounded-full bg-[--color-border]">
              <div
                className="h-2 rounded-full bg-[#2d6a4f] transition-all"
                style={{ width: `${total > 0 ? Math.round((amount / total) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
        {Object.keys(categoryTotals).length === 0 && (
          <p className="text-center text-sm text-[--color-text-muted]">No expenses yet.</p>
        )}
      </div>
    </div>
  );
}

function DateRangePopup({
  initialStart, initialEnd, onConfirm, onClose,
}: {
  initialStart: string;
  initialEnd: string;
  onConfirm: (start: string, end: string) => void;
  onClose: () => void;
}) {
  const now = new Date();
  const [rangeStart, setRangeStart] = useState<Date | null>(() => {
    const d = new Date(initialStart + "T00:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  });
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => {
    const d = new Date(initialEnd + "T00:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  });
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(initialStart + "T00:00:00");
    const base = Number.isNaN(d.getTime()) ? now : d;
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const [slideY, setSlideY] = useState(0);
  const [withTrans, setWithTrans] = useState(true);
  const [animating, setAnimating] = useState(false);
  const touchY = useRef(0);

  const calDays = useMemo(() => {
    const { year, month } = calMonth;
    const first = new Date(year, month, 1).getDay();
    const last = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= last; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [calMonth]);

  const updateRange = (date: Date) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }
    if (date < rangeStart) { setRangeEnd(rangeStart); setRangeStart(date); return; }
    setRangeEnd(date);
  };

  const isEndpoint = (d: Date) =>
    (rangeStart !== null && d.getTime() === rangeStart.getTime()) ||
    (rangeEnd !== null && d.getTime() === rangeEnd.getTime());

  const isMiddle = (d: Date) => {
    if (!rangeStart || !rangeEnd) return false;
    const t = d.getTime();
    return t > rangeStart.getTime() && t < rangeEnd.getTime();
  };

  const navigate = (dir: "next" | "prev") => {
    if (animating) return;
    setAnimating(true);
    setWithTrans(true);
    setSlideY(dir === "next" ? -100 : 100);
    setTimeout(() => {
      setWithTrans(false);
      setSlideY(dir === "next" ? 100 : -100);
      setCalMonth((p) => {
        if (dir === "next") return p.month === 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: p.month + 1 };
        return p.month === 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: p.month - 1 };
      });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setWithTrans(true);
        setSlideY(0);
        setTimeout(() => setAnimating(false), 300);
      }));
    }, 300);
  };

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const fmtLabel = (d: Date) => `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}`;
  const label = !rangeStart ? "Select dates" : !rangeEnd ? `${fmtLabel(rangeStart)} – ?` :
    `${fmtLabel(rangeStart)} – ${fmtLabel(rangeEnd)} (${Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1} days)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-80 rounded-xl bg-[--color-surface] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 text-center text-sm font-semibold text-[--color-text]">
          {MONTHS[calMonth.month]} {calMonth.year}
        </p>
        <div className="grid grid-cols-7 text-center text-xs text-[--color-text-muted]">
          {WEEK_DAYS.map((d) => <span key={d} className="py-1">{d}</span>)}
        </div>
        <div
          className="overflow-hidden"
          onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
          onTouchEnd={(e) => { const delta = touchY.current - e.changedTouches[0].clientY; if (Math.abs(delta) >= 30) navigate(delta > 0 ? "next" : "prev"); }}
          onWheel={(e) => navigate(e.deltaY > 0 ? "next" : "prev")}
        >
          <div
            className="grid grid-cols-7"
            style={{ transform: `translateY(${slideY}%)`, transition: withTrans ? "transform 0.3s ease" : "none" }}
          >
            {calDays.map((date, i) =>
              date ? (
                <div
                  key={date.toISOString()}
                  className="flex items-center justify-center py-1"
                  style={{ backgroundColor: isMiddle(date) ? "rgba(45,106,79,0.15)" : undefined }}
                >
                  <button
                    type="button"
                    onClick={() => updateRange(date)}
                    className={[
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors",
                      isEndpoint(date) ? "bg-[#2d6a4f] text-white" : "text-[--color-text] hover:bg-[--color-border]",
                    ].join(" ")}
                  >
                    {date.getDate()}
                  </button>
                </div>
              ) : <span key={`e-${i}`} />
            )}
          </div>
        </div>
        <p className="mt-2 rounded-lg bg-[--color-background] px-3 py-2 text-center text-xs text-[--color-text-muted]">{label}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[--color-border] py-2 text-sm">Cancel</button>
          <button
            type="button"
            onClick={() => rangeStart && onConfirm(fmt(rangeStart), rangeEnd ? fmt(rangeEnd) : fmt(rangeStart))}
            disabled={!rangeStart}
            className="flex-1 rounded-lg bg-[#2d6a4f] py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
