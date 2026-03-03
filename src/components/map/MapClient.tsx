"use client";

import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { Restaurant } from "@/types";
import { getPinColor } from "./RestaurantCard";

interface MapClientProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onMarkerClick: (id: string) => void;
  apiKey: string;
}

export default function MapClient({
  restaurants,
  selectedId,
  onMarkerClick,
  apiKey,
}: MapClientProps) {
  // Compute map center from restaurants with coordinates
  const withCoords = restaurants.filter((r) => r.lat != null && r.lng != null);

  const center =
    withCoords.length > 0
      ? {
          lat:
            withCoords.reduce((sum, r) => sum + (r.lat ?? 0), 0) /
            withCoords.length,
          lng:
            withCoords.reduce((sum, r) => sum + (r.lng ?? 0), 0) /
            withCoords.length,
        }
      : { lat: 35, lng: 105 }; // Default: roughly centered on East Asia

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={center}
        defaultZoom={withCoords.length > 1 ? 4 : 12}
        gestureHandling="greedy"
        disableDefaultUI={false}
        style={{ width: "100%", height: "100%" }}
        mapId="foodie-buddy-map"
      >
        {withCoords.map((restaurant) => {
          const { bg, border } = getPinColor(restaurant);
          const isSelected = restaurant.id === selectedId;

          return (
            <AdvancedMarker
              key={restaurant.id}
              position={{ lat: restaurant.lat!, lng: restaurant.lng! }}
              onClick={() => onMarkerClick(restaurant.id)}
              zIndex={isSelected ? 10 : 1}
            >
              <Pin
                background={bg}
                borderColor={border}
                glyphColor={border}
                scale={isSelected ? 1.4 : 1}
              />
            </AdvancedMarker>
          );
        })}
      </Map>
    </APIProvider>
  );
}
