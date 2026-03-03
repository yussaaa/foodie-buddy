"use client";

import { Restaurant } from "@/types";
import { Translations } from "@/lib/i18n/translations";

interface RestaurantCardProps {
  restaurant: Restaurant;
  isSelected: boolean;
  onClick: () => void;
  t: Translations;
}

/** Returns pin color hex for a restaurant based on visit status */
export function getPinColor(r: Restaurant): {
  bg: string;
  border: string;
  dot: string;
} {
  if (r.is_visited && r.want_to_revisit) {
    return { bg: "#EFF6FF", border: "#3B82F6", dot: "#3B82F6" }; // blue
  }
  if (r.is_visited) {
    return { bg: "#F0FDF4", border: "#22C55E", dot: "#22C55E" }; // green
  }
  return { bg: "#FFF7ED", border: "#F97316", dot: "#F97316" }; // orange (wishlist)
}

export default function RestaurantCard({
  restaurant,
  isSelected,
  onClick,
  t,
}: RestaurantCardProps) {
  const { dot } = getPinColor(restaurant);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border transition-all ${
        isSelected
          ? "border-orange-300 bg-orange-50 shadow-sm"
          : "border-gray-100 bg-white hover:border-orange-200 hover:bg-orange-50/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Color dot */}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: dot }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-800 text-sm truncate">{restaurant.name}</h4>
            {restaurant.cuisine_type && (
              <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                {restaurant.cuisine_type}
              </span>
            )}
          </div>

          {restaurant.address && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{restaurant.address}</p>
          )}

          <div className="flex items-center gap-3 mt-2">
            {/* Status */}
            <span
              className="text-xs font-medium"
              style={{ color: dot }}
            >
              {restaurant.is_visited
                ? restaurant.want_to_revisit
                  ? `${t.map.visited} · ${t.map.revisit}`
                  : t.map.visited
                : t.map.wishlist}
            </span>

            {/* User rating */}
            {restaurant.user_rating && (
              <span className="flex items-center gap-0.5 text-xs text-gray-500">
                <span className="text-orange-400">★</span>
                {restaurant.user_rating}
              </span>
            )}

            {/* Visit date */}
            {restaurant.visited_at && (
              <span className="text-xs text-gray-400">
                {new Date(restaurant.visited_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}

            {/* No location indicator */}
            {!restaurant.lat && !restaurant.lng && (
              <span className="text-xs text-gray-300">📍 {t.map.noLocation}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
