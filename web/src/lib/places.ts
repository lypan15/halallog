// Shared place data layer. Source-agnostic: screens consume these functions and a
// normalized Place shape, so the data source (mock now → Google Places / KTO later)
// can be swapped HERE without touching any screen.
export type Diet = "vegetarian" | "pescatarian" | "vegan";
export type HalalTier = "certified" | "self" | "options";
export type Constraint = "porkFree" | "alcoholFree";

export type PlaceDetails = { openNow?: boolean; hours?: string[]; phone?: string };

export type Place = {
  id: string;
  name: string;
  category: "restaurant" | "mosque" | "prayerRoom";
  cuisine?: string;
  rating?: number;
  lat: number;
  lng: number;
  vegetarian?: boolean;
  pescatarian?: boolean;
  vegan?: boolean;
  address?: string;
  halalTier?: HalalTier;
  porkFree?: boolean;
  alcoholFree?: boolean;
  hasPrayerRoom?: boolean;
  certifier?: string;
  source?: string;
  lastVerified?: string;
  googlePlaceId?: string;
};

const MOCK_RESTAURANTS: Place[] = [
  { id: "1", name: "Eid Halal Korean Food", category: "restaurant", cuisine: "Korean", rating: 4.6, lat: 37.5340, lng: 126.9948, address: "37 Usadan-ro 10-gil, Yongsan-gu, Seoul", halalTier: "certified", porkFree: true, alcoholFree: true, hasPrayerRoom: true, vegetarian: false, pescatarian: true, vegan: false },
  { id: "2", name: "Murree Restaurant", category: "restaurant", cuisine: "Pakistani", rating: 4.4, lat: 37.5326, lng: 126.9905, address: "126-7 Itaewon-ro, Yongsan-gu, Seoul", halalTier: "self", porkFree: true, alcoholFree: true, vegetarian: true, pescatarian: true, vegan: false },
  { id: "3", name: "Plant Cafe Seoul", category: "restaurant", cuisine: "Vegan", rating: 4.5, lat: 37.5392, lng: 126.9870, address: "117-1 Bogwang-ro, Yongsan-gu, Seoul", porkFree: true, alcoholFree: true, vegetarian: true, pescatarian: true, vegan: true },
  { id: "4", name: "Seoul Seafood House", category: "restaurant", cuisine: "Seafood", rating: 4.2, lat: 37.5300, lng: 127.0000, address: "674 Noryangjin-ro, Dongjak-gu, Seoul", vegetarian: false, pescatarian: true, vegan: false },
  { id: "5", name: "Halal Guys Itaewon", category: "restaurant", cuisine: "Middle Eastern", rating: 4.3, lat: 37.5345, lng: 126.9945, address: "177 Itaewon-ro, Yongsan-gu, Seoul", halalTier: "options", porkFree: true, alcoholFree: true, hasPrayerRoom: true, vegetarian: false, pescatarian: false, vegan: false },
  { id: "6", name: "Sanchon Temple Veggie", category: "restaurant", cuisine: "Temple", rating: 4.7, lat: 37.5760, lng: 126.9840, address: "5 Insadong-gil, Jongno-gu, Seoul", porkFree: true, alcoholFree: true, vegetarian: true, pescatarian: false, vegan: true },
];

// Returns all nearby restaurants; diet filtering is done client-side by the caller.
// Async on purpose — real sources (Google Places / KTO) are network calls.
export async function searchNearbyRestaurants(): Promise<Place[]> {
  return MOCK_RESTAURANTS;
}

const MOCK_DETAILS: Record<string, PlaceDetails> = {
  "1": { openNow: true, hours: ["Mon 11:00–22:00", "Tue 11:00–22:00", "Wed 11:00–22:00", "Thu 11:00–22:00", "Fri 11:00–23:00", "Sat 11:00–23:00", "Sun Closed"], phone: "+82 2-790-1116" },
  "2": { openNow: true, hours: ["Mon 12:00–23:00", "Tue 12:00–23:00", "Wed 12:00–23:00", "Thu 12:00–23:00", "Fri 12:00–24:00", "Sat 12:00–24:00", "Sun 12:00–22:00"], phone: "+82 2-749-0501" },
  "3": { openNow: false, hours: ["Mon Closed", "Tue 10:00–21:00", "Wed 10:00–21:00", "Thu 10:00–21:00", "Fri 10:00–21:00", "Sat 10:00–22:00", "Sun 10:00–22:00"], phone: "+82 2-797-3022" },
  "4": { openNow: true, hours: ["Mon 17:00–24:00", "Tue 17:00–24:00", "Wed 17:00–24:00", "Thu 17:00–24:00", "Fri 17:00–02:00", "Sat 16:00–02:00", "Sun 16:00–23:00"], phone: "+82 2-815-2333" },
  "5": { openNow: true, hours: ["Mon 11:00–22:00", "Tue 11:00–22:00", "Wed 11:00–22:00", "Thu 11:00–22:00", "Fri 11:00–24:00", "Sat 11:00–24:00", "Sun 11:00–22:00"], phone: "+82 2-794-3463" },
  "6": { openNow: false, hours: ["Mon 11:30–21:00", "Tue 11:30–21:00", "Wed 11:30–21:00", "Thu 11:30–21:00", "Fri 11:30–21:00", "Sat 11:30–21:00", "Sun 11:30–21:00"], phone: "+82 2-735-0312" },
};

// The "expensive" fields (hours, phone, live status) — fetched only on tap;
// replace with a real Google Place Details call later.
export async function getPlaceDetails(id: string): Promise<PlaceDetails> {
  return MOCK_DETAILS[id] ?? { openNow: false, hours: ["Mon–Sun 11:00–21:00"], phone: "+82 2-000-0000" };
}
