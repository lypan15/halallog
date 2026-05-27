import { create } from 'zustand';

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string; // Google Places ID
}

export interface DayPlan {
  id: string;
  date: string; // ISO date string
  places: Place[];
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: DayPlan[];
  createdAt: string;
}

interface TripState {
  trips: Trip[];
  activeTrip: Trip | null;
  setActiveTrip: (trip: Trip | null) => void;
  addTrip: (trip: Trip) => void;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;
  addPlaceToDay: (tripId: string, dayId: string, place: Place) => void;
  removePlaceFromDay: (tripId: string, dayId: string, placeId: string) => void;
}

export const useTripStore = create<TripState>((set) => ({
  trips: [],
  activeTrip: null,

  setActiveTrip: (trip) => set({ activeTrip: trip }),

  addTrip: (trip) =>
    set((state) => ({ trips: [...state.trips, trip] })),

  updateTrip: (id, updates) =>
    set((state) => ({
      trips: state.trips.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      activeTrip:
        state.activeTrip?.id === id
          ? { ...state.activeTrip, ...updates }
          : state.activeTrip,
    })),

  deleteTrip: (id) =>
    set((state) => ({
      trips: state.trips.filter((t) => t.id !== id),
      activeTrip: state.activeTrip?.id === id ? null : state.activeTrip,
    })),

  addPlaceToDay: (tripId, dayId, place) =>
    set((state) => ({
      trips: state.trips.map((t) =>
        t.id !== tripId
          ? t
          : {
              ...t,
              days: t.days.map((d) =>
                d.id !== dayId ? d : { ...d, places: [...d.places, place] }
              ),
            }
      ),
    })),

  removePlaceFromDay: (tripId, dayId, placeId) =>
    set((state) => ({
      trips: state.trips.map((t) =>
        t.id !== tripId
          ? t
          : {
              ...t,
              days: t.days.map((d) =>
                d.id !== dayId
                  ? d
                  : { ...d, places: d.places.filter((p) => p.id !== placeId) }
              ),
            }
      ),
    })),
}));
