"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Restaurant } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import FilterBar, { FilterType, ViewType } from "@/components/map/FilterBar";
import RestaurantDetailPanel from "@/components/map/RestaurantDetailPanel";
import RestaurantCard from "@/components/map/RestaurantCard";

// Dynamically import MapClient (uses browser APIs, no SSR)
const MapClient = dynamic(() => import("@/components/map/MapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-bounce">🗺️</div>
        <p className="text-gray-400 text-sm">Loading map...</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const { t } = useLanguage();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [view, setView] = useState<ViewType>("map");

  // Fetch saved restaurants
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch("/api/restaurants");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setRestaurants(data);
      } catch {
        setError(t.common.error);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, [t.common.error]);

  // Derived: filtered restaurants
  const filtered = useMemo(() => {
    switch (filter) {
      case "visited":
        return restaurants.filter((r) => r.is_visited);
      case "wishlist":
        return restaurants.filter((r) => !r.is_visited);
      default:
        return restaurants;
    }
  }, [restaurants, filter]);

  // Counts for filter bar
  const counts = useMemo(
    () => ({
      all: restaurants.length,
      visited: restaurants.filter((r) => r.is_visited).length,
      wishlist: restaurants.filter((r) => !r.is_visited).length,
    }),
    [restaurants]
  );

  const selectedRestaurant = selectedId
    ? restaurants.find((r) => r.id === selectedId) ?? null
    : null;

  // ── No API key warning ──────────────────────────────────────────────────
  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🗺️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t.map.noApiKey}</h2>
          <p className="text-sm text-gray-500">
            Add{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            </code>{" "}
            to your .env.local file.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🗺️</div>
          <p className="text-gray-400 text-sm">{t.map.loading}</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (restaurants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-xs">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t.map.noRestaurants}</h2>
          <p className="text-sm text-gray-500 mb-6">{t.map.noRestaurantsHint}</p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-2xl text-sm transition-colors"
          >
            <span>🔍</span>
            {t.nav.explore}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page title */}
      <div className="px-4 md:px-6 pt-4 md:pt-5 pb-0">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
          🗺️ {t.map.title}
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {filtered.filter((r) => r.lat && r.lng).length} {t.map.restaurantsOnMap}
        </p>
      </div>

      {/* Filter bar */}
      <FilterBar
        filter={filter}
        view={view}
        onFilterChange={(f) => {
          setFilter(f);
          setSelectedId(null);
        }}
        onViewChange={setView}
        counts={counts}
        t={t}
      />

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-100">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
          {t.map.wishlist}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
          {t.map.visited}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
          {t.map.revisit}
        </span>
      </div>

      {/* ── Content area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Map View ──────────────────────────────────────────────────── */}
        {view === "map" && (
          <div className="flex flex-1 overflow-hidden">
            {/* Map */}
            <div className="flex-1 relative">
              <MapClient
                restaurants={filtered}
                selectedId={selectedId}
                onMarkerClick={(id) => setSelectedId(selectedId === id ? null : id)}
                apiKey={apiKey}
              />

              {/* Mobile: bottom sheet when a pin is selected */}
              {selectedRestaurant && (
                <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 max-h-[55vh] overflow-y-auto z-10">
                  <div className="flex justify-center pt-2 pb-1">
                    <div className="w-10 h-1 bg-gray-200 rounded-full" />
                  </div>
                  <RestaurantDetailPanel
                    restaurant={selectedRestaurant}
                    onClose={() => setSelectedId(null)}
                    t={t}
                  />
                </div>
              )}
            </div>

            {/* Desktop: right side panel */}
            {selectedRestaurant && (
              <div className="hidden md:flex w-80 flex-col border-l border-gray-100 bg-white overflow-hidden">
                <RestaurantDetailPanel
                  restaurant={selectedRestaurant}
                  onClose={() => setSelectedId(null)}
                  t={t}
                />
              </div>
            )}
          </div>
        )}

        {/* ── List View ─────────────────────────────────────────────────── */}
        {view === "list" && (
          <div className="flex flex-1 overflow-hidden">
            {/* Restaurant list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center h-48">
                  <p className="text-gray-400 text-sm">{t.map.noRestaurants}</p>
                </div>
              ) : (
                filtered.map((r) => (
                  <RestaurantCard
                    key={r.id}
                    restaurant={r}
                    isSelected={selectedId === r.id}
                    onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
                    t={t}
                  />
                ))
              )}
            </div>

            {/* Desktop: detail panel */}
            {selectedRestaurant && (
              <div className="hidden md:flex w-80 flex-col border-l border-gray-100 bg-white overflow-hidden">
                <RestaurantDetailPanel
                  restaurant={selectedRestaurant}
                  onClose={() => setSelectedId(null)}
                  t={t}
                />
              </div>
            )}

            {/* Mobile: bottom sheet */}
            {selectedRestaurant && (
              <div className="md:hidden fixed bottom-16 left-0 right-0 bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 max-h-[55vh] overflow-y-auto z-10">
                <div className="flex justify-center pt-2 pb-1">
                  <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>
                <RestaurantDetailPanel
                  restaurant={selectedRestaurant}
                  onClose={() => setSelectedId(null)}
                  t={t}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
