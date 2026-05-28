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
} from "@/lib/trips-storage";

type TripTab = "summary" | "itinerary" | "tripinfo" | "budget" | "checklist";
type BudgetItem = { id: string; category: string; subcategory: string; amount: number; date: string };
type PlaceItem = { id: string; name: string; category: string; icon: string; time?: string };
type ChecklistItem = { id: string; text: string; done: boolean };

const TRIP_TABS: Array<{ id: TripTab; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "itinerary", label: "Itinerary" },
  { id: "tripinfo", label: "Trip Info" },
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

const PLACE_CATEGORIES = [
  { label: "Mosque", icon: "🕌" },
  { label: "Restaurant", icon: "🍽️" },
  { label: "Hotel", icon: "🏨" },
  { label: "Shopping", icon: "🛍️" },
  { label: "Attraction", icon: "🎫" },
  { label: "Other", icon: "📍" },
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

function isInvalidDate(val: string): boolean {
  if (!val) return false;
  const d = new Date(val);
  return Number.isNaN(d.getTime());
}

export default function TripDetailPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = typeof params.tripId === "string" ? params.tripId : "";
  const trip = useMemo(() => getTripById(tripId), [tripId]);
  const detail = useMemo(() => getTripDetail(tripId), [tripId]);

  const [activeTab, setActiveTab] = useState<TripTab>("summary");
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [customChecklistInput, setCustomChecklistInput] = useState("");

  // Add place state
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [newPlaceCategory, setNewPlaceCategory] = useState<{ label: string; icon: string } | null>(null);
  const placeInputRef = useRef<HTMLInputElement>(null);

  // Memo focus state
  const [memoFocused, setMemoFocused] = useState(false);

  // Trip Info (flight + accommodation) — local state, not persisted
  const [flightDeparture, setFlightDeparture] = useState("");
  const [flightName, setFlightName] = useState("");
  const [flightArrival, setFlightArrival] = useState("");
  const [hotelName, setHotelName] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  // Budget state
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCategory, setBudgetCategory] = useState(BUDGET_PARENT_CATEGORIES[0]);
  const [budgetSubcategory, setBudgetSubcategory] = useState(BUDGET_CATEGORY_MAP[BUDGET_PARENT_CATEGORIES[0]][0]);
  const [budgetDay, setBudgetDay] = useState("");

  // Persistent data
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

  const destination = trip?.destination ?? tripId.replace(/-/g, " ");
  const companion = trip?.companion ?? "Solo";
  const startDate = trip?.startDate ?? "2026-08-16";
  const endDate = trip?.endDate ?? "2026-08-18";
  const days = useMemo(() => buildDayTabs(startDate, endDate), [startDate, endDate]);

  const totalBudget = budgetItems.reduce((sum, item) => sum + item.amount, 0);
  const dayPlaces = placesByDay[currentDayIndex] ?? [];
  const noteText = notesByDay[currentDayIndex] ?? "";

  // Date cross-validation
  const flightDateError =
    flightDeparture && flightArrival && flightDeparture > flightArrival
      ? "Departure must be before arrival"
      : null;
  const stayDateError =
    checkIn && checkOut && checkIn > checkOut
      ? "Check-in must be before check-out"
      : null;

  // Summary derived data
  const allChecklist = [
    ...checklistSections.essential,
    ...checklistSections.packing,
    ...checklistSections.quick,
  ];
  const checklistDone = allChecklist.filter((i) => i.done).length;
  const categoryTotals = budgetItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + item.amount;
    return acc;
  }, {});
  const dayPlaceSummaries = days
    .map((day, idx) => ({ day, places: placesByDay[idx] ?? [] }))
    .filter((d) => d.places.length > 0);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    saveTripDetail(tripId, { notesByDay, placesByDay, budgetItems, checklistSections });
  }, [tripId, notesByDay, placesByDay, budgetItems, checklistSections]);

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

  const addPlace = () => {
    if (!newPlaceName.trim()) return;
    const cat = newPlaceCategory ?? { label: "Other", icon: "📍" };
    const newPlace: PlaceItem = {
      id: Date.now().toString(),
      name: newPlaceName.trim(),
      category: cat.label,
      icon: cat.icon,
    };
    setPlacesByDay((prev) => ({
      ...prev,
      [currentDayIndex]: [...(prev[currentDayIndex] ?? []), newPlace],
    }));
    setNewPlaceName("");
    setNewPlaceCategory(null);
    setShowAddPlace(false);
  };

  const removePlace = (id: string) => {
    setPlacesByDay((prev) => ({
      ...prev,
      [currentDayIndex]: (prev[currentDayIndex] ?? []).filter((item) => item.id !== id),
    }));
  };

  const updatePlaceTime = (id: string, time: string) => {
    setPlacesByDay((prev) => ({
      ...prev,
      [currentDayIndex]: (prev[currentDayIndex] ?? []).map((p) =>
        p.id === id ? { ...p, time } : p
      ),
    }));
  };

  const toggleChecklist = (section: "essential" | "packing" | "quick", id: string) => {
    setChecklistSections((prev) => ({
      ...prev,
      [section]: prev[section].map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/planner" className="text-sm text-[--color-text-muted]">← Back to Trips</Link>
        <h1 className="text-lg font-semibold text-[--color-text]">{destination}</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-xl border border-[--color-border] bg-[--color-surface] p-2">
        {TRIP_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              "rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
              activeTab === tab.id
                ? "bg-primary-600 text-white"
                : "text-[--color-text-muted] hover:bg-[--color-background]",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-[--color-border] bg-[--color-surface] p-4 transition-all duration-300 ease-out">

        {/* ── Summary ── */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            {/* Cover */}
            <div className="flex h-32 items-end rounded-xl bg-gradient-to-br from-[#d8e7df] to-[#efe1d8] p-4">
              <div>
                <p className="text-xl font-bold text-[--color-text]">{destination}</p>
                <p className="text-xs text-[--color-text-muted]">
                  {formatTripDateRange(startDate, endDate)} · {companion}
                </p>
              </div>
            </div>

            {/* Itinerary summary */}
            <button
              type="button"
              onClick={() => setActiveTab("itinerary")}
              className="w-full space-y-2 rounded-lg border border-[--color-border] bg-[--color-background] p-3 text-left"
            >
              <p className="text-sm font-medium text-[--color-text]">🗺 Itinerary</p>
              {dayPlaceSummaries.length === 0 ? (
                <p className="text-xs text-[--color-text-muted]">No places added yet.</p>
              ) : (
                <>
                  {dayPlaceSummaries.slice(0, 3).map(({ day, places }) => (
                    <div key={day}>
                      <p className="text-xs font-medium text-[--color-text-muted]">{day}</p>
                      <p className="text-sm text-[--color-text]">
                        {places
                          .slice(0, 3)
                          .map((p) => `${p.icon} ${p.name}`)
                          .join(" → ")}
                        {places.length > 3 && ` +${places.length - 3}`}
                      </p>
                    </div>
                  ))}
                  {dayPlaceSummaries.length > 3 && (
                    <p className="text-xs text-primary-600">
                      +{dayPlaceSummaries.length - 3} more days →
                    </p>
                  )}
                </>
              )}
            </button>

            {/* Budget summary */}
            <button
              type="button"
              onClick={() => setActiveTab("budget")}
              className="w-full space-y-2 rounded-lg border border-[--color-border] bg-[--color-background] p-3 text-left"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[--color-text]">💰 Budget</p>
                <p className="text-sm font-semibold text-primary-600">${totalBudget}</p>
              </div>
              {Object.entries(categoryTotals).length === 0 ? (
                <p className="text-xs text-[--color-text-muted]">No expenses yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(categoryTotals).map(([cat, amount]) => (
                    <div key={cat} className="flex items-center gap-2">
                      <p className="w-28 truncate text-xs text-[--color-text-muted]">{cat}</p>
                      <div className="flex-1 rounded-full bg-[--color-border] h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-primary-600"
                          style={{ width: `${totalBudget > 0 ? (amount / totalBudget) * 100 : 0}%` }}
                        />
                      </div>
                      <p className="w-10 text-right text-xs font-medium text-[--color-text]">${amount}</p>
                    </div>
                  ))}
                </div>
              )}
            </button>

            {/* Checklist summary */}
            <button
              type="button"
              onClick={() => setActiveTab("checklist")}
              className="flex w-full items-center justify-between rounded-lg border border-[--color-border] bg-[--color-background] p-3"
            >
              <p className="text-sm font-medium text-[--color-text]">✅ Checklist</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 rounded-full bg-[--color-border]">
                  <div
                    className="h-2 rounded-full bg-primary-600"
                    style={{
                      width: allChecklist.length > 0
                        ? `${(checklistDone / allChecklist.length) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
                <p className="text-xs text-[--color-text-muted]">
                  {checklistDone}/{allChecklist.length} completed
                </p>
              </div>
            </button>
          </div>
        )}

        {/* ── Itinerary ── */}
        {activeTab === "itinerary" && (
          <div className="space-y-4">
            {/* Day tabs */}
            <div className="flex gap-2 overflow-x-auto">
              {days.map((day, index) => (
                <button
                  type="button"
                  key={day}
                  onClick={() => setCurrentDayIndex(index)}
                  className={[
                    "rounded-full px-3 py-1.5 text-sm whitespace-nowrap",
                    currentDayIndex === index
                      ? "bg-primary-600 text-white"
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
              onChange={(event) =>
                setNotesByDay((prev) => ({ ...prev, [currentDayIndex]: event.target.value }))
              }
              placeholder="Day memo... (optional)"
              className="w-full resize-none rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm transition-all duration-150"
            />

            {/* Add Place */}
            <div className="space-y-2">
              {!showAddPlace ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPlace(true);
                    setTimeout(() => placeInputRef.current?.focus(), 50);
                  }}
                  className="w-full rounded-lg border border-dashed border-[--color-border] py-2 text-sm text-[--color-text-muted] hover:border-primary-600 hover:text-primary-600 transition-colors"
                >
                  + Add Place
                </button>
              ) : (
                <div className="space-y-2 rounded-lg border border-[--color-border] bg-[--color-background] p-3">
                  <div className="grid grid-cols-3 gap-2">
                    {PLACE_CATEGORIES.map((cat) => (
                      <button
                        type="button"
                        key={cat.label}
                        onClick={() => setNewPlaceCategory(cat)}
                        className={[
                          "rounded-lg border px-2 py-1.5 text-xs transition-colors",
                          newPlaceCategory?.label === cat.label
                            ? "border-primary-600 bg-primary-600 text-white"
                            : "border-[--color-border] text-[--color-text-muted]",
                        ].join(" ")}
                      >
                        {cat.icon} {cat.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={placeInputRef}
                      value={newPlaceName}
                      onChange={(e) => setNewPlaceName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addPlace()}
                      placeholder="Place name"
                      className="flex-1 rounded border border-[--color-border] px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={addPlace}
                      className="rounded bg-primary-600 px-3 py-1.5 text-sm text-white"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPlace(false);
                        setNewPlaceName("");
                        setNewPlaceCategory(null);
                      }}
                      className="rounded border border-[--color-border] px-3 py-1.5 text-sm text-[--color-text-muted]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sortable place list */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={dayPlaces.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {dayPlaces.map((place) => (
                    <SortablePlaceCard
                      key={place.id}
                      place={place}
                      onRemove={removePlace}
                      onTimeChange={updatePlaceTime}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* ── Trip Info ── */}
        {activeTab === "tripinfo" && (
          <div className="space-y-4">
            <div className="flex h-32 items-end rounded-xl bg-gradient-to-br from-[#d8e7df] to-[#efe1d8] p-4">
              <p className="text-lg font-semibold text-[--color-text]">{destination}</p>
            </div>
            <div className="grid gap-2 text-sm text-[--color-text-muted] sm:grid-cols-2">
              <p>Date: {formatTripDateRange(startDate, endDate)}</p>
              <p>Companion: {companion}</p>
            </div>

            {/* Flight */}
            <div className="space-y-3 rounded-lg border border-[--color-border] bg-[--color-background] p-3">
              <p className="font-medium text-[--color-text]">✈️ Flight</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <input
                    type="date"
                    value={flightDeparture}
                    onChange={(e) => setFlightDeparture(e.target.value)}
                    placeholder="Departure date"
                    className={[
                      "w-full rounded border px-2 py-1.5 text-sm",
                      isInvalidDate(flightDeparture) || flightDateError
                        ? "border-red-400 bg-red-50"
                        : "border-[--color-border]",
                    ].join(" ")}
                  />
                  {isInvalidDate(flightDeparture) && (
                    <p className="text-xs text-red-500">Invalid date</p>
                  )}
                </div>
                <input
                  type="text"
                  value={flightName}
                  onChange={(e) => setFlightName(e.target.value)}
                  placeholder="Flight name"
                  className="rounded border border-[--color-border] px-2 py-1.5 text-sm"
                />
                <div className="space-y-1">
                  <input
                    type="date"
                    value={flightArrival}
                    onChange={(e) => setFlightArrival(e.target.value)}
                    placeholder="Arrival date"
                    className={[
                      "w-full rounded border px-2 py-1.5 text-sm",
                      isInvalidDate(flightArrival) || flightDateError
                        ? "border-red-400 bg-red-50"
                        : "border-[--color-border]",
                    ].join(" ")}
                  />
                  {isInvalidDate(flightArrival) && (
                    <p className="text-xs text-red-500">Invalid date</p>
                  )}
                </div>
              </div>
              {flightDateError && (
                <p className="text-xs text-red-500">{flightDateError}</p>
              )}
            </div>

            {/* Accommodation */}
            <div className="space-y-3 rounded-lg border border-[--color-border] bg-[--color-background] p-3">
              <p className="font-medium text-[--color-text]">🏨 Accommodation</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  value={hotelName}
                  onChange={(e) => setHotelName(e.target.value)}
                  placeholder="Hotel name"
                  className="rounded border border-[--color-border] px-2 py-1.5 text-sm"
                />
                <div className="space-y-1">
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    placeholder="Check-in"
                    className={[
                      "w-full rounded border px-2 py-1.5 text-sm",
                      isInvalidDate(checkIn) || stayDateError
                        ? "border-red-400 bg-red-50"
                        : "border-[--color-border]",
                    ].join(" ")}
                  />
                  {isInvalidDate(checkIn) && (
                    <p className="text-xs text-red-500">Invalid date</p>
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    placeholder="Check-out"
                    className={[
                      "w-full rounded border px-2 py-1.5 text-sm",
                      isInvalidDate(checkOut) || stayDateError
                        ? "border-red-400 bg-red-50"
                        : "border-[--color-border]",
                    ].join(" ")}
                  />
                  {isInvalidDate(checkOut) && (
                    <p className="text-xs text-red-500">Invalid date</p>
                  )}
                </div>
              </div>
              {stayDateError && (
                <p className="text-xs text-red-500">{stayDateError}</p>
              )}
            </div>

            <div className="rounded-lg border border-dashed border-[--color-border] bg-[--color-background] p-3">
              <p className="font-medium text-[--color-text]">📎 Attachments</p>
            </div>
          </div>
        )}

        {/* ── Budget ── */}
        {activeTab === "budget" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-primary-600 px-4 py-3 text-white">
              <p className="text-xs opacity-90">Total Spend</p>
              <p className="text-2xl font-semibold">${totalBudget}</p>
            </div>

            <div className="space-y-2">
              {budgetItems.map((item) => {
                const displaySub = item.subcategory || item.category;
                return (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm">
                    <p className="text-[--color-text]">{displaySub} · {item.date}</p>
                    <p className="font-medium text-[--color-text]">${item.amount}</p>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 rounded-lg border border-[--color-border] bg-[--color-background] p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={budgetCategory}
                  onChange={(event) => {
                    const cat = event.target.value;
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
                    onChange={(event) => setBudgetSubcategory(event.target.value)}
                    className="rounded border border-[--color-border] bg-[--color-surface] px-2 py-1.5 text-sm"
                  >
                    {BUDGET_CATEGORY_MAP[budgetCategory].map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={budgetSubcategory}
                    onChange={(event) => setBudgetSubcategory(event.target.value)}
                    placeholder="Note (optional)"
                    className="rounded border border-[--color-border] px-2 py-1.5 text-sm"
                  />
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  value={budgetAmount}
                  onChange={(event) => setBudgetAmount(event.target.value)}
                  placeholder="Amount ($)"
                  type="number"
                  min="0"
                  className="rounded border border-[--color-border] px-2 py-1.5 text-sm"
                />
                <input
                  value={budgetDay}
                  onChange={(event) => setBudgetDay(event.target.value)}
                  placeholder="Day (e.g. 1)"
                  inputMode="numeric"
                  className="rounded border border-[--color-border] px-2 py-1.5 text-sm"
                />
                <button type="button" onClick={addBudgetItem} className="rounded bg-primary-600 px-2 py-1.5 text-sm text-white">
                  + Add Cost
                </button>
              </div>
            </div>
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
                    type="button"
                    key={item}
                    onClick={() => addQuickChecklist(item)}
                    className="rounded-full border border-[--color-border] px-3 py-1 text-xs text-[--color-text-muted]"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={customChecklistInput}
                  onChange={(event) => setCustomChecklistInput(event.target.value)}
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
                  className="rounded bg-primary-600 px-3 py-1.5 text-sm text-white"
                >
                  Add
                </button>
              </div>
            </div>

            <ChecklistSection
              title="Essential Documents"
              items={checklistSections.essential}
              onToggle={(id) => toggleChecklist("essential", id)}
            />
            <ChecklistSection
              title="General Packing"
              items={checklistSections.packing}
              onToggle={(id) => toggleChecklist("packing", id)}
            />
            <ChecklistSection
              title="Quick Added"
              items={checklistSections.quick}
              onToggle={(id) => toggleChecklist("quick", id)}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function SortablePlaceCard({
  place,
  onRemove,
  onTimeChange,
}: {
  place: PlaceItem;
  onRemove: (id: string) => void;
  onTimeChange: (id: string, time: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: place.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-[--color-border] bg-[--color-background] p-3"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab select-none text-lg text-[--color-text-muted] active:cursor-grabbing"
        aria-label="drag to reorder"
      >
        ⠿
      </span>
      <input
        type="time"
        value={place.time ?? ""}
        onChange={(e) => onTimeChange(place.id, e.target.value)}
        className="w-[4.5rem] rounded border border-[--color-border] bg-[--color-surface] px-1.5 py-1 text-xs text-[--color-text-muted]"
      />
      <p className="flex-1 text-sm font-medium text-[--color-text]">
        {place.icon} {place.name}
      </p>
      <button
        type="button"
        onClick={() => onRemove(place.id)}
        className="text-xs text-[--color-accent-500]"
      >
        Delete
      </button>
    </div>
  );
}

function ChecklistSection({
  title,
  items,
  onToggle,
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
          <label key={item.id} className="flex items-center gap-2 text-sm text-[--color-text-muted]">
            <input type="checkbox" checked={item.done} onChange={() => onToggle(item.id)} />
            <span className={item.done ? "line-through opacity-60" : ""}>{item.text}</span>
          </label>
        ))}
        {items.length === 0 && <p className="text-xs text-[--color-text-muted]">No items yet.</p>}
      </div>
    </div>
  );
}
