"use client";

import { Translations } from "@/lib/i18n/translations";

export type FilterType = "all" | "visited" | "wishlist";
export type ViewType = "map" | "list";

interface FilterBarProps {
  filter: FilterType;
  view: ViewType;
  onFilterChange: (f: FilterType) => void;
  onViewChange: (v: ViewType) => void;
  counts: { all: number; visited: number; wishlist: number };
  t: Translations;
}

export default function FilterBar({
  filter,
  view,
  onFilterChange,
  onViewChange,
  counts,
  t,
}: FilterBarProps) {
  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: t.map.filterAll, count: counts.all },
    { key: "visited", label: t.map.visited, count: counts.visited },
    { key: "wishlist", label: t.map.wishlist, count: counts.wishlist },
  ];

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-gray-100">
      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filter === f.key
                ? "bg-orange-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span
                className={`text-[10px] rounded-full px-1.5 py-0.5 leading-none ${
                  filter === f.key ? "bg-orange-400 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Map / List toggle */}
      <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium flex-shrink-0">
        <button
          onClick={() => onViewChange("map")}
          className={`px-3 py-1.5 rounded-md transition-all ${
            view === "map"
              ? "bg-white text-orange-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🗺️ {t.map.mapView}
        </button>
        <button
          onClick={() => onViewChange("list")}
          className={`px-3 py-1.5 rounded-md transition-all ${
            view === "list"
              ? "bg-white text-orange-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          ☰ {t.map.listView}
        </button>
      </div>
    </div>
  );
}
