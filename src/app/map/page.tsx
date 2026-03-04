"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Restaurant } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import FilterBar, { FilterType, ViewType } from "@/components/map/FilterBar";
import RestaurantDetailPanel from "@/components/map/RestaurantDetailPanel";
import RestaurantCard from "@/components/map/RestaurantCard";
import MobileBottomBar from "@/components/map/MobileBottomBar";
import MobileSavedSheet from "@/components/map/MobileSavedSheet";
import MobileSettingsSheet from "@/components/map/MobileSettingsSheet";

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
  const { t, language } = useLanguage();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [view, setView] = useState<ViewType>("map");
  const [savedOpen, setSavedOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      case "visited":  return restaurants.filter((r) => r.is_visited);
      case "wishlist": return restaurants.filter((r) => !r.is_visited);
      default:         return restaurants;
    }
  }, [restaurants, filter]);

  // Counts for filter bar
  const counts = useMemo(
    () => ({
      all:      restaurants.length,
      visited:  restaurants.filter((r) => r.is_visited).length,
      wishlist: restaurants.filter((r) => !r.is_visited).length,
    }),
    [restaurants]
  );

  const selectedRestaurant = selectedId
    ? restaurants.find((r) => r.id === selectedId) ?? null
    : null;

  // Mobile filter pill options
  const mobileFilters: { key: FilterType; label: string }[] = [
    { key: "all",      label: language === "zh" ? `全部 ${counts.all}`      : `All ${counts.all}` },
    { key: "visited",  label: language === "zh" ? `已打卡 ${counts.visited}` : `Visited ${counts.visited}` },
    { key: "wishlist", label: language === "zh" ? `想去 ${counts.wishlist}`  : `Wishlist ${counts.wishlist}` },
  ];

  // ── MOBILE: full-screen map (Google Maps-style) ───────────────────────────
  const mobilePage = (
    <div className="md:hidden fixed inset-0 z-30 bg-gray-50">

      {!apiKey ? (
        /* No API key */
        <div className="flex items-center justify-center h-full p-8 pb-20">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">🗺️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">{t.map.noApiKey}</h2>
            <p className="text-xs text-gray-400 mt-2">
              Add <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to .env.local
            </p>
          </div>
        </div>

      ) : loading ? (
        /* Loading */
        <div className="flex items-center justify-center h-full pb-16">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-bounce">🗺️</div>
            <p className="text-gray-400 text-sm">{t.map.loading}</p>
          </div>
        </div>

      ) : error ? (
        /* Error */
        <div className="flex items-center justify-center h-full p-8 pb-20">
          <p className="text-red-500 text-sm">{error}</p>
        </div>

      ) : restaurants.length === 0 ? (
        /* Empty */
        <div className="flex items-center justify-center h-full p-8 pb-20">
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

      ) : (
        /* Main: full-screen map */
        <>
          {/* Map fills entire viewport */}
          <div className="absolute inset-0">
            <MapClient
              restaurants={filtered}
              selectedId={selectedId}
              onMarkerClick={(id) => setSelectedId(selectedId === id ? null : id)}
              apiKey={apiKey}
            />
          </div>

          {/* Floating filter pills — above bottom bar, hidden when detail sheet is open */}
          {!selectedRestaurant && (
            <div
              className="absolute bottom-[72px] left-3 right-3 z-10 flex gap-2 overflow-x-auto"
              style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
            >
              {mobileFilters.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setFilter(key); setSelectedId(null); }}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold shadow-sm border transition-all ${
                    filter === key
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-gray-700 border-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Detail sheet — slides up when a marker is tapped */}
          {selectedRestaurant && (
            <div className="absolute bottom-16 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 max-h-[55vh] overflow-y-auto">
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
        </>
      )}

    </div>
  );

  // These are kept OUTSIDE the z-30 stacking context so their z-index
  // is relative to the root and correctly overlays everything.
  const mobileOverlays = (
    <div className="md:hidden">
      <MobileBottomBar
        savedCount={restaurants.length}
        onSavedClick={() => setSavedOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)}
      />
      <MobileSavedSheet
        isOpen={savedOpen}
        restaurants={filtered}
        filter={filter}
        onFilterChange={(f) => { setFilter(f); setSelectedId(null); }}
        onSelectRestaurant={(id) => { setSelectedId(id); setSavedOpen(false); }}
        onClose={() => setSavedOpen(false)}
        allCount={counts.all}
        visitedCount={counts.visited}
        wishlistCount={counts.wishlist}
      />
      <MobileSettingsSheet
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );

  // ── DESKTOP: existing layout (unchanged) ─────────────────────────────────
  const desktopPage = (
    <div className="hidden md:flex flex-col h-full">

      {/* No API key */}
      {!apiKey ? (
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

      ) : loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-bounce">🗺️</div>
            <p className="text-gray-400 text-sm">{t.map.loading}</p>
          </div>
        </div>

      ) : error ? (
        <div className="flex items-center justify-center h-full p-8">
          <p className="text-red-500 text-sm">{error}</p>
        </div>

      ) : restaurants.length === 0 ? (
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

      ) : (
        <>
          {/* Page title */}
          <div className="px-6 pt-5 pb-0">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
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
            onFilterChange={(f) => { setFilter(f); setSelectedId(null); }}
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

          {/* Content area */}
          <div className="flex-1 flex overflow-hidden">

            {/* Map view */}
            {view === "map" && (
              <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 relative">
                  <MapClient
                    restaurants={filtered}
                    selectedId={selectedId}
                    onMarkerClick={(id) => setSelectedId(selectedId === id ? null : id)}
                    apiKey={apiKey}
                  />
                </div>
                {selectedRestaurant && (
                  <div className="w-80 flex flex-col border-l border-gray-100 bg-white overflow-hidden">
                    <RestaurantDetailPanel
                      restaurant={selectedRestaurant}
                      onClose={() => setSelectedId(null)}
                      t={t}
                    />
                  </div>
                )}
              </div>
            )}

            {/* List view */}
            {view === "list" && (
              <div className="flex flex-1 overflow-hidden">
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
                {selectedRestaurant && (
                  <div className="w-80 flex flex-col border-l border-gray-100 bg-white overflow-hidden">
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
        </>
      )}
    </div>
  );

  return (
    <>
      {mobilePage}
      {mobileOverlays}
      {desktopPage}
    </>
  );
}
