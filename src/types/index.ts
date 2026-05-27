// ─── Halal Status ────────────────────────────────────────────────
export type HalalStatus = 'halal' | 'haram' | 'doubtful' | 'unknown';

// ─── Map / Places ─────────────────────────────────────────────────
export type PlaceCategory = 'restaurant' | 'masjid' | 'prayer_room' | 'hotel' | 'attraction';

export interface MapPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  halalStatus: HalalStatus;
  address: string;
  lat: number;
  lng: number;
  placeId: string; // Google Places ID
  phone?: string;
  openNow?: boolean;
  rating?: number;
  photoUrl?: string;
}

// ─── Prayer ───────────────────────────────────────────────────────
export interface PrayerTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: string; // ISO date
  timezone: string;
}

// ─── Tour ─────────────────────────────────────────────────────────
export interface Tour {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  duration: string;
  imageUrl: string;
  provider: 'viator' | 'bemyguest';
  bookingUrl: string;
  location: string;
}

// ─── Scanner ──────────────────────────────────────────────────────
export interface ScanResult {
  status: HalalStatus;
  confidence: number; // 0–1
  reasoning: string;
  ingredients: string[];
  scannedAt: string; // ISO datetime
}
