"use client";

import { Restaurant, SignatureDish } from "@/types";
import { Translations } from "@/lib/i18n/translations";

interface RestaurantDetailPanelProps {
  restaurant: Restaurant;
  onClose: () => void;
  t: Translations;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-lg ${s <= rating ? "text-orange-400" : "text-gray-200"}`}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function RestaurantDetailPanel({
  restaurant,
  onClose,
  t,
}: RestaurantDetailPanelProps) {
  const googleMapsUrl = restaurant.google_place_id
    ? `https://www.google.com/maps/place/?q=place_id:${restaurant.google_place_id}`
    : restaurant.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        restaurant.name + " " + (restaurant.address ?? "")
      )}`
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-4 md:p-5 border-b border-gray-100">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-800 text-base leading-tight">
              {restaurant.name}
            </h3>
            <span className="bg-orange-100 text-orange-600 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
              {restaurant.cuisine_type}
            </span>
          </div>
          {restaurant.address && (
            <p className="text-xs text-gray-400 mt-1 truncate">{restaurant.address}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors text-lg leading-none mt-0.5"
        >
          ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          {restaurant.is_visited ? (
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              {t.map.visited}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 text-xs font-medium px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-orange-400 rounded-full" />
              {t.map.wishlist}
            </span>
          )}
          {restaurant.want_to_revisit && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1 rounded-full">
              🔄 {t.map.revisit}
            </span>
          )}
        </div>

        {/* User rating */}
        {restaurant.user_rating && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              {t.map.yourRating}
            </p>
            <StarDisplay rating={restaurant.user_rating} />
          </div>
        )}

        {/* Visit date */}
        {restaurant.visited_at && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              {t.map.visitDate}
            </p>
            <p className="text-sm text-gray-600">
              📅{" "}
              {new Date(restaurant.visited_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        )}

        {/* Signature dishes */}
        {restaurant.signature_dishes && restaurant.signature_dishes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t.map.signatureDishes}
            </p>
            <div className="space-y-2">
              {(restaurant.signature_dishes as SignatureDish[]).slice(0, 3).map((dish, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="text-orange-400 flex-shrink-0 mt-0.5">🍽️</span>
                  <div>
                    <p className="font-medium text-gray-700">{dish.name}</p>
                    <p className="text-xs text-gray-400 line-clamp-2">{dish.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {restaurant.notes && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              {t.map.notes}
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">{restaurant.notes}</p>
          </div>
        )}

        {/* Google Maps link */}
        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
          >
            <span>📍</span>
            {t.map.openInMaps}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
