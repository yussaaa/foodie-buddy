"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { Restaurant } from "@/types";
import { getPinColor } from "./RestaurantCard";

interface MapClientProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onMarkerClick: (id: string) => void;
  apiKey: string;
}

// Zoom 13 ≈ 10 km radius on screen — used when centering on user's location.
const USER_LOCATION_ZOOM = 13;

export default function MapClient({
  restaurants,
  selectedId,
  onMarkerClick,
  apiKey,
}: MapClientProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        // Permission denied or unavailable — fall back to restaurant centroid
      },
      { timeout: 5000 }
    );
  }, []);

  // Compute centroid of saved restaurants with coordinates (fallback center)
  const withCoords = restaurants.filter((r) => r.lat != null && r.lng != null);
  const restaurantCentroid =
    withCoords.length > 0
      ? {
          lat: withCoords.reduce((sum, r) => sum + (r.lat ?? 0), 0) / withCoords.length,
          lng: withCoords.reduce((sum, r) => sum + (r.lng ?? 0), 0) / withCoords.length,
        }
      : null;

  // Priority: user's GPS location → restaurant centroid → East Asia fallback
  const center = userLocation ?? restaurantCentroid ?? { lat: 35, lng: 105 };
  const zoom = userLocation
    ? USER_LOCATION_ZOOM                             // ~10 km radius around user
    : withCoords.length > 1
    ? 11                                             // zoomed-in view of saved restaurants
    : 12;                                            // single restaurant or empty

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
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
