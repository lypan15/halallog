"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  buildDayTabs,
  defaultTripDetail,
  formatTripDateRange,
  getTripById,
  getTripDetail,
  saveTripDetail,
} from "@/lib/trips-storage";

type TripTab = "itinerary" | "overview" | "budget" | "checklist";
type BudgetItem = { id: string; category: string; amount: number; date: string };
type PlaceItem = { id: string; name: string; category: string; icon: string };
type ChecklistItem = { id: string; text: string; done: boolean };

const TRIP_TABS: Array<{ id: TripTab; label: string }> = [
  { id: "itinerary", label: "Itinerary" },
  { id: "overview", label: "Overview" },
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

const BUDGET_CATEGORIES = ["🍽️Food", "🏨Accommodation", "✈️Transport", "🎫Activities", "🛍️Shopping", "Others"];

export default function TripDetailPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = typeof params.tripId === "string" ? params.tripId : "";
  const trip = useMemo(() => getTripById(tripId), [tripId]);
  const detail = useMemo(() => getTripDetail(tripId), [tripId]);
  const [activeTab, setActiveTab] = useState<TripTab>("itinerary");
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [customChecklistInput, setCustomChecklistInput] = useState("");
  const [placeInput, setPlaceInput] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCategory, setBudgetCategory] = useState(BUDGET_CATEGORIES[0]);
  const [budgetDate, setBudgetDate] = useState("");
  const [notesByDay, setNotesByDay] = useState<Record<number, string>>(detail.notesByDay ?? {});
  const [placesByDay, setPlacesByDay] = useState<Record<number, PlaceItem[]>>(detail.placesByDay ?? defaultTripDetail().placesByDay);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(detail.budgetItems ?? defaultTripDetail().budgetItems);
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

  useEffect(() => {
    saveTripDetail(tripId, { notesByDay, placesByDay, budgetItems, checklistSections });
  }, [tripId, notesByDay, placesByDay, budgetItems, checklistSections]);

  const addPlace = () => {
    if (!placeInput.trim()) return;
    const newPlace: PlaceItem = { id: Date.now().toString(), name: placeInput.trim(), category: "Place", icon: "📍" };
    setPlacesByDay((prev) => ({ ...prev, [currentDayIndex]: [...(prev[currentDayIndex] ?? []), newPlace] }));
    setPlaceInput("");
  };

  const removePlace = (id: string) => {
    setPlacesByDay((prev) => ({
      ...prev,
      [currentDayIndex]: (prev[currentDayIndex] ?? []).filter((item) => item.id !== id),
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
    if (!amount || !budgetDate) return;
    setBudgetItems((prev) => [
      ...prev,
      { id: `${Date.now()}`, category: budgetCategory, amount, date: budgetDate },
    ]);
    setBudgetAmount("");
    setBudgetDate("");
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
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
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
        {activeTab === "itinerary" && (
          <div className="space-y-4">
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

            <div className="flex flex-wrap gap-2">
              <input
                value={placeInput}
                onChange={(event) => setPlaceInput(event.target.value)}
                placeholder="Add place name"
                className="min-w-48 flex-1 rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm"
              />
              <button type="button" onClick={addPlace} className="rounded-lg bg-primary-600 px-3 py-2 text-sm text-white">
                + Add Place
              </button>
              <button type="button" className="rounded-lg border border-[--color-border] px-3 py-2 text-sm">
                + Add Memo
              </button>
            </div>

            <textarea
              value={noteText}
              onChange={(event) =>
                setNotesByDay((prev) => ({ ...prev, [currentDayIndex]: event.target.value }))
              }
              placeholder="Write day memo..."
              className="w-full rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm"
            />

            <div className="space-y-2">
              {dayPlaces.map((place, index) => (
                <div key={place.id} className="rounded-lg border border-[--color-border] bg-[--color-background] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[--color-text]">
                      {place.icon} {place.name}
                    </p>
                    <button type="button" onClick={() => removePlace(place.id)} className="text-xs text-[--color-accent-500]">
                      Delete
                    </button>
                  </div>
                  {index < dayPlaces.length - 1 && (
                    <p className="mt-2 text-xs text-[--color-text-muted]">Travel time: 18 min (placeholder)</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="flex h-36 items-end rounded-xl bg-gradient-to-br from-[#d8e7df] to-[#efe1d8] p-4">
              <p className="text-lg font-semibold text-[--color-text]">{destination}</p>
            </div>
            <div className="grid gap-2 text-sm text-[--color-text-muted] sm:grid-cols-2">
              <p>Date: {formatTripDateRange(startDate, endDate)}</p>
              <p>Companion: {companion}</p>
            </div>

            <div className="space-y-3 rounded-lg border border-[--color-border] bg-[--color-background] p-3">
              <p className="font-medium text-[--color-text]">✈️ Flight</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <input placeholder="Departure date" className="rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                <input placeholder="Flight name" className="rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                <input placeholder="Arrival date" className="rounded border border-[--color-border] px-2 py-1.5 text-sm" />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-[--color-border] bg-[--color-background] p-3">
              <p className="font-medium text-[--color-text]">🏨 Accommodation</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <input placeholder="Hotel name" className="rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                <input placeholder="Check-in" className="rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                <input placeholder="Check-out" className="rounded border border-[--color-border] px-2 py-1.5 text-sm" />
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-[--color-border] bg-[--color-background] p-3">
              <p className="font-medium text-[--color-text]">📎 Attachments</p>
            </div>
          </div>
        )}

        {activeTab === "budget" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-primary-600 px-4 py-3 text-white">
              <p className="text-xs opacity-90">Total Spend</p>
              <p className="text-2xl font-semibold">${totalBudget}</p>
            </div>
            <div className="space-y-2">
              {budgetItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm">
                  <p className="text-[--color-text]">{item.category} · {item.date}</p>
                  <p className="font-medium text-[--color-text]">${item.amount}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-2 rounded-lg border border-[--color-border] bg-[--color-background] p-3 sm:grid-cols-4">
              <select
                value={budgetCategory}
                onChange={(event) => setBudgetCategory(event.target.value)}
                className="rounded border border-[--color-border] px-2 py-1.5 text-sm"
              >
                {BUDGET_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input
                value={budgetAmount}
                onChange={(event) => setBudgetAmount(event.target.value)}
                placeholder="Amount"
                className="rounded border border-[--color-border] px-2 py-1.5 text-sm"
              />
              <input
                value={budgetDate}
                onChange={(event) => setBudgetDate(event.target.value)}
                placeholder="Day (e.g. Day 2)"
                className="rounded border border-[--color-border] px-2 py-1.5 text-sm"
              />
              <button type="button" onClick={addBudgetItem} className="rounded bg-primary-600 px-2 py-1.5 text-sm text-white">
                + Add Cost
              </button>
            </div>
          </div>
        )}

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
