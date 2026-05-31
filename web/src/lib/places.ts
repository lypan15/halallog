// Shared place data layer. Source-agnostic: screens consume these functions and a
// normalized Place shape, so the data source (mock now → Google Places / KTO later)
// can be swapped HERE without touching any screen.
export type Diet = "vegetarian" | "pescatarian" | "vegan";
export type HalalTier = "certified" | "self" | "options";
export type Constraint = "porkFree" | "alcoholFree";

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
