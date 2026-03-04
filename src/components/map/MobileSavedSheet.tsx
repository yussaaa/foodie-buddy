"use client";

import { Restaurant } from "@/types";
import { FilterType } from "@/components/map/FilterBar";
import RestaurantCard from "@/components/map/RestaurantCard";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface MobileSavedSheetProps {
  isOpen: boolean;
  restaurants: Restaurant[];
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  onSelectRestaurant: (id: string) => void;
  onClose: () => void;
  allCount: number;
  visitedCount: number;
  wishlistCount: number;
}

export default function MobileSavedSheet({
  isOpen,
  restaurants,
  filter,
  onFilterChange,
  onSelectRestaurant,
  onClose,
  allCount,
  visitedCount,
  wishlistCount,
}: MobileSavedSheetProps) {
  const { t, language } = useLanguage();

  const filterOptions: { key: FilterType; label: string; count: number }[] = [
    { key: "all",      label: language === "zh" ? "全部"   : "All",      count: allCount },
    { key: "visited",  label: language === "zh" ? "已打卡" : "Visited",  count: visitedCount },
    { key: "wishlist", label: language === "zh" ? "想去"   : "Wishlist", count: wishlistCount },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl
          transition-transform duration-300 ease-out
          ${isOpen ? "translate-y-0" : "translate-y-full"}`}
        style={{ maxHeight: "85vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-1 pb-3 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-base">
            {language === "zh" ? "我的收藏" : "My Saved"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-500 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {filterOptions.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === key
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {label} {count}
            </button>
          ))}
        </div>

        <div className="h-px bg-gray-100 mx-4" />

        {/* Restaurant list */}
        <div
          className="overflow-y-auto p-4 space-y-3"
          style={{ maxHeight: "calc(85vh - 160px)" }}
        >
          {restaurants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-4xl mb-3">🗺️</div>
              <p className="text-gray-400 text-sm">{t.map.noRestaurants}</p>
            </div>
          ) : (
            restaurants.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                isSelected={false}
                onClick={() => onSelectRestaurant(r.id)}
                t={t}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
