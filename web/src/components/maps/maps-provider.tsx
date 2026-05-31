"use client";

import { APIProvider } from "@vis.gl/react-google-maps";

// Hoists the Google Maps API context above the route tree so map hooks (useMap,
// usePlacesService, etc.) work outside any <Map> — e.g. an address search bar.
export function MapsProvider({ children }: { children: React.ReactNode }) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string} language="en" region="KR">
      {children}
    </APIProvider>
  );
}
