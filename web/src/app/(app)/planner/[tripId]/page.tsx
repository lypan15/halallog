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
  type TripBudgetItem,
  type TripChecklistItem,
  type TripPlace,
  type TripRecord,
} from "@/lib/trips-storage";
import { formatDate, formatDateLabel as fmtDateLabel } from "@/lib/date-utils";
import { Calendar, SHORT_MONTHS } from "@/components/Calendar";
import { FLIGHT_DB, type FlightRecord } from "@/constants/flightDatabase";

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
  { label: "Things to Do", icon: "🎫" },
  { label: "Shopping", icon: "🛍️" },
  { label: "Transport", icon: "🚌" },
  { label: "Custom", icon: "📌" },
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

const FLIGHT_PRICE_CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "KRW", symbol: "₩" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "JPY", symbol: "¥" },
  { code: "AED", symbol: "د.إ" },
  { code: "SAR", symbol: "﷼" },
  { code: "MYR", symbol: "RM" },
  { code: "SGD", symbol: "S$" },
  { code: "AUD", symbol: "A$" },
  { code: "THB", symbol: "฿" },
  { code: "TRY", symbol: "₺" },
  { code: "QAR", symbol: "﷼" },
  { code: "IDR", symbol: "Rp" },
];

const FAB_SEARCHABLE = ["Place", "Restaurant", "Prayer Space", "Things to Do", "Shopping"];

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  if ([h, m].some(isNaN)) return "";
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return yyyy + "-" + mm + "-" + dd;
}

function formatTime12h(time: string): string {
  if (!time) return "";
  const parts = time.split(":");
  if (parts.length < 2) return time;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return time;
  const period = h < 12 ? "AM" : "PM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return h12 + ":" + m + " " + period;
}

function getValidationMessage(category: string): string {
  const msgs: Record<string, string> = {
    "Place": "Please enter a place name",
    "Restaurant": "Please enter a restaurant name",
    "Prayer Space": "Please enter a prayer space name",
    "Things to Do": "Please enter a name",
    "Shopping": "Please enter a store name",
  };
  return msgs[category] ?? "Please enter a name";
}

type MockLocation = { name: string; address: string; lat: number; lng: number; category: string };
const MOCK_LOCATIONS: MockLocation[] = [
  // Place
  { category: "Place", name: "Gyeongbokgung Palace", address: "161 Sajik-ro, Jongno-gu, Seoul", lat: 37.5796, lng: 126.9770 },
  { category: "Place", name: "N Seoul Tower", address: "105 Namsangongwon-gil, Yongsan-gu, Seoul", lat: 37.5512, lng: 126.9882 },
  { category: "Place", name: "Bukchon Hanok Village", address: "Gyedong-gil, Jongno-gu, Seoul", lat: 37.5826, lng: 126.9849 },
  { category: "Place", name: "Changdeokgung Palace", address: "99 Yulgok-ro, Jongno-gu, Seoul", lat: 37.5794, lng: 126.9910 },
  { category: "Place", name: "Hagia Sophia", address: "Sultan Ahmet Meydanı, Fatih, Istanbul", lat: 41.0086, lng: 28.9802 },
  { category: "Place", name: "Topkapi Palace", address: "Cankurtaran, 34122 Fatih, Istanbul", lat: 41.0115, lng: 28.9833 },
  { category: "Place", name: "Galata Tower", address: "Galata, Büyük Hendek Cd. No:1, Istanbul", lat: 41.0256, lng: 28.9741 },
  { category: "Place", name: "Bosphorus Viewpoint", address: "Rumeli Hisarı, Sarıyer, Istanbul", lat: 41.0890, lng: 29.0573 },
  { category: "Place", name: "Burj Khalifa", address: "1 Sheikh Mohammed bin Rashid Blvd, Dubai", lat: 25.1972, lng: 55.2744 },
  { category: "Place", name: "Dubai Frame", address: "Zabeel Park, Gate 4, Dubai", lat: 25.2350, lng: 55.3009 },
  { category: "Place", name: "Palm Jumeirah", address: "Palm Jumeirah, Dubai", lat: 25.1124, lng: 55.1390 },
  { category: "Place", name: "Petronas Twin Towers", address: "Kuala Lumpur City Centre, 50088 KL", lat: 3.1578, lng: 101.7119 },
  { category: "Place", name: "Batu Caves", address: "Gombak, 68100 Batu Caves, Selangor", lat: 3.2379, lng: 101.6840 },
  { category: "Place", name: "Gardens by the Bay", address: "18 Marina Gardens Dr, Singapore", lat: 1.2816, lng: 103.8636 },
  { category: "Place", name: "Marina Bay Sands", address: "10 Bayfront Ave, Singapore", lat: 1.2834, lng: 103.8607 },
  { category: "Place", name: "Senso-ji Temple", address: "2-3-1 Asakusa, Taito City, Tokyo", lat: 35.7148, lng: 139.7967 },
  { category: "Place", name: "Shinjuku Gyoen", address: "11 Naitomachi, Shinjuku City, Tokyo", lat: 35.6851, lng: 139.7105 },
  { category: "Place", name: "Tower of London", address: "St Katharine's & Wapping, London EC3N 4AB", lat: 51.5081, lng: -0.0759 },
  { category: "Place", name: "Hyde Park", address: "Hyde Park, London W2 2UH", lat: 51.5073, lng: -0.1657 },
  { category: "Place", name: "Eiffel Tower", address: "Champ de Mars, 5 Av. Anatole France, Paris", lat: 48.8584, lng: 2.2945 },
  // Restaurant
  { category: "Restaurant", name: "Itaewon Halal Food Street", address: "Itaewon-ro, Yongsan-gu, Seoul", lat: 37.5340, lng: 126.9944 },
  { category: "Restaurant", name: "Makan Korean Halal", address: "12 Cheongpa-ro, Yongsan-gu, Seoul", lat: 37.5402, lng: 126.9657 },
  { category: "Restaurant", name: "Hamdi Restaurant", address: "Kalçın Sk. No:17, Eminönü, Istanbul", lat: 41.0141, lng: 28.9716 },
  { category: "Restaurant", name: "Hafız Mustafa", address: "Hamidiye Cd. No:84, Fatih, Istanbul", lat: 41.0168, lng: 28.9709 },
  { category: "Restaurant", name: "Nusret Etiler", address: "Bronz Sk. No:1, Etiler, Istanbul", lat: 41.0784, lng: 29.0357 },
  { category: "Restaurant", name: "Al Baik Dubai", address: "Sheikh Zayed Rd, Al Quoz, Dubai", lat: 25.1522, lng: 55.2396 },
  { category: "Restaurant", name: "Ravi Restaurant Dubai", address: "Satwa, Dubai", lat: 25.2372, lng: 55.2631 },
  { category: "Restaurant", name: "Al-Azhar Restaurant", address: "18 Baghdad St, Little India, Singapore", lat: 1.3024, lng: 103.8516 },
  { category: "Restaurant", name: "Hjh Maimunah Restaurant", address: "11 Jln Pisang, Singapore 199078", lat: 1.3057, lng: 103.8587 },
  { category: "Restaurant", name: "Zamzam Restaurant", address: "697-699 North Bridge Rd, Singapore", lat: 1.3000, lng: 103.8605 },
  { category: "Restaurant", name: "Nasi Kandar Pelita", address: "149 Ampang Rd, 50450 Kuala Lumpur", lat: 3.1590, lng: 101.7230 },
  { category: "Restaurant", name: "Village Park Restaurant KL", address: "Jln SS 21/37, Damansara Utama, PJ", lat: 3.1368, lng: 101.6258 },
  { category: "Restaurant", name: "Tayyabs", address: "83-89 Fieldgate St, Whitechapel, London E1 1JU", lat: 51.5139, lng: -0.0571 },
  { category: "Restaurant", name: "Lahore Kebab House", address: "2-10 Umberston St, Whitechapel, London", lat: 51.5150, lng: -0.0668 },
  { category: "Restaurant", name: "Marhaba London", address: "29 Edgware Rd, London W2 2JE", lat: 51.5155, lng: -0.1634 },
  { category: "Restaurant", name: "Al-Halal Kitchen Tokyo", address: "2-22-7 Shinjuku, Shinjuku City, Tokyo", lat: 35.6895, lng: 139.6917 },
  { category: "Restaurant", name: "Malay Halal Ramen", address: "4-30-3 Nakano, Nakano City, Tokyo", lat: 35.7079, lng: 139.6659 },
  { category: "Restaurant", name: "La Mosquée de Paris Café", address: "39 Rue Geoffroy-Saint-Hilaire, Paris", lat: 48.8440, lng: 2.3528 },
  { category: "Restaurant", name: "Istanbul Kebab Paris", address: "14 Rue de la Huchette, Paris 75005", lat: 48.8527, lng: 2.3475 },
  { category: "Restaurant", name: "Kunafa House KL", address: "Jln Bukit Bintang, 55100 Kuala Lumpur", lat: 3.1462, lng: 101.7124 },
  // Prayer Space
  { category: "Prayer Space", name: "Seoul Central Mosque", address: "39 Usadan-ro 10-gil, Yongsan-gu, Seoul", lat: 37.5344, lng: 126.9936 },
  { category: "Prayer Space", name: "Masjid Itaewon", address: "Itaewon 1-dong, Yongsan-gu, Seoul", lat: 37.5348, lng: 126.9939 },
  { category: "Prayer Space", name: "Gangnam Prayer Hall", address: "135 Teheran-ro, Gangnam-gu, Seoul", lat: 37.5012, lng: 127.0377 },
  { category: "Prayer Space", name: "Blue Mosque (Sultan Ahmed)", address: "Atmeydanı Cd. No:7, Fatih, Istanbul", lat: 41.0054, lng: 28.9768 },
  { category: "Prayer Space", name: "Süleymaniye Mosque", address: "Prof. Sıddık Sami Onar Cd., Fatih, Istanbul", lat: 41.0161, lng: 28.9637 },
  { category: "Prayer Space", name: "Fatih Mosque", address: "İslambol Cd. No:2, Fatih, Istanbul", lat: 41.0202, lng: 28.9501 },
  { category: "Prayer Space", name: "Grand Mosque Dubai", address: "Al Fahidi St, Bur Dubai, Dubai", lat: 25.2629, lng: 55.2936 },
  { category: "Prayer Space", name: "Jumeirah Mosque", address: "Jumeirah Beach Rd, Jumeirah 1, Dubai", lat: 25.2330, lng: 55.2488 },
  { category: "Prayer Space", name: "Al Farooq Omar Mosque", address: "Street No 17, Safa, Dubai", lat: 25.1782, lng: 55.2368 },
  { category: "Prayer Space", name: "Masjid Sultan Singapore", address: "3 Muscat St, Singapore 198833", lat: 1.3044, lng: 103.8591 },
  { category: "Prayer Space", name: "Masjid Abdul Gaffoor", address: "41 Dunlop St, Singapore 209369", lat: 1.3063, lng: 103.8534 },
  { category: "Prayer Space", name: "National Mosque Malaysia", address: "Jln Lembah Perdana, Kuala Lumpur", lat: 3.1441, lng: 101.6927 },
  { category: "Prayer Space", name: "Masjid Jamek", address: "Jln Tun Perak, 50100 Kuala Lumpur", lat: 3.1459, lng: 101.6952 },
  { category: "Prayer Space", name: "Masjid Wilayah Persekutuan", address: "Jln Duta, Segambut, 50480 KL", lat: 3.1747, lng: 101.6698 },
  { category: "Prayer Space", name: "London Central Mosque", address: "146 Park Rd, London NW8 7RG", lat: 51.5264, lng: -0.1593 },
  { category: "Prayer Space", name: "East London Mosque", address: "82-92 Whitechapel Rd, London E1 1JQ", lat: 51.5161, lng: -0.0684 },
  { category: "Prayer Space", name: "Finsbury Park Mosque", address: "7-11 St Thomas's Rd, London N4 2QH", lat: 51.5643, lng: -0.1036 },
  { category: "Prayer Space", name: "Tokyo Camii", address: "1-19 Oyamacho, Shibuya City, Tokyo", lat: 35.6682, lng: 139.7008 },
  { category: "Prayer Space", name: "Grande Mosquée de Paris", address: "2 Bis Pl. du Puits de l'Ermite, Paris", lat: 48.8444, lng: 2.3537 },
  { category: "Prayer Space", name: "Mosquée Adda'wa Paris", address: "39 Rue de Tanger, Paris 75019", lat: 48.8833, lng: 2.3680 },
  // Things to Do
  { category: "Things to Do", name: "Han River Cruise Seoul", address: "Yeouido Hangang Park, Seoul", lat: 37.5260, lng: 126.9320 },
  { category: "Things to Do", name: "K-Culture Experience Tour", address: "4 Insadong-gil, Jongno-gu, Seoul", lat: 37.5740, lng: 126.9854 },
  { category: "Things to Do", name: "DMZ Tour from Seoul", address: "Seoul Station, Seoul", lat: 37.5546, lng: 126.9707 },
  { category: "Things to Do", name: "Bosphorus Boat Tour", address: "Eminönü Pier, Istanbul", lat: 41.0168, lng: 28.9809 },
  { category: "Things to Do", name: "Princes Islands Tour", address: "Adalar, Istanbul", lat: 40.8766, lng: 29.0874 },
  { category: "Things to Do", name: "Cappadocia Hot Air Balloon", address: "Göreme, Nevşehir Province, Turkey", lat: 38.6431, lng: 34.8296 },
  { category: "Things to Do", name: "Dubai Desert Safari", address: "Al Marmum Desert, Dubai", lat: 24.8950, lng: 55.3690 },
  { category: "Things to Do", name: "Dubai Marina Yacht Cruise", address: "Dubai Marina, Dubai", lat: 25.0819, lng: 55.1367 },
  { category: "Things to Do", name: "Burj Khalifa At the Top", address: "1 Sheikh Mohammed bin Rashid Blvd, Dubai", lat: 25.1972, lng: 55.2744 },
  { category: "Things to Do", name: "Universal Studios Singapore", address: "8 Sentosa Gateway, Singapore 098269", lat: 1.2540, lng: 103.8238 },
  { category: "Things to Do", name: "Singapore Night Safari", address: "80 Mandai Lake Rd, Singapore 729826", lat: 1.4043, lng: 103.7926 },
  { category: "Things to Do", name: "Singapore Flyer", address: "30 Raffles Ave, Singapore 039803", lat: 1.2893, lng: 103.8631 },
  { category: "Things to Do", name: "KL Tower Observation Deck", address: "Bukit Nanas, 50480 Kuala Lumpur", lat: 3.1528, lng: 101.7038 },
  { category: "Things to Do", name: "Petronas Towers Sky Bridge", address: "KLCC, 50088 Kuala Lumpur", lat: 3.1578, lng: 101.7119 },
  { category: "Things to Do", name: "Thames River Cruise London", address: "Westminster Pier, Victoria Embankment, London", lat: 51.5024, lng: -0.1222 },
  { category: "Things to Do", name: "Harry Potter Studio Tour", address: "Studio Tour Dr, Leavesden WD25 7LR", lat: 51.6903, lng: -0.4199 },
  { category: "Things to Do", name: "Tokyo DisneySea", address: "1-13 Maihama, Urayasu, Chiba", lat: 35.6270, lng: 139.8824 },
  { category: "Things to Do", name: "Mt. Fuji Day Trip", address: "Fujisan, Fujiyoshida, Yamanashi", lat: 35.3606, lng: 138.7274 },
  { category: "Things to Do", name: "Seine River Cruise Paris", address: "Port de la Bourdonnais, Paris 75007", lat: 48.8603, lng: 2.2917 },
  { category: "Things to Do", name: "Versailles Palace Tour", address: "Place d'Armes, 78000 Versailles", lat: 48.8049, lng: 2.1204 },
  // Shopping
  { category: "Shopping", name: "Myeongdong Shopping Street", address: "Myeongdong, Jung-gu, Seoul", lat: 37.5630, lng: 126.9850 },
  { category: "Shopping", name: "COEX Mall", address: "513 Yeongdong-daero, Gangnam-gu, Seoul", lat: 37.5115, lng: 127.0592 },
  { category: "Shopping", name: "Dongdaemun Design Plaza", address: "281 Eulji-ro, Jung-gu, Seoul", lat: 37.5669, lng: 127.0095 },
  { category: "Shopping", name: "Namdaemun Market", address: "21 Namdaemunsijang 4-gil, Jung-gu, Seoul", lat: 37.5594, lng: 126.9770 },
  { category: "Shopping", name: "Grand Bazaar Istanbul", address: "Kalpakçılar Cd. No:22, Fatih, Istanbul", lat: 41.0108, lng: 28.9681 },
  { category: "Shopping", name: "Spice Bazaar Istanbul", address: "Rüstem Paşa, Mısır Çarşısı No:1, Istanbul", lat: 41.0168, lng: 28.9695 },
  { category: "Shopping", name: "Dubai Mall", address: "Financial Centre Rd, Downtown Dubai", lat: 25.1985, lng: 55.2796 },
  { category: "Shopping", name: "Mall of the Emirates", address: "Sheikh Zayed Rd, Al Barsha 1, Dubai", lat: 25.1180, lng: 55.2003 },
  { category: "Shopping", name: "Gold Souk Dubai", address: "Deira, Dubai", lat: 25.2700, lng: 55.3030 },
  { category: "Shopping", name: "ION Orchard Singapore", address: "2 Orchard Turn, Singapore 238801", lat: 1.3040, lng: 103.8318 },
  { category: "Shopping", name: "Bugis Street Market", address: "3 New Bugis St, Singapore 188867", lat: 1.2995, lng: 103.8554 },
  { category: "Shopping", name: "VivoCity Singapore", address: "1 HarbourFront Walk, Singapore 098585", lat: 1.2641, lng: 103.8213 },
  { category: "Shopping", name: "Suria KLCC", address: "Kuala Lumpur City Centre, 50088 KL", lat: 3.1578, lng: 101.7119 },
  { category: "Shopping", name: "Pavilion Kuala Lumpur", address: "168 Jln Bukit Bintang, 55100 KL", lat: 3.1492, lng: 101.7134 },
  { category: "Shopping", name: "Central Market KL", address: "Jalan Hang Kasturi, 50000 Kuala Lumpur", lat: 3.1446, lng: 101.6948 },
  { category: "Shopping", name: "Oxford Street London", address: "Oxford St, London W1C 1JN", lat: 51.5152, lng: -0.1415 },
  { category: "Shopping", name: "Westfield Stratford City", address: "The Arcade, London E20 1EJ", lat: 51.5432, lng: -0.0067 },
  { category: "Shopping", name: "Harrods", address: "87-135 Brompton Rd, Knightsbridge, London SW1X 7XL", lat: 51.4994, lng: -0.1626 },
  { category: "Shopping", name: "Shinjuku Takashimaya", address: "5-24-2 Sendagaya, Shibuya City, Tokyo", lat: 35.6893, lng: 139.7022 },
  { category: "Shopping", name: "Galeries Lafayette Paris", address: "40 Bd Haussmann, 75009 Paris", lat: 48.8736, lng: 2.3320 },
];

const TRANSPORT_TYPES = [
  { type: "Train", icon: "🚂" }, { type: "Car", icon: "🚗" }, { type: "Bus", icon: "🚌" },
  { type: "Ferry", icon: "⛴️" }, { type: "Cruise", icon: "🚢" }, { type: "Taxi", icon: "🚕" },
];

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

const AIRPORTS: { iata: string; city: string }[] = [
  { iata: "ICN", city: "Incheon" },
  { iata: "GMP", city: "Gimpo" },
  { iata: "NRT", city: "Tokyo Narita" },
  { iata: "HND", city: "Tokyo Haneda" },
  { iata: "KIX", city: "Osaka" },
  { iata: "HKG", city: "Hong Kong" },
  { iata: "SIN", city: "Singapore" },
  { iata: "DXB", city: "Dubai" },
  { iata: "DOH", city: "Doha" },
  { iata: "AUH", city: "Abu Dhabi" },
  { iata: "IST", city: "Istanbul" },
  { iata: "KUL", city: "Kuala Lumpur" },
  { iata: "BKK", city: "Bangkok" },
  { iata: "CDG", city: "Paris" },
  { iata: "LHR", city: "London" },
  { iata: "JFK", city: "New York" },
  { iata: "LAX", city: "Los Angeles" },
  { iata: "SYD", city: "Sydney" },
  { iata: "CAI", city: "Cairo" },
  { iata: "AMM", city: "Amman" },
  { iata: "RUH", city: "Riyadh" },
  { iata: "JED", city: "Jeddah" },
  { iata: "MED", city: "Medina" },
  { iata: "KHI", city: "Karachi" },
  { iata: "DAC", city: "Dhaka" },
];

const HOTELS: { name: string; address: string; city: string }[] = [
  // Tokyo
  { name: "Park Hyatt Tokyo", address: "3-7-1-2 Nishi-Shinjuku, Tokyo", city: "Tokyo" },
  { name: "The Peninsula Tokyo", address: "1-8-1 Yurakucho, Chiyoda, Tokyo", city: "Tokyo" },
  { name: "Mandarin Oriental Tokyo", address: "2-1-1 Nihonbashi Muromachi, Chuo, Tokyo", city: "Tokyo" },
  { name: "Aman Tokyo", address: "The Otemachi Tower, 1-5-6 Otemachi, Chiyoda, Tokyo", city: "Tokyo" },
  { name: "Shinjuku Granbell Hotel", address: "2-14-5 Kabukicho, Shinjuku, Tokyo", city: "Tokyo" },
  { name: "Dormy Inn Tokyo Hatchobori", address: "2-3-7 Hatchobori, Chuo, Tokyo", city: "Tokyo" },
  { name: "APA Hotel Shinjuku", address: "2-20-1 Kabukicho, Shinjuku, Tokyo", city: "Tokyo" },
  { name: "Hilton Tokyo", address: "6-6-2 Nishi-Shinjuku, Shinjuku, Tokyo", city: "Tokyo" },
  // Dubai
  { name: "Burj Al Arab", address: "Jumeirah Beach Rd, Umm Suqeim, Dubai", city: "Dubai" },
  { name: "Atlantis The Palm", address: "Crescent Rd, The Palm, Dubai", city: "Dubai" },
  { name: "JW Marriott Marquis Dubai", address: "Sheikh Zayed Rd, Business Bay, Dubai", city: "Dubai" },
  { name: "Rove Downtown Dubai", address: "Al Asayel St, Downtown Dubai", city: "Dubai" },
  // Seoul
  { name: "Lotte Hotel Seoul", address: "30 Eulji-ro, Jung-gu, Seoul", city: "Seoul" },
  { name: "The Shilla Seoul", address: "249 Dongho-ro, Jung-gu, Seoul", city: "Seoul" },
  { name: "Signiel Seoul", address: "123 Olympic-ro 300, Songpa-gu, Seoul", city: "Seoul" },
  { name: "Ibis Budget Ambassador Seoul Myeongdong", address: "Myeongdong, Jung-gu, Seoul", city: "Seoul" },
  // Singapore
  { name: "Marina Bay Sands", address: "10 Bayfront Ave, Singapore 018956", city: "Singapore" },
  { name: "Raffles Hotel Singapore", address: "1 Beach Rd, Singapore 189673", city: "Singapore" },
  { name: "Hotel Boss Singapore", address: "500 Jln Sultan, Singapore 199020", city: "Singapore" },
  // Istanbul
  { name: "Four Seasons Istanbul at Sultanahmet", address: "Tevkifhane Sk. No:1, Fatih, Istanbul", city: "Istanbul" },
  { name: "Ciragan Palace Kempinski", address: "Ciragan Cd. No:32, Besiktas, Istanbul", city: "Istanbul" },
  { name: "Novotel Istanbul Bosphorus", address: "Ciragan Cd. No:4, Besiktas, Istanbul", city: "Istanbul" },
];

function airportLabel(iata: string): string {
  const a = AIRPORTS.find((x) => x.iata === iata);
  return a ? `${a.city} (${a.iata})` : iata;
}

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

function calcFlightDuration(dep: string, arr: string): string | null {
  const [dh, dm] = dep.split(":").map(Number);
  const [ah, am] = arr.split(":").map(Number);
  if ([dh, dm, ah, am].some(isNaN)) return null;
  const depMins = dh * 60 + dm;
  let arrMins = ah * 60 + am;
  if (arrMins <= depMins) arrMins += 1440; // next-day arrival
  const diff = arrMins - depMins;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getPeriodOptions(categoryLabel: string): string[] {
  if (categoryLabel === "Restaurant") return ["Breakfast", "Lunch", "Dinner"];
  if (categoryLabel === "Prayer Space") return ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  return [];
}

type TimelineItem = { id: string; time: string; icon: string; line1: string; line2?: string; line3?: string; itemType: "flight" | "stay" | "transport" | "dayplan"; sourceId: string; dayIndex?: number };
type TimelineGroup = { date: string; dateLabel: string; items: TimelineItem[] };

function buildTimeline(
  info: EssentialInfo,
  placesByDay: Record<number, PlaceItem[]>,
  dayDates: Date[]
): TimelineGroup[] {
  const byDate: Record<string, TimelineItem[]> = {};
  const add = (date: string, item: TimelineItem) => {
    if (!date) return;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(item);
  };

  // Deduplicate flights by flightNumber + departureDate to prevent triple entries
  const seenFlights = new Set<string>();
  for (const f of info.flights) {
    const dedupeKey = `${f.flightNumber}|${f.departureDate}`;
    if (seenFlights.has(dedupeKey)) continue;
    seenFlights.add(dedupeKey);
    add(f.departureDate, {
      id: f.id, time: f.departureTime, icon: "✈️",
      line1: [f.from, f.to].filter(Boolean).join(" → ") || "Flight",
      line2: f.airline && f.flightNumber
        ? `${f.airline} (${f.flightNumber})`
        : (f.airline || f.flightNumber || undefined),
      line3: f.arrivalTime ? `Arrival: ${formatTime12h(f.arrivalTime)}` : undefined,
      itemType: "flight",
      sourceId: f.id,
    });
  }

  for (const s of info.stays) {
    if (s.checkInDate) {
      add(s.checkInDate, {
        id: `${s.id}-in`, time: s.checkInTime, icon: "🏨",
        line1: s.propertyName || "Stay",
        line2: s.checkInTime ? `Check-in ${formatTime12h(s.checkInTime)}` : "Check-in",
        itemType: "stay",
        sourceId: s.id,
      });
    }
    if (s.checkOutDate) {
      add(s.checkOutDate, {
        id: `${s.id}-out`, time: s.checkOutTime, icon: "🏨",
        line1: s.propertyName || "Stay",
        line2: s.checkOutTime ? `Check-out ${formatTime12h(s.checkOutTime)}` : "Check-out",
        itemType: "stay",
        sourceId: s.id,
      });
    }
  }

  // Merge Day Plan items into the timeline grouped by their actual date
  for (const [dayIdxStr, places] of Object.entries(placesByDay)) {
    const dayIdx = Number(dayIdxStr);
    const date = dayDates[dayIdx];
    if (!date) continue;
    const dateStr = formatDate(date);
    for (const place of places) {
      if (place.type === "note") continue;
      add(dateStr, {
        id: `dayplan-${place.id}`,
        time: place.time ?? "",
        icon: place.icon,
        line1: place.name,
        line2: place.period || undefined,
        itemType: "dayplan",
        sourceId: place.id,
        dayIndex: dayIdx,
      });
    }
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
  propertyName: "", checkInDate: "", checkInTime: "15:00",
  checkOutDate: "", checkOutTime: "11:00", address: "",
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
    detail.essentialInfo ?? { flights: [], stays: [] }
  );
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [showStayForm, setShowStayForm] = useState(false);
  const [draftFlight, setDraftFlight] = useState(emptyFlight());
  const [draftStay, setDraftStay] = useState(emptyStay());
  const [airlineSearch, setAirlineSearch] = useState("");
  const [airlineDropdownOpen, setAirlineDropdownOpen] = useState(false);
  const [flightIataPrefix, setFlightIataPrefix] = useState("");
  const [flightNumberSuffix, setFlightNumberSuffix] = useState("");
  const [flightDbDropdownOpen, setFlightDbDropdownOpen] = useState(false);
  const [fromSearch, setFromSearch] = useState("");
  const [fromDropdownOpen, setFromDropdownOpen] = useState(false);
  const [toSearch, setToSearch] = useState("");
  const [toDropdownOpen, setToDropdownOpen] = useState(false);
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [editingStayId, setEditingStayId] = useState<string | null>(null);
  const [hotelSearch, setHotelSearch] = useState("");
  const [hotelDropdownOpen, setHotelDropdownOpen] = useState(false);
  const [stayPriceInput, setStayPriceInput] = useState("");
  const [stayPriceCurrency, setStayPriceCurrency] = useState("USD");
  const [nightsPopupOpen, setNightsPopupOpen] = useState(false);
  const [nightsInput, setNightsInput] = useState("1");
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [returnToSummaryAfterEdit, setReturnToSummaryAfterEdit] = useState(false);
  const [summaryConfirmDelete, setSummaryConfirmDelete] = useState<TimelineItem | null>(null);
  const [flightPriceInput, setFlightPriceInput] = useState("");
  const [flightPriceCurrency, setFlightPriceCurrency] = useState("USD");

  // Day Plan quick-add
  const [memoFocused, setMemoFocused] = useState(false);
  const [fabCategory, setFabCategory] = useState<{ label: string; icon: string } | null>(null);
  const [fabInput, setFabInput] = useState("");
  const [fabPeriod, setFabPeriod] = useState("");
  const [fabOthersNote, setFabOthersNote] = useState("");
  const [fabActivitySubType, setFabActivitySubType] = useState("Activity");
  const [fabCustomSubType, setFabCustomSubType] = useState("");
  const [fabLatLng, setFabLatLng] = useState<{ address: string; lat: number; lng: number } | null>(null);
  const [fabLocationDropdownOpen, setFabLocationDropdownOpen] = useState(false);
  const [fabValidationError, setFabValidationError] = useState("");
  const fabInputRef = useRef<HTMLInputElement>(null);

  // Budget
  const [showStats, setShowStats] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCategory, setBudgetCategory] = useState(BUDGET_PARENT_CATEGORIES[0]);
  const [budgetSubcategory, setBudgetSubcategory] = useState(BUDGET_CATEGORY_MAP[BUDGET_PARENT_CATEGORIES[0]][0]);
  const [budgetDay, setBudgetDay] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("USD");
  const [budgetIsPaid, setBudgetIsPaid] = useState(false);

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
  const paidTotal = budgetItems.filter((b) => b.isPaid).reduce((s, b) => s + b.amount, 0);
  const remainingTotal = totalBudget - paidTotal;
  const dayPlaces = placesByDay[currentDayIndex] ?? [];
  const noteText = notesByDay[currentDayIndex] ?? "";

  const allChecklist = [
    ...checklistSections.essential,
    ...checklistSections.packing,
    ...checklistSections.quick,
  ];
  const checklistDone = allChecklist.filter((i) => i.done).length;
  const timeline = useMemo(() => buildTimeline(essentialInfo, placesByDay, dayDates), [essentialInfo, placesByDay, dayDates]);

  const fabLocationResults = useMemo(() => {
    if (!fabCategory || !FAB_SEARCHABLE.includes(fabCategory.label) || !fabInput.trim()) return [];
    return MOCK_LOCATIONS
      .filter((loc) => loc.category === fabCategory.label && loc.name.toLowerCase().includes(fabInput.toLowerCase()))
      .slice(0, 5);
  }, [fabCategory, fabInput]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    saveTripDetail(tripId, { notesByDay, placesByDay, budgetItems, checklistSections, essentialInfo });
  }, [tripId, notesByDay, placesByDay, budgetItems, checklistSections, essentialInfo]);

  useEffect(() => {
    if (fabCategory) {
      setTimeout(() => fabInputRef.current?.focus(), 20);
    }
  }, [fabCategory]);

  useEffect(() => {
    if (!showFlightForm) {
      setAirlineSearch("");
      setAirlineDropdownOpen(false);
      setFlightIataPrefix("");
      setFlightNumberSuffix("");
      setFlightDbDropdownOpen(false);
      setFromSearch("");
      setFromDropdownOpen(false);
      setToSearch("");
      setToDropdownOpen(false);
      setEditingFlightId(null);
      setFlightPriceInput("");
      setFlightPriceCurrency("USD");
    }
  }, [showFlightForm]);

  useEffect(() => {
    if (!showStayForm) {
      setEditingStayId(null);
      setHotelSearch("");
      setHotelDropdownOpen(false);
      setStayPriceInput("");
      setStayPriceCurrency("USD");
    }
  }, [showStayForm]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const saveTripEdit = (newName: string, start: string, end: string) => {
    if (!tripMeta) return;
    const updated = { ...tripMeta, tripName: newName.trim() || tripMeta.title, title: newName.trim() || tripMeta.title, startDate: start, endDate: end };
    upsertTrip(updated);
    setTripMeta(updated);
    setShowEditPopup(false);
  };

  const handleSummaryEdit = (item: TimelineItem) => {
    if (item.itemType === "flight") {
      const f = essentialInfo.flights.find((fl) => fl.id === item.sourceId);
      if (!f) return;
      const { id: _id, ...fields } = f;
      setDraftFlight(fields);
      setEditingFlightId(f.id);
      setAirlineSearch(f.airline);
      const m = f.flightNumber.match(/^([A-Z]+)(\d+)$/);
      setFlightIataPrefix(m?.[1] ?? "");
      setFlightNumberSuffix(m?.[2] ?? f.flightNumber);
      setFromSearch(airportLabel(f.from));
      setToSearch(airportLabel(f.to));
      setFlightPriceInput(f.price?.toString() ?? "");
      setFlightPriceCurrency(f.priceCurrency ?? "USD");
      setShowFlightForm(true);
      setShowStayForm(false);
      setReturnToSummaryAfterEdit(true);
      setActiveTab("essential");
    } else if (item.itemType === "stay") {
      const stay = essentialInfo.stays.find((s) => s.id === item.sourceId);
      if (!stay) return;
      const { id, ...fields } = stay;
      setDraftStay(fields);
      setHotelSearch(stay.propertyName);
      setEditingStayId(id);
      setShowStayForm(true);
      setShowFlightForm(false);
      setReturnToSummaryAfterEdit(true);
      setActiveTab("essential");
    } else if (item.itemType === "dayplan" && item.dayIndex !== undefined) {
      const places = placesByDay[item.dayIndex] ?? [];
      const place = places.find((p) => p.id === item.sourceId);
      if (!place) return;
      setCurrentDayIndex(item.dayIndex);
      const cat = QUICK_ADD_CATEGORIES.find((c) => c.label === place.category);
      if (cat) setFabCategory(cat);
      setFabInput(place.name);
      setFabPeriod(place.period ?? "");
      setFabOthersNote(place.noteBody ?? "");
      const storedSubType = place.subType ?? "Activity";
      if (["Tour", "Activity", "Experience", "Class"].includes(storedSubType)) {
        setFabActivitySubType(storedSubType);
        setFabCustomSubType("");
      } else {
        setFabActivitySubType("Custom");
        setFabCustomSubType(storedSubType);
      }
      setFabLatLng(place.lat !== undefined ? { address: place.address ?? "", lat: place.lat, lng: place.lng ?? 0 } : null);
      setEditingPlaceId(place.id);
      setReturnToSummaryAfterEdit(true);
      setActiveTab("day_plan");
    }
  };

  const confirmSummaryDelete = () => {
    if (!summaryConfirmDelete) return;
    const item = summaryConfirmDelete;
    if (item.itemType === "flight") {
      deleteFlight(item.sourceId);
    } else if (item.itemType === "stay") {
      deleteStay(item.sourceId);
    } else if (item.itemType === "dayplan" && item.dayIndex !== undefined) {
      setPlacesByDay((prev) => ({
        ...prev,
        [item.dayIndex!]: (prev[item.dayIndex!] ?? []).filter((p) => p.id !== item.sourceId),
      }));
    }
    setSummaryConfirmDelete(null);
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
    if (!fabCategory) return;
    if (!fabInput.trim()) {
      setFabValidationError(getValidationMessage(fabCategory.label));
      return;
    }

    const resolvedSubType = fabActivitySubType === "Custom"
      ? (fabCustomSubType.trim() || (fabCategory.label === "Transport" ? "Train" : "Activity"))
      : fabActivitySubType;

    if (editingPlaceId !== null) {
      setPlacesByDay((prev) => ({
        ...prev,
        [currentDayIndex]: (prev[currentDayIndex] ?? []).map((p) => {
          if (p.id !== editingPlaceId) return p;
          return {
            ...p,
            name: fabInput.trim(),
            category: fabCategory.label,
            icon: fabCategory.icon,
            period: fabPeriod || undefined,
            noteBody: fabOthersNote.trim() || undefined,
            ...((fabCategory.label === "Things to Do" || fabCategory.label === "Transport") ? { subType: resolvedSubType } : {}),
            ...(fabLatLng ? { address: fabLatLng.address, lat: fabLatLng.lat, lng: fabLatLng.lng } : {}),
          };
        }),
      }));
      setEditingPlaceId(null);
      if (returnToSummaryAfterEdit) {
        setReturnToSummaryAfterEdit(false);
        setActiveTab("summary");
      }
    } else {
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
            ...((fabCategory.label === "Things to Do" || fabCategory.label === "Transport") ? { subType: resolvedSubType } : {}),
            ...(fabLatLng ? { address: fabLatLng.address, lat: fabLatLng.lat, lng: fabLatLng.lng } : {}),
          },
        ],
      }));
    }
    setFabInput("");
    setFabPeriod("");
    setFabOthersNote("");
    setFabActivitySubType("Activity");
    setFabCustomSubType("");
    setFabLatLng(null);
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
      [currentDayIndex]: (prev[currentDayIndex] ?? []).map((p) => {
        if (p.id !== id) return p;
        if (p.duration && time) return { ...p, time, endTime: addMinutesToTime(time, parseInt(p.duration)) };
        return { ...p, time };
      }),
    }));
  };

  const updatePlaceEndTime = (id: string, endTime: string) => {
    setPlacesByDay((prev) => ({
      ...prev,
      [currentDayIndex]: (prev[currentDayIndex] ?? []).map((p) => p.id === id ? { ...p, endTime } : p),
    }));
  };

  const updatePlaceDuration = (id: string, duration: string | null) => {
    setPlacesByDay((prev) => ({
      ...prev,
      [currentDayIndex]: (prev[currentDayIndex] ?? []).map((p) => {
        if (p.id !== id) return p;
        if (!duration) {
          const { duration: _d, ...rest } = p;
          return { ...rest, endTime: "" };
        }
        return { ...p, duration, endTime: p.time ? addMinutesToTime(p.time, parseInt(duration)) : "" };
      }),
    }));
  };

  const saveFlight = () => {
    const numPrice = parseFloat(flightPriceInput);
    const hasPrice = isFinite(numPrice) && numPrice > 0;
    const flightData = {
      ...draftFlight,
      ...(hasPrice ? { price: numPrice, priceCurrency: flightPriceCurrency } : { price: undefined, priceCurrency: undefined }),
    };

    if (editingFlightId) {
      setEssentialInfo((prev) => ({
        ...prev,
        flights: prev.flights.map((f) =>
          f.id === editingFlightId ? { id: f.id, ...flightData } : f
        ),
      }));
      const budgetEntryId = `f-${editingFlightId}`;
      if (hasPrice) {
        setBudgetItems((prev) => {
          const exists = prev.some((b) => b.id === budgetEntryId);
          if (exists) {
            return prev.map((b) =>
              b.id === budgetEntryId
                ? { ...b, amount: numPrice, currencyCode: flightPriceCurrency, date: draftFlight.departureDate || "" }
                : b
            );
          }
          return [
            ...prev,
            {
              id: budgetEntryId,
              category: "🚌 Transport",
              subcategory: "Flight",
              amount: numPrice,
              date: draftFlight.departureDate || "",
              currencyCode: flightPriceCurrency,
            },
          ];
        });
      } else {
        setBudgetItems((prev) => prev.filter((b) => b.id !== budgetEntryId));
      }
    } else {
      const flightId = `${Date.now()}`;
      setEssentialInfo((prev) => ({
        ...prev,
        flights: [...prev.flights, { id: flightId, ...flightData }],
      }));
      if (hasPrice) {
        setBudgetItems((prev) => [
          ...prev,
          {
            id: `f-${flightId}`,
            category: "🚌 Transport",
            subcategory: "Flight",
            amount: numPrice,
            date: draftFlight.departureDate || "",
            currencyCode: flightPriceCurrency,
          },
        ]);
      }
    }

    setDraftFlight(emptyFlight());
    setShowFlightForm(false);
    if (returnToSummaryAfterEdit) {
      setReturnToSummaryAfterEdit(false);
      setActiveTab("summary");
    }
  };
  const saveStay = () => {
    const numPrice = parseFloat(stayPriceInput);
    const hasPrice = isFinite(numPrice) && numPrice > 0;

    if (editingStayId) {
      setEssentialInfo((prev) => ({
        ...prev,
        stays: prev.stays.map((s) => s.id === editingStayId ? { id: s.id, ...draftStay } : s),
      }));
      const budgetEntryId = `s-${editingStayId}`;
      if (hasPrice) {
        setBudgetItems((prev) => {
          const exists = prev.some((b) => b.id === budgetEntryId);
          if (exists) {
            return prev.map((b) =>
              b.id === budgetEntryId
                ? { ...b, amount: numPrice, currencyCode: stayPriceCurrency, date: draftStay.checkInDate || "" }
                : b
            );
          }
          return [
            ...prev,
            {
              id: budgetEntryId,
              category: "🏨 Accommodation",
              subcategory: "Hotel",
              amount: numPrice,
              date: draftStay.checkInDate || "",
              currencyCode: stayPriceCurrency,
            },
          ];
        });
      } else {
        setBudgetItems((prev) => prev.filter((b) => b.id !== budgetEntryId));
      }
      setEditingStayId(null);
    } else {
      const stayId = `${Date.now()}`;
      setEssentialInfo((prev) => ({ ...prev, stays: [...prev.stays, { id: stayId, ...draftStay }] }));
      if (hasPrice) {
        setBudgetItems((prev) => [
          ...prev,
          {
            id: `s-${stayId}`,
            category: "🏨 Accommodation",
            subcategory: "Hotel",
            amount: numPrice,
            date: draftStay.checkInDate || "",
            currencyCode: stayPriceCurrency,
          },
        ]);
      }
    }
    setDraftStay(emptyStay());
    setShowStayForm(false);
    if (returnToSummaryAfterEdit) {
      setReturnToSummaryAfterEdit(false);
      setActiveTab("summary");
    }
  };
  const deleteFlight = (id: string) => {
    setEssentialInfo((prev) => ({ ...prev, flights: prev.flights.filter((f) => f.id !== id) }));
    setBudgetItems((prev) => prev.filter((b) => b.id !== `f-${id}`));
  };
  const deleteStay = (id: string) => {
    setEssentialInfo((prev) => ({ ...prev, stays: prev.stays.filter((s) => s.id !== id) }));
    setBudgetItems((prev) => prev.filter((b) => b.id !== `s-${id}`));
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
    if (!amount || !budgetDay) return;
    setBudgetItems((prev) => [
      ...prev,
      { id: `${Date.now()}`, category: budgetCategory, subcategory: budgetSubcategory, amount, date: budgetDay, currencyCode: budgetCurrency, isPaid: budgetIsPaid },
    ]);
    setBudgetAmount("");
    setBudgetDay("");
    setBudgetIsPaid(false);
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

  const filteredHotels = hotelSearch.trim()
    ? HOTELS.filter((h) =>
        h.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
        h.city.toLowerCase().includes(hotelSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  const filteredFromAirports = fromSearch.trim()
    ? AIRPORTS.filter(
        (a) =>
          a.city.toLowerCase().includes(fromSearch.toLowerCase()) ||
          a.iata.toLowerCase().includes(fromSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  const filteredToAirports = toSearch.trim()
    ? AIRPORTS.filter(
        (a) =>
          a.city.toLowerCase().includes(toSearch.toLowerCase()) ||
          a.iata.toLowerCase().includes(toSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  const fullFlightNumber = (flightIataPrefix + flightNumberSuffix).toUpperCase();
  const flightDbMatches: FlightRecord[] = fullFlightNumber.length >= 2
    ? FLIGHT_DB.filter((r) => r.flightNumber.toUpperCase().startsWith(fullFlightNumber)).slice(0, 5)
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

            {/* Timeline — flights + stays + transports + Day Plan items merged and sorted */}
            {timeline.length > 0 && (
              <div className="space-y-1">
                {timeline.map((group) => (
                  <div key={group.date}>
                    <p className="py-2 text-sm font-bold text-[--color-text]">{group.dateLabel}</p>
                    {group.items.map((item, idx) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-16 shrink-0 pt-0.5 text-right text-xs text-[--color-text-muted]">{formatTime12h(item.time)}</div>
                        <div className="flex flex-col items-center">
                          <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#2d6a4f]" />
                          {idx < group.items.length - 1 && (
                            <div className="min-h-8 w-0.5 flex-1 bg-[#2d6a4f] opacity-25" />
                          )}
                        </div>
                        <div className="flex flex-1 gap-2 pb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[--color-text]">{item.icon} {item.line1}</p>
                            {item.line2 && <p className="text-xs text-[--color-text-muted]">{item.line2}</p>}
                            {item.line3 && <p className="text-xs text-[--color-text-muted]">{item.line3}</p>}
                          </div>
                          <div className="flex shrink-0 items-start gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleSummaryEdit(item)}
                              className="text-xs text-[#2d6a4f] hover:underline"
                              aria-label="Edit"
                            >✏️</button>
                            <button
                              type="button"
                              onClick={() => setSummaryConfirmDelete(item)}
                              className="text-xs text-[#c4704a] hover:opacity-70"
                              aria-label="Delete"
                            >✕</button>
                          </div>
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
              {[["+ Flight", () => { setShowFlightForm(true); setShowStayForm(false); }],
                ["+ Stay", () => { setShowStayForm(true); setShowFlightForm(false); }],
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
                  {/* From airport autocomplete */}
                  <div className="relative">
                    <label className="mb-1 block text-xs text-[--color-text-muted]">From</label>
                    <input
                      value={fromSearch}
                      onChange={(e) => { setFromSearch(e.target.value); setFromDropdownOpen(true); setDraftFlight((p) => ({ ...p, from: e.target.value })); }}
                      onFocus={() => setFromDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setFromDropdownOpen(false), 150)}
                      placeholder="ICN"
                      autoComplete="off"
                      className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm"
                    />
                    {fromDropdownOpen && filteredFromAirports.length > 0 && (
                      <div className="absolute left-0 right-0 z-20 mt-1 max-h-44 overflow-y-auto rounded-lg border border-[--color-border] bg-[--color-background] shadow-lg">
                        {filteredFromAirports.map((a) => (
                          <button key={a.iata} type="button"
                            onMouseDown={() => { setFromSearch(`${a.city} (${a.iata})`); setDraftFlight((p) => ({ ...p, from: a.iata })); setFromDropdownOpen(false); }}
                            className="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[--color-surface]">
                            <span className="text-[--color-text]">{a.city}</span>
                            <span className="text-xs font-semibold text-[--color-text-muted]">{a.iata}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* To airport autocomplete */}
                  <div className="relative">
                    <label className="mb-1 block text-xs text-[--color-text-muted]">To</label>
                    <input
                      value={toSearch}
                      onChange={(e) => { setToSearch(e.target.value); setToDropdownOpen(true); setDraftFlight((p) => ({ ...p, to: e.target.value })); }}
                      onFocus={() => setToDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setToDropdownOpen(false), 150)}
                      placeholder="NRT"
                      autoComplete="off"
                      className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm"
                    />
                    {toDropdownOpen && filteredToAirports.length > 0 && (
                      <div className="absolute left-0 right-0 z-20 mt-1 max-h-44 overflow-y-auto rounded-lg border border-[--color-border] bg-[--color-background] shadow-lg">
                        {filteredToAirports.map((a) => (
                          <button key={a.iata} type="button"
                            onMouseDown={() => { setToSearch(`${a.city} (${a.iata})`); setDraftFlight((p) => ({ ...p, to: a.iata })); setToDropdownOpen(false); }}
                            className="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[--color-surface]">
                            <span className="text-[--color-text]">{a.city}</span>
                            <span className="text-xs font-semibold text-[--color-text-muted]">{a.iata}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Departure date</label>
                    <input type="date" value={draftFlight.departureDate}
                      onChange={(e) => { const v = e.target.value; setDraftFlight((p) => ({ ...p, departureDate: v, arrivalDate: v })); }}
                      className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Departure time</label>
                    <input type="time" value={draftFlight.departureTime}
                      onChange={(e) => setDraftFlight((p) => ({ ...p, departureTime: e.target.value }))}
                      className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Arrival date</label>
                    <input type="date" value={draftFlight.arrivalDate}
                      onChange={(e) => setDraftFlight((p) => ({ ...p, arrivalDate: e.target.value }))}
                      className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Arrival time</label>
                    <input type="time" value={draftFlight.arrivalTime}
                      onChange={(e) => setDraftFlight((p) => ({ ...p, arrivalTime: e.target.value }))}
                      className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  {draftFlight.departureTime && draftFlight.arrivalTime && (() => {
                    const dur = calcFlightDuration(draftFlight.departureTime, draftFlight.arrivalTime);
                    return dur ? (
                      <div className="col-span-2 rounded-lg bg-[--color-surface] px-3 py-1.5 text-xs text-[--color-text-muted]">
                        ⏱ Flight duration: <span className="font-semibold text-[--color-text]">{dur}</span>
                      </div>
                    ) : null;
                  })()}
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
                  {/* Flight number with IATA prefix + DB autocomplete */}
                  <div className="relative">
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
                          setFlightDbDropdownOpen(true);
                        }}
                        onFocus={() => setFlightDbDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setFlightDbDropdownOpen(false), 150)}
                        placeholder={flightIataPrefix ? "706" : "KE703"}
                        autoComplete="off"
                        className="w-full bg-transparent px-2 py-1.5 text-sm outline-none"
                      />
                    </div>
                    {flightDbDropdownOpen && flightDbMatches.length > 0 && (
                      <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-lg border border-[--color-border] bg-[--color-background] shadow-lg">
                        {flightDbMatches.map((record) => (
                          <button
                            key={record.flightNumber}
                            type="button"
                            onMouseDown={() => {
                              const m = record.flightNumber.match(/^([A-Z]+)(\d+)$/);
                              const iata = m?.[1] ?? "";
                              const num = m?.[2] ?? record.flightNumber;
                              setFlightIataPrefix(iata);
                              setFlightNumberSuffix(num);
                              setAirlineSearch(record.airline);
                              setFromSearch(airportLabel(record.from));
                              setToSearch(airportLabel(record.to));
                              setDraftFlight((p) => ({
                                ...p,
                                flightNumber: record.flightNumber,
                                airline: record.airline,
                                from: record.from,
                                to: record.to,
                                departureTime: record.departureTime,
                                arrivalTime: record.arrivalTime,
                              }));
                              setFlightDbDropdownOpen(false);
                            }}
                            className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-[--color-surface]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-[--color-text]">{record.flightNumber}</span>
                              <span className="text-xs text-[--color-text-muted]">{record.airline}</span>
                            </div>
                            <p className="text-xs text-[--color-text-muted]">
                              {record.from} → {record.to} · {formatTime12h(record.departureTime)} → {formatTime12h(record.arrivalTime)}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Price — auto-creates Budget entry on save */}
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Price (optional)</label>
                    <div className="flex overflow-hidden rounded border border-[--color-border]">
                      <select
                        value={flightPriceCurrency}
                        onChange={(e) => setFlightPriceCurrency(e.target.value)}
                        className="shrink-0 border-r border-[--color-border] bg-[--color-surface] px-2 py-1.5 text-sm text-[--color-text-muted] outline-none"
                      >
                        {FLIGHT_PRICE_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.code}</option>
                        ))}
                      </select>
                      <input
                        value={flightPriceInput}
                        onChange={(e) => setFlightPriceInput(e.target.value.replace(/[^0-9.]/g, ""))}
                        placeholder="0"
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
                  <button type="button" onClick={() => { setShowFlightForm(false); setDraftFlight(emptyFlight()); setReturnToSummaryAfterEdit(false); }} className="rounded-lg border border-[--color-border] px-4 py-2 text-sm text-[--color-text-muted]">Cancel</button>
                </div>
              </div>
            )}

            {essentialInfo.flights.length > 0 && (
              <div className="space-y-2">
                {essentialInfo.flights.map((f) => (
                  <div key={f.id} className="flex items-start justify-between rounded-lg border border-[--color-border] bg-[--color-background] p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[--color-text]">✈️ {[f.from, f.to].filter(Boolean).join(" → ") || "Flight"}</p>
                      {(f.flightNumber || f.airline) && (
                        <p className="text-xs text-[--color-text-muted]">
                          {f.airline && f.flightNumber
                            ? `${f.airline} (${f.flightNumber})`
                            : f.airline || f.flightNumber}
                        </p>
                      )}
                      {f.departureDate && <p className="text-xs text-[--color-text-muted]">{f.departureDate} {formatTime12h(f.departureTime)}{f.arrivalDate && f.arrivalDate !== f.departureDate ? ` → ${f.arrivalDate}` : ""} {formatTime12h(f.arrivalTime)}</p>}
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const { id: _id, ...fields } = f;
                          setDraftFlight(fields);
                          setEditingFlightId(f.id);
                          setAirlineSearch(f.airline);
                          const m = f.flightNumber.match(/^([A-Z]+)(\d+)$/);
                          setFlightIataPrefix(m?.[1] ?? "");
                          setFlightNumberSuffix(m?.[2] ?? f.flightNumber);
                          setFromSearch(airportLabel(f.from));
                          setToSearch(airportLabel(f.to));
                          setFlightPriceInput(f.price?.toString() ?? "");
                          setFlightPriceCurrency(f.priceCurrency ?? "USD");
                          setShowFlightForm(true);
                          setShowStayForm(false);
                        }}
                        className="text-xs text-[#2d6a4f] hover:underline"
                      >
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteFlight(f.id)} className="text-xs text-[#c4704a]">✕</button>
                    </div>
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
                    <div className="relative">
                      <input
                        value={hotelSearch}
                        onChange={(e) => { setHotelSearch(e.target.value); setHotelDropdownOpen(true); setDraftStay((p) => ({ ...p, propertyName: e.target.value })); }}
                        onFocus={() => setHotelDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setHotelDropdownOpen(false), 150)}
                        placeholder="Search hotel..."
                        autoComplete="off"
                        className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm"
                      />
                      {hotelDropdownOpen && filteredHotels.length > 0 && (
                        <div className="absolute left-0 right-0 z-10 mt-1 max-h-44 overflow-y-auto rounded-lg border border-[--color-border] bg-[--color-background] shadow-lg">
                          {filteredHotels.map((hotel) => (
                            <button
                              key={hotel.name}
                              type="button"
                              onMouseDown={() => {
                                setHotelSearch(hotel.name);
                                setDraftStay((p) => ({ ...p, propertyName: hotel.name, address: hotel.address }));
                                setHotelDropdownOpen(false);
                              }}
                              className="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[--color-surface]"
                            >
                              <span className="text-[--color-text]">{hotel.name}</span>
                              <span className="text-xs text-[--color-text-muted]">{hotel.city}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Check-in date</label>
                    <input
                      type="date"
                      value={draftStay.checkInDate}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraftStay((p) => ({ ...p, checkInDate: v }));
                        if (v && !draftStay.checkOutDate) {
                          setNightsInput("1");
                          setNightsPopupOpen(true);
                        }
                      }}
                      className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm"
                    />
                  </div>
                  {[["Check-in time", "checkInTime", "time"], ["Check-out date", "checkOutDate", "date"], ["Check-out time", "checkOutTime", "time"]].map(([lbl, key, type]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-[--color-text-muted]">{lbl}</label>
                      <input type={type} value={(draftStay as never)[key]} onChange={(e) => setDraftStay((p) => ({ ...p, [key]: e.target.value }))} className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Address</label>
                    <input value={draftStay.address} onChange={(e) => setDraftStay((p) => ({ ...p, address: e.target.value }))} placeholder="Address" className="w-full rounded border border-[--color-border] px-2 py-1.5 text-sm" />
                  </div>
                  {/* Price — auto-creates Budget entry on save */}
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-[--color-text-muted]">Price (optional)</label>
                    <div className="flex overflow-hidden rounded border border-[--color-border]">
                      <select
                        value={stayPriceCurrency}
                        onChange={(e) => setStayPriceCurrency(e.target.value)}
                        className="shrink-0 border-r border-[--color-border] bg-[--color-surface] px-2 py-1.5 text-sm text-[--color-text-muted] outline-none"
                      >
                        {FLIGHT_PRICE_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.code}</option>
                        ))}
                      </select>
                      <input
                        value={stayPriceInput}
                        onChange={(e) => setStayPriceInput(e.target.value.replace(/[^0-9.]/g, ""))}
                        placeholder="0"
                        className="w-full bg-transparent px-2 py-1.5 text-sm outline-none"
                      />
                    </div>
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
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[--color-text]">🏨 {s.propertyName || "Stay"}</p>
                      {s.checkInDate && <p className="text-xs text-[--color-text-muted]">Check-in {s.checkInDate} {formatTime12h(s.checkInTime)}</p>}
                      {s.checkOutDate && <p className="text-xs text-[--color-text-muted]">Check-out {s.checkOutDate} {formatTime12h(s.checkOutTime)}</p>}
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDraftStay({
                            propertyName: s.propertyName,
                            checkInDate: s.checkInDate,
                            checkInTime: s.checkInTime,
                            checkOutDate: s.checkOutDate,
                            checkOutTime: s.checkOutTime,
                            address: s.address,
                            attachmentName: s.attachmentName,
                          });
                          setHotelSearch(s.propertyName);
                          setEditingStayId(s.id);
                          setShowStayForm(true);
                          setShowFlightForm(false);
                        }}
                        className="text-xs text-[#2d6a4f] hover:underline"
                      >
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteStay(s.id)} className="text-xs text-[#c4704a]">✕</button>
                    </div>
                  </div>
                ))}
                {!showStayForm && (
                  <button type="button" onClick={() => setShowStayForm(true)} className="w-full rounded-lg border border-dashed border-[--color-border] py-2 text-xs text-[--color-text-muted] hover:border-[#2d6a4f] hover:text-[#2d6a4f] transition-colors">+ Add Another Stay</button>
                )}
              </div>
            )}

            {!showFlightForm && !showStayForm &&
              essentialInfo.flights.length === 0 && essentialInfo.stays.length === 0 && (
                <p className="text-center text-sm text-[--color-text-muted]">Add your flights and stays to build your timeline.</p>
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
                    setFabPeriod("");
                    setFabOthersNote("");
                    setFabActivitySubType(cat.label === "Transport" ? "Train" : "Activity");
                    setFabLatLng(null);
                    setFabLocationDropdownOpen(false);
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
            {fabCategory && (
              <div className="space-y-2.5 rounded-lg border border-[#2d6a4f] bg-[--color-background] p-3">
                {/* Name / location search */}
                <div className="flex items-center gap-2">
                  <span className="text-base shrink-0">{fabCategory.icon}</span>
                  <div className="relative flex-1">
                    <input
                      ref={fabInputRef}
                      value={fabInput}
                      onChange={(e) => {
                        setFabInput(e.target.value);
                        setFabLatLng(null);
                        if (FAB_SEARCHABLE.includes(fabCategory.label)) setFabLocationDropdownOpen(true);
                      }}
                      onFocus={() => { if (FAB_SEARCHABLE.includes(fabCategory.label)) setFabLocationDropdownOpen(true); }}
                      onBlur={() => setTimeout(() => setFabLocationDropdownOpen(false), 150)}
                      onKeyDown={(e) => e.key === "Enter" && addFabPlace()}
                      placeholder={FAB_SEARCHABLE.includes(fabCategory.label) ? `Search ${fabCategory.label.toLowerCase()}...` : `${fabCategory.label} name`}
                      className="w-full bg-transparent text-sm outline-none"
                    />
                    {fabLocationDropdownOpen && fabLocationResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[--color-border] bg-[--color-background] shadow-lg">
                        {fabLocationResults.map((loc) => (
                          <button
                            key={`${loc.name}-${loc.lat}`}
                            type="button"
                            onMouseDown={() => {
                              setFabInput(loc.name);
                              setFabLatLng({ address: loc.address, lat: loc.lat, lng: loc.lng });
                              setFabLocationDropdownOpen(false);
                            }}
                            className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-[--color-surface]"
                          >
                            <span className="text-sm text-[--color-text]">{loc.name}</span>
                            <span className="text-xs text-[--color-text-muted]">{loc.address}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Things to Do / Transport sub-type selector */}
                {(fabCategory.label === "Things to Do" || fabCategory.label === "Transport") && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {(fabCategory.label === "Transport"
                        ? [...TRANSPORT_TYPES.map((t) => t.type), "Custom"]
                        : ["Tour", "Activity", "Experience", "Class", "Custom"]
                      ).map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setFabActivitySubType(sub)}
                          className={["rounded-lg border px-3 py-1 text-xs font-medium transition-colors",
                            fabActivitySubType === sub ? "border-[#2d6a4f] bg-[#2d6a4f] text-white" : "border-[--color-border] text-[--color-text-muted] hover:border-[#2d6a4f]",
                          ].join(" ")}
                        >{sub}</button>
                      ))}
                    </div>
                    {fabActivitySubType === "Custom" && (
                      <input
                        value={fabCustomSubType}
                        onChange={(e) => setFabCustomSubType(e.target.value)}
                        placeholder="Enter sub-type..."
                        className="w-full rounded border border-[--color-border] bg-[--color-surface] px-2 py-1.5 text-xs outline-none focus:border-[#2d6a4f]"
                      />
                    )}
                  </div>
                )}

                {/* Period chips (time of day) */}
                {getPeriodOptions(fabCategory.label).length > 0 && (
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
                      >{opt}</button>
                    ))}
                  </div>
                )}

                {/* Others free-text */}
                <input
                  value={fabOthersNote}
                  onChange={(e) => setFabOthersNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="w-full rounded border border-[--color-border] bg-[--color-surface] px-2 py-1.5 text-xs outline-none focus:border-[#2d6a4f]"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={addFabPlace} className="rounded bg-[#2d6a4f] px-3 py-1 text-xs text-white">{editingPlaceId ? "Save" : "Add"}</button>
                  <button type="button" onClick={() => { setFabCategory(null); setFabInput(""); setFabPeriod(""); setFabOthersNote(""); setFabActivitySubType("Activity"); setFabCustomSubType(""); setFabLatLng(null); setEditingPlaceId(null); setReturnToSummaryAfterEdit(false); }} className="rounded border border-[--color-border] px-3 py-1 text-xs text-[--color-text-muted]">✕</button>
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
                        onDurationChange={updatePlaceDuration}
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
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-xs opacity-80">Total Planned</p>
                      <p className="text-base font-semibold">{getCurrencySymbol(budgetCurrency)}{totalBudget.toLocaleString()}</p>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-xs opacity-80">Already Paid</p>
                      <p className="text-base font-semibold">{getCurrencySymbol(budgetCurrency)}{paidTotal.toLocaleString()}</p>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-xs opacity-80">Remaining</p>
                      <p className="text-base font-semibold">{getCurrencySymbol(budgetCurrency)}{remainingTotal.toLocaleString()}</p>
                    </div>
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
                      <div className="flex items-center gap-2">
                        <span className={[
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          item.isPaid ? "bg-[#2d6a4f]/15 text-[#2d6a4f]" : "bg-[--color-border] text-[--color-text-muted]",
                        ].join(" ")}>
                          {item.isPaid ? "Paid" : "Planned"}
                        </span>
                        <p className="font-medium text-[--color-text]">{item.currencyCode ?? "USD"} {item.amount.toLocaleString()}</p>
                      </div>
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
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[--color-text-muted]">
                      <input
                        type="checkbox"
                        checked={budgetIsPaid}
                        onChange={(e) => setBudgetIsPaid(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[#2d6a4f]"
                      />
                      Already paid
                    </label>
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

      {/* ── Validation Error Modal ── */}
      {fabValidationError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFabValidationError("")}>
          <div className="w-72 rounded-xl bg-[--color-surface] p-6 shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-sm text-[--color-text]">{fabValidationError}</p>
            <button
              type="button"
              onClick={() => setFabValidationError("")}
              className="rounded-lg bg-[#2d6a4f] px-6 py-2 text-sm font-medium text-white"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {nightsPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setNightsPopupOpen(false)}>
          <div className="w-72 rounded-xl bg-[--color-surface] p-6 shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-sm font-semibold text-[--color-text]">How many nights?</p>
            <input
              type="number"
              min={1}
              max={365}
              value={nightsInput}
              onChange={(e) => setNightsInput(e.target.value)}
              className="mb-2 w-full rounded border border-[--color-border] px-3 py-2 text-center text-lg font-bold text-[--color-text] outline-none focus:border-[#2d6a4f]"
            />
            <p className="mb-5 text-xs text-[--color-text-muted]">Check-out date will be auto-filled</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNightsPopupOpen(false)}
                className="flex-1 rounded-lg border border-[--color-border] py-2 text-sm text-[--color-text-muted] hover:border-[#2d6a4f]"
              >Cancel</button>
              <button
                type="button"
                onClick={() => {
                  const n = parseInt(nightsInput, 10);
                  if (n >= 1 && n <= 365 && draftStay.checkInDate) {
                    const newCheckOut = addDaysToDate(draftStay.checkInDate, n);
                    setDraftStay((p) => ({ ...p, checkOutDate: newCheckOut }));
                  }
                  setNightsPopupOpen(false);
                }}
                className="flex-1 rounded-lg bg-[#2d6a4f] py-2 text-sm font-medium text-white"
              >Confirm</button>
            </div>
          </div>
        </div>
      )}

      {summaryConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSummaryConfirmDelete(null)}>
          <div className="w-72 rounded-xl bg-[--color-surface] p-6 shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 text-sm font-semibold text-[--color-text]">Delete this item?</p>
            <p className="mb-5 text-xs text-[--color-text-muted] truncate">{summaryConfirmDelete.icon} {summaryConfirmDelete.line1}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSummaryConfirmDelete(null)}
                className="flex-1 rounded-lg border border-[--color-border] py-2 text-sm text-[--color-text-muted] hover:border-[#2d6a4f]"
              >No</button>
              <button
                type="button"
                onClick={confirmSummaryDelete}
                className="flex-1 rounded-lg bg-[#c4704a] py-2 text-sm font-medium text-white"
              >Yes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function SortablePlaceCard({
  place, onRemove, onTimeChange, onEndTimeChange, onDurationChange,
}: {
  place: PlaceItem;
  onRemove: (id: string) => void;
  onTimeChange: (id: string, time: string) => void;
  onEndTimeChange: (id: string, endTime: string) => void;
  onDurationChange: (id: string, duration: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: place.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

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
      ) : place.duration ? (
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-xs text-[--color-text-muted]">{place.endTime ? formatTime12h(place.endTime) : "–"}</span>
          <button type="button" onClick={() => onDurationChange(place.id, null)} className="text-xs text-[--color-text-muted] hover:text-[#c4704a]">×</button>
        </div>
      ) : (
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v === "open") onEndTimeChange(place.id, "open");
            else if (v) onDurationChange(place.id, v);
          }}
          className="w-28 shrink-0 rounded border border-[--color-border] bg-[--color-surface] px-1 py-1 text-xs text-[--color-text-muted]"
        >
          <option value="">–</option>
          <option value="open">Open-ended</option>
          <option value="30">30 min</option>
          <option value="60">1 hour</option>
          <option value="90">1.5 hours</option>
          <option value="120">2 hours</option>
          <option value="150">2.5 hours</option>
          <option value="180">3 hours</option>
        </select>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-medium text-[--color-text]">{place.icon} {place.name}</p>
        {(place.subType || place.period || place.noteBody) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {place.subType && (
              <span className="rounded-full bg-[#2d6a4f]/20 px-2 py-0.5 text-[10px] font-semibold text-[#2d6a4f]">{place.subType}</span>
            )}
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
