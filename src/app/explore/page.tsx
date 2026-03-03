"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ExploreResponse } from "@/app/api/explore/route";

// ─── Recent Searches ───────────────────────────────────────────────────────

interface RecentSearch {
  input: string;
  name: string;
  cuisine_type: string;      // fallback — language at time of first search
  cuisine_type_zh?: string;  // Chinese version (populated when searched in zh)
  cuisine_type_en?: string;  // English version (populated when searched in en)
  timestamp: number;
}

const STORAGE_KEY = "foodie-buddy-recent-searches";
const MAX_RECENT = 8;

// ─── Dish Photo Cache ────────────────────────────────────────────────────────
// Persists fetched/generated dish photos in localStorage to avoid re-fetching.
// TTL: 7 days for web sources; 55 min for DALL·E (OpenAI URLs expire after 1h).

const DISH_PHOTO_TTL_MS       = 7 * 24 * 60 * 60 * 1000; // 7 days
const DISH_PHOTO_TTL_OPENAI_MS = 55 * 60 * 1000;          // 55 min

interface DishPhotoCacheEntry {
  url: string;
  source: string;
  timestamp: number;
}

function dishPhotoCacheKey(dishName: string, provider: string | null): string {
  return `foodie-dish-photo::${dishName.toLowerCase().trim()}::${provider ?? "auto"}`;
}

function getDishPhotoFromCache(
  dishName: string,
  provider: string | null
): { url: string; source: string } | null {
  try {
    const raw = localStorage.getItem(dishPhotoCacheKey(dishName, provider));
    if (!raw) return null;
    const entry: DishPhotoCacheEntry = JSON.parse(raw);
    const ttl = entry.source === "openai" ? DISH_PHOTO_TTL_OPENAI_MS : DISH_PHOTO_TTL_MS;
    if (Date.now() - entry.timestamp > ttl) {
      localStorage.removeItem(dishPhotoCacheKey(dishName, provider));
      return null;
    }
    return { url: entry.url, source: entry.source };
  } catch {
    return null;
  }
}

function setDishPhotoCache(
  dishName: string,
  provider: string | null,
  url: string,
  source: string
) {
  try {
    const entry: DishPhotoCacheEntry = { url, source, timestamp: Date.now() };
    localStorage.setItem(dishPhotoCacheKey(dishName, provider), JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

function clearDishPhotoCache(dishName: string, provider: string | null) {
  try {
    localStorage.removeItem(dishPhotoCacheKey(dishName, provider));
  } catch {
    // ignore
  }
}

// ─── Result Cache ───────────────────────────────────────────────────────────

const RESULT_CACHE_KEY = "foodie-buddy-result-cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedResult {
  result: ExploreResponse;
  timestamp: number;
}

function getResultCache(): Record<string, CachedResult> {
  try {
    return JSON.parse(localStorage.getItem(RESULT_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function getCachedResult(input: string, lang: string): ExploreResponse | null {
  const cache = getResultCache();
  const key = `${input.toLowerCase().trim()}::${lang}`;
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
  return entry.result;
}

function setCachedResult(input: string, lang: string, result: ExploreResponse) {
  const cache = getResultCache();
  const key = `${input.toLowerCase().trim()}::${lang}`;
  cache[key] = { result, timestamp: Date.now() };
  // Keep at most 50 entries (evict oldest)
  const trimmed = Object.fromEntries(
    Object.entries(cache)
      .sort(([, a], [, b]) => b.timestamp - a.timestamp)
      .slice(0, 50)
  );
  localStorage.setItem(RESULT_CACHE_KEY, JSON.stringify(trimmed));
}

// Scan all cached entries for a matching restaurant name (exact, case-insensitive)
function findCachedByRestaurantName(name: string, lang: string): ExploreResponse | null {
  const cache = getResultCache();
  const normalizedName = name.toLowerCase().trim();
  for (const [key, entry] of Object.entries(cache)) {
    if (!key.endsWith(`::${lang}`)) continue;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) continue;
    if (entry.result.restaurant.name.toLowerCase().trim() === normalizedName) {
      return entry.result;
    }
  }
  return null;
}

function loadRecent(): RecentSearch[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecent(
  entry: RecentSearch,
  lang: "zh" | "en",
  existing: RecentSearch[]
): RecentSearch[] {
  // Carry forward any already-known language-specific cuisine types from old entry
  const prev = existing.find(
    (s) => s.name.toLowerCase().trim() === entry.name.toLowerCase().trim()
  );
  const langKey = lang === "zh" ? "cuisine_type_zh" : "cuisine_type_en";
  const merged: RecentSearch = {
    // Inherit the OTHER language version (if already known) from the previous entry
    ...(prev ? { cuisine_type_zh: prev.cuisine_type_zh, cuisine_type_en: prev.cuisine_type_en } : {}),
    ...entry,
    // Always write the current language's fresh value
    [langKey]: entry.cuisine_type,
  };

  // Deduplicate by both input string and restaurant name (case-insensitive)
  const deduped = existing.filter(
    (s) =>
      s.input !== entry.input &&
      s.name.toLowerCase().trim() !== entry.name.toLowerCase().trim()
  );
  const updated = [merged, ...deduped].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Updates only the language-specific cuisine_type for a given restaurant name,
 * WITHOUT changing the entry's position in the list (used on language-switch re-fetch).
 */
function patchRecentLangCuisine(
  name: string,
  cuisineType: string,
  lang: "zh" | "en",
  existing: RecentSearch[]
): RecentSearch[] {
  const langKey = lang === "zh" ? "cuisine_type_zh" : "cuisine_type_en";
  const updated = existing.map((s) =>
    s.name.toLowerCase().trim() === name.toLowerCase().trim()
      ? { ...s, [langKey]: cuisineType }
      : s
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

// ─── Tab type ──────────────────────────────────────────────────────────────

type Tab = "intro" | "history" | "dishes" | "nutrition" | "reviews";

// ─── StarRating ────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl leading-none transition-transform hover:scale-110"
        >
          <span className={(hovered || value) >= star ? "text-orange-400" : "text-gray-200"}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const { t, language } = useLanguage();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExploreResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("intro");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Post-save detail section state
  const [savedRestaurantId, setSavedRestaurantId] = useState<string | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailForm, setDetailForm] = useState({
    is_visited: false,
    user_rating: 0,
    visited_at: "",
    want_to_revisit: null as boolean | null,
  });

  // Dish photo state — loaded lazily when user opens Dishes tab
  const [dishPhotos, setDishPhotos] = useState<({ url: string; source: string } | null)[]>([]);
  const [dishPhotosLoading, setDishPhotosLoading] = useState(false);
  const [dishPhotosLoaded, setDishPhotosLoaded] = useState(false);
  // Debug: force a specific photo provider (null = auto cascade)
  const [photoProvider, setPhotoProvider] = useState<string | null>(null);

  const lastInputRef = useRef("");

  // Load recent searches (client-side only)
  useEffect(() => {
    setRecentSearches(loadRecent());
  }, []);

  // ── Dish photo lazy-loading ───────────────────────────────────────────────
  // Fires when user opens Dishes tab, or when photoProvider changes
  useEffect(() => {
    if (activeTab !== "dishes" || !result || dishPhotosLoaded || dishPhotosLoading) return;

    const dishes = result.ai.signature_dishes;

    setDishPhotosLoading(true);

    Promise.all(
      dishes.map(async (dish) => {
        // ── 1. Check local cache first ──────────────────────────────────────
        const cacheKey = dish.search_name || dish.name;
        const cached = getDishPhotoFromCache(cacheKey, photoProvider);
        if (cached) return cached;

        // ── 2. Fetch from API ───────────────────────────────────────────────
        try {
          // Use search_name (original menu language) + cuisine type for better photo relevance;
          // e.g. "Tacos Mexican food", "Ramen Japanese food"
          const cuisineHint = result.ai.cuisine_type ?? "";
          const q = encodeURIComponent(`${dish.search_name || dish.name} ${cuisineHint} food`.trim());
          const providerParam = photoProvider ? `&provider=${photoProvider}` : "";
          const res = await fetch(`/api/dish-photo?q=${q}${providerParam}`);
          if (!res.ok) return null;
          const data = await res.json();
          if (!data.url) return null;
          const entry = { url: data.url as string, source: data.source as string };
          // ── 3. Write to cache ─────────────────────────────────────────────
          setDishPhotoCache(cacheKey, photoProvider, entry.url, entry.source);
          return entry;
        } catch {
          return null;
        }
      })
    ).then((photos) => {
      setDishPhotos(photos);
      setDishPhotosLoaded(true);
      setDishPhotosLoading(false);
    });
  }, [activeTab, result, dishPhotosLoaded, dishPhotosLoading, photoProvider]);

  // ── Core fetch function ───────────────────────────────────────────────────
  const runExplore = useCallback(
    async (
      searchInput: string,
      options: { skipRecentUpdate?: boolean; skipCache?: boolean } = {}
    ) => {
      setLoading(true);
      setError(null);
      setSaved(false);
      setActiveTab("intro");
      setShowDropdown(false);
      // Reset detail section + dish photo state for new search
      setSavedRestaurantId(null);
      setDishPhotos([]);
      setDishPhotosLoading(false);
      setDishPhotosLoaded(false);
      setIsEditingDetails(false);
      setDetailsSaved(false);
      setDetailForm({ is_visited: false, user_rating: 0, visited_at: "", want_to_revisit: null });

      // ── Check client-side result cache ──────────────────────────────────
      if (!options.skipCache) {
        // 1. Exact input key match
        let cached = getCachedResult(searchInput, language);

        // 2. If no exact match, check if input text is a known restaurant name
        //    e.g. user types "Nobu Fifty Seven" which was previously found via a URL
        if (!cached) {
          cached = findCachedByRestaurantName(searchInput, language);
        }

        // 3. Also check recent searches: if input matches a saved restaurant name,
        //    look up that search's original cache entry
        if (!cached) {
          const recentList = loadRecent();
          const nameMatch = recentList.find(
            (r) => r.name.toLowerCase().trim() === searchInput.toLowerCase().trim()
          );
          if (nameMatch) {
            cached = getCachedResult(nameMatch.input, language);
          }
        }

        if (cached) {
          setResult(cached);
          if (cached.fromCache && cached.restaurantId) {
            setSaved(true);
            setSavedRestaurantId(cached.restaurantId);
            // Pre-populate from savedDetails if available
            if (cached.savedDetails) {
              const d = cached.savedDetails;
              setDetailForm({
                is_visited: d.is_visited ?? false,
                user_rating: d.user_rating ?? 0,
                visited_at: d.visited_at ?? "",
                want_to_revisit: d.want_to_revisit ?? null,
              });
              const hasDetails = d.is_visited || d.user_rating !== null;
              setDetailsSaved(hasDetails);
              setIsEditingDetails(!hasDetails);
            } else {
              setIsEditingDetails(true);
            }
          }
          // Cache the result under this new input key too (for next time)
          setCachedResult(searchInput, language, cached);
          // Don't add a duplicate recent search entry — pushRecent deduplicates by name
          if (!options.skipRecentUpdate) {
            const entry: RecentSearch = {
              input: searchInput,
              name: cached.restaurant.name,
              cuisine_type: cached.restaurant.cuisine_type,
              timestamp: Date.now(),
            };
            setRecentSearches((prev) => pushRecent(entry, language, prev));
          }
          setLoading(false);
          setIsTranslating(false);
          return;
        }
      }

      try {
        const res = await fetch("/api/explore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: searchInput, language }),
        });

        if (!res.ok) throw new Error("api_error");

        const data: ExploreResponse = await res.json();
        setResult(data);

        // Store in client cache under this input key
        setCachedResult(searchInput, language, data);

        // Handle server-side DB cache hit — restaurant already saved
        if (data.fromCache && data.restaurantId) {
          setSaved(true);
          setSavedRestaurantId(data.restaurantId);
          if (data.savedDetails) {
            const d = data.savedDetails;
            setDetailForm({
              is_visited: d.is_visited ?? false,
              user_rating: d.user_rating ?? 0,
              visited_at: d.visited_at ?? "",
              want_to_revisit: d.want_to_revisit ?? null,
            });
            const hasDetails = d.is_visited || d.user_rating !== null;
            setDetailsSaved(hasDetails);
            setIsEditingDetails(!hasDetails);
          } else {
            setIsEditingDetails(true);
          }
        }

        // Add to recent searches — pushRecent deduplicates by both input and name,
        // so a URL search resolving to an already-known restaurant name won't create
        // a duplicate entry; it will just move the existing entry to the top.
        if (!options.skipRecentUpdate) {
          const entry: RecentSearch = {
            input: searchInput,
            name: data.restaurant.name,
            cuisine_type: data.restaurant.cuisine_type,
            timestamp: Date.now(),
          };
          setRecentSearches((prev) => pushRecent(entry, language, prev));
        } else {
          // Language-change re-fetch: patch cuisine_type for the new language
          // in-place without moving the entry to the top of the list.
          setRecentSearches((prev) =>
            patchRecentLangCuisine(data.restaurant.name, data.restaurant.cuisine_type, language, prev)
          );
        }
      } catch {
        setError(t.common.error);
      } finally {
        setLoading(false);
        setIsTranslating(false);
      }
    },
    [language, t.common.error]
  );

  // ── Auto-retranslate on language change ───────────────────────────────────
  useEffect(() => {
    if (result && lastInputRef.current) {
      setIsTranslating(true);
      // skipCache: true — language changed, need fresh result in new language
      // (the new result will be cached under the new language key)
      runExplore(lastInputRef.current, { skipRecentUpdate: true, skipCache: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // ── User search ───────────────────────────────────────────────────────────
  const handleExplore = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError(t.explore.errorEmpty);
      return;
    }
    lastInputRef.current = trimmed;
    setResult(null);
    runExplore(trimmed);
  };

  // ── Click recent search ───────────────────────────────────────────────────
  const handleRecentClick = (recent: RecentSearch) => {
    setInput(recent.input);
    lastInputRef.current = recent.input;
    setResult(null);
    setShowDropdown(false);
    runExplore(recent.input);
  };

  const handleClearRecent = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRecentSearches([]);
    setShowDropdown(false);
  };

  // ── Save restaurant ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.restaurant.name,
          address: result.restaurant.address,
          lat: result.restaurant.lat,
          lng: result.restaurant.lng,
          cuisine_type: result.restaurant.cuisine_type,
          google_place_id: result.restaurant.google_place_id,
          source_url: lastInputRef.current.startsWith("http")
            ? lastInputRef.current
            : null,
          ai_description: result.ai.introduction,
          signature_dishes: result.ai.signature_dishes,
          ai_content: result.ai,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setSaved(true);
        setSavedRestaurantId(saved.id);
        setIsEditingDetails(true);  // show the detail form after fresh save
        setDetailsSaved(false);
      } else {
        throw new Error();
      }
    } catch {
      setError(t.common.error);
    } finally {
      setSaving(false);
    }
  };

  // ── Save detail annotations ───────────────────────────────────────────────
  const handleSaveDetails = async () => {
    if (!savedRestaurantId) return;
    setSavingDetails(true);
    try {
      const body: Record<string, unknown> = {
        is_visited: detailForm.is_visited,
      };
      if (detailForm.is_visited) {
        body.want_to_revisit = detailForm.want_to_revisit;
        body.visited_at = detailForm.visited_at || null;
        if (detailForm.user_rating > 0) {
          body.user_rating = detailForm.user_rating;
        }
      }
      const res = await fetch(`/api/restaurants/${savedRestaurantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setDetailsSaved(true);
        setIsEditingDetails(false);  // collapse to summary view
      }
    } catch {
      // Silently fail — annotations are non-critical
    } finally {
      setSavingDetails(false);
    }
  };

  const hasReviews = (result?.restaurant.reviews?.length ?? 0) > 0;

  const tabs: { key: Tab; label: string }[] = [
    { key: "intro", label: t.explore.tabs.intro },
    { key: "history", label: t.explore.tabs.history },
    { key: "dishes", label: t.explore.tabs.dishes },
    { key: "nutrition", label: t.explore.tabs.nutrition },
    ...(hasReviews ? [{ key: "reviews" as Tab, label: t.explore.tabs.reviews }] : []),
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8">
      {/* Responsive wrapper: column on mobile, side-by-side on lg+ */}
      <div className="flex flex-col lg:flex-row gap-6 lg:items-start">

        {/* ── Main content area ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 w-full">

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{t.explore.title}</h2>
            <p className="text-gray-500 mt-1 text-sm">{t.explore.subtitle}</p>
          </div>

          {/* Search Bar — relative wrapper holds the dropdown */}
          <div className="flex gap-2 md:gap-3 mb-6">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Hide dropdown the moment user starts typing
                  if (e.target.value) setShowDropdown(false);
                }}
                onFocus={() => {
                  if (recentSearches.length > 0) setShowDropdown(true);
                }}
                onBlur={() => {
                  // Delay so onMouseDown on dropdown items fires first
                  setTimeout(() => setShowDropdown(false), 150);
                }}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleExplore()}
                placeholder={t.explore.placeholder}
                className="w-full border border-gray-200 rounded-2xl px-4 md:px-5 py-3 md:py-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white shadow-sm"
                disabled={loading}
              />

              {/* Recent Searches Dropdown — hidden on lg+ where sidebar shows */}
              {showDropdown && recentSearches.length > 0 && (
                <div className="lg:hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20">
                  {/* Dropdown header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      {t.explore.recentSearches}
                    </span>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault(); // prevent blur
                        handleClearRecent();
                      }}
                      className="text-[11px] text-gray-400 hover:text-red-400 transition-colors"
                    >
                      {t.explore.clearAll}
                    </button>
                  </div>

                  {/* Dropdown items */}
                  <div className="max-h-60 overflow-y-auto">
                    {recentSearches.map((search, i) => (
                      <button
                        key={i}
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevent blur before click
                          handleRecentClick(search);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-orange-50 active:bg-orange-100 transition-colors flex items-center gap-3 group"
                      >
                        <span className="text-gray-300 flex-shrink-0">🕐</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate group-hover:text-orange-600 transition-colors">
                            {search.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {(language === "zh" ? search.cuisine_type_zh : search.cuisine_type_en) ?? search.cuisine_type}
                          </p>
                        </div>
                        {/* Arrow hint */}
                        <svg className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-orange-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleExplore}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold px-5 md:px-7 py-3 md:py-4 rounded-2xl transition-colors whitespace-nowrap shadow-sm text-sm"
            >
              {loading ? "..." : t.explore.searchBtn}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-sm mb-5">
              {error}
            </div>
          )}

          {/* Loading / Translating Skeleton */}
          {loading && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">{isTranslating ? "🌐" : "🔍"}</div>
                <div>
                  <div className="h-5 bg-gray-200 rounded w-40 md:w-48 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-24 md:w-32" />
                </div>
              </div>
              <p className="text-orange-500 text-sm font-medium">
                {isTranslating ? t.explore.translating : t.explore.searching}
              </p>
              <div className="mt-4 space-y-3">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-5/6" />
                <div className="h-4 bg-gray-100 rounded w-4/6" />
              </div>
            </div>
          )}

          {/* Results Card */}
          {result && !loading && (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Restaurant Header */}
                <div className="p-4 md:p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-lg md:text-xl font-bold text-gray-800">
                          {result.restaurant.name}
                        </h3>
                        <span className="bg-orange-100 text-orange-600 text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                          {result.restaurant.cuisine_type}
                        </span>
                        {result.fromCache && (
                          <span className="bg-blue-50 text-blue-500 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap">
                            📚 {language === "zh" ? "已缓存" : "Cached"}
                          </span>
                        )}
                      </div>
                      {result.restaurant.address && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <span>📍</span>
                          {result.restaurant.address}
                        </p>
                      )}
                      {result.restaurant.rating && (
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <span>⭐</span>
                          {result.restaurant.rating} / 5
                        </p>
                      )}
                    </div>

                    {/* Save Button */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <button
                        onClick={handleSave}
                        disabled={saving || saved}
                        className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all disabled:opacity-60 ${
                          saved
                            ? "bg-green-100 text-green-600 cursor-default"
                            : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}
                      >
                        {saving
                          ? t.common.saving
                          : saved
                          ? result.fromCache
                            ? t.explore.alreadySaved
                            : t.explore.savedBtn
                          : t.explore.saveBtn}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs — evenly distributed, no scroll */}
                <div className="flex border-b border-gray-100 px-2 md:px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 py-3 px-1 text-xs md:text-sm font-medium border-b-2 transition-all -mb-px text-center ${
                        activeTab === tab.key
                          ? "border-orange-500 text-orange-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-4 md:p-6">
                  {activeTab === "intro" && (
                    <div className="space-y-4">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                        {result.ai.introduction}
                      </p>

                      {/* ── Restaurant Spotlight card ── */}
                      {result.ai.restaurant_spotlight && (
                        <div className="rounded-xl border border-orange-100 bg-orange-50 overflow-hidden">
                          <h4 className="px-4 pt-3 pb-1 text-xs font-semibold text-orange-600 uppercase tracking-wide">
                            {t.explore.restaurantSpotlight}
                          </h4>
                          <div className="divide-y divide-orange-100">
                            {(
                              [
                                { icon: "📍", label: t.explore.neighborhood, value: result.ai.restaurant_spotlight.neighborhood },
                                { icon: "🕐", label: t.explore.hours,        value: result.ai.restaurant_spotlight.hours },
                                { icon: "🅿️",  label: t.explore.parking,      value: result.ai.restaurant_spotlight.parking },
                              ] as { icon: string; label: string; value: string }[]
                            ).map(({ icon, label, value }) => (
                              <div key={label} className="flex gap-3 px-4 py-2.5 text-sm">
                                <span className="text-base leading-snug flex-shrink-0">{icon}</span>
                                <div className="min-w-0">
                                  <span className="font-medium text-gray-700">{label}</span>
                                  <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">{value}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="px-4 py-2 text-[11px] text-gray-400 text-right border-t border-orange-100">
                            ⚠ {t.explore.aiEstimate}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === "history" && (
                    <div className="space-y-5">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                        {result.ai.history}
                      </p>

                      {/* ── Cuisine character chips ── */}
                      {(result.ai.common_ingredients?.length ?? 0) > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            🥕 {t.explore.commonIngredients}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {result.ai.common_ingredients!.map((item) => (
                              <span
                                key={item}
                                className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(result.ai.common_spices?.length ?? 0) > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            🧂 {t.explore.commonSpices}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {result.ai.common_spices!.map((item) => (
                              <span
                                key={item}
                                className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(result.ai.food_pairings?.length ?? 0) > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            🍷 {t.explore.foodPairings}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {result.ai.food_pairings!.map((item) => (
                              <span
                                key={item}
                                className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-medium"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === "dishes" && (
                    <div className="space-y-4">

                      {/* ── Debug: photo source selector ── */}
                      <div className="flex items-center gap-2 flex-wrap pb-1">
                        <span className="text-[11px] text-gray-400 font-medium">图片来源:</span>
                        {([
                          { key: null,         label: "自动" },
                          { key: "serper",     label: "Serper" },
                          { key: "wikimedia",  label: "Wikimedia" },
                          { key: "pexels",     label: "Pexels" },
                          { key: "openai",     label: "DALL·E" },
                          { key: "google",     label: "Google CSE" },
                        ] as { key: string | null; label: string }[]).map(({ key, label }) => (
                          <button
                            key={String(key)}
                            onClick={() => {
                              if (photoProvider === key) return;
                              setPhotoProvider(key);
                              // Reset so photos re-fetch with new provider
                              setDishPhotos([]);
                              setDishPhotosLoaded(false);
                            }}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] border transition-all ${
                              photoProvider === key
                                ? "bg-orange-500 border-orange-500 text-white font-medium"
                                : "border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-500"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {result.ai.signature_dishes.map((dish, i) => {
                        const photoEntry = dishPhotos[i] ?? null;
                        const isLoading = dishPhotosLoading && !dishPhotosLoaded;

                        // Source label text
                        const sourceLabel = photoEntry
                          ? photoEntry.source === "serper"
                            ? language === "zh" ? "图片来自 Google 搜索" : "Via Google Search"
                            : photoEntry.source === "google"
                            ? language === "zh" ? "图片来自 Google CSE" : "Via Google CSE"
                            : photoEntry.source === "openai"
                            ? language === "zh" ? "AI 生成图片 (DALL·E)" : "AI Generated (DALL·E)"
                            : photoEntry.source === "pexels"
                            ? language === "zh" ? "图片来自 Pexels" : "Via Pexels"
                            : language === "zh" ? "图片来自维基共享资源" : "Via Wikimedia Commons"
                          : null;

                        return (
                          // Outer: flex-col so source footer sits at bottom of card
                          <div key={i} className="rounded-xl border border-orange-100 bg-orange-50 overflow-hidden flex flex-col">
                            {/* Photo + text row */}
                            <div className="flex flex-col md:flex-row flex-1">
                              {/* Photo — full-width on mobile, 1/3 on desktop */}
                              {isLoading ? (
                                <div className="w-full h-40 md:w-1/3 md:min-h-44 flex-shrink-0 bg-orange-100 animate-pulse" />
                              ) : photoEntry ? (
                                <div className="relative w-full flex-shrink-0 md:w-1/3">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={photoEntry.url}
                                    alt={dish.name}
                                    className="w-full h-40 md:h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                                      // URL expired or broken — evict from cache so next visit re-fetches
                                      clearDishPhotoCache(dish.search_name || dish.name, photoProvider);
                                    }}
                                  />
                                </div>
                              ) : null}

                              {/* Text */}
                              <div className="flex-1 min-w-0 p-3 md:p-4">
                                <h4 className="font-semibold text-gray-800 mb-1 text-sm md:text-base">
                                  {dish.name}
                                </h4>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  {dish.description}
                                </p>

                                {/* Key ingredient chips */}
                                {(dish.key_ingredients?.length ?? 0) > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {dish.key_ingredients!.map((ing) => (
                                      <span
                                        key={ing}
                                        className="px-2 py-0.5 bg-white border border-orange-200 text-orange-600 rounded-full text-[11px] font-medium"
                                      >
                                        {ing}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Cooking method */}
                                {dish.cooking_method && (
                                  <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                                    <span className="font-medium text-gray-600">
                                      🍳 {t.explore.cookingMethod}:
                                    </span>{" "}
                                    {dish.cooking_method}
                                  </p>
                                )}

                                {/* How to eat */}
                                {dish.how_to_eat && (
                                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                                    <span className="font-medium text-gray-600">
                                      🥢 {t.explore.howToEat}:
                                    </span>{" "}
                                    {dish.how_to_eat}
                                  </p>
                                )}

                                {/* Price */}
                                {dish.price_range && (
                                  <p className="mt-2 text-xs font-semibold text-orange-600">
                                    💴 {t.explore.priceRange}: {dish.price_range}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Source label — full-width footer below image */}
                            {sourceLabel && (
                              <div className="border-t border-orange-100 px-3 py-1.5 text-right">
                                <span className="text-[10px] text-gray-400">{sourceLabel}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {activeTab === "nutrition" && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm md:text-base">
                          <span>🥗</span> {t.explore.nutritionNotes}
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                          {result.ai.nutrition_highlights}
                        </p>
                      </div>
                      <div className="border-t border-gray-100 pt-5">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm md:text-base">
                          <span>⚠️</span> {t.explore.dietaryNotes}
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                          {result.ai.dietary_notes}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === "reviews" && (
                    <div className="space-y-3">
                      {!result.restaurant.reviews?.length ? (
                        <p className="text-gray-400 text-sm text-center py-8">
                          {t.explore.noReviews}
                        </p>
                      ) : (
                        <>
                          {result.restaurant.reviews.map((review, i) => (
                            <div key={i} className="border border-gray-100 rounded-xl p-4">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <span className="font-medium text-gray-800 text-sm leading-tight">
                                  {review.authorName}
                                </span>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <span
                                        key={s}
                                        className={`text-xs ${s <= review.rating ? "text-orange-400" : "text-gray-200"}`}
                                      >
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                  {review.relativeTime && (
                                    <span className="text-xs text-gray-400">{review.relativeTime}</span>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
                            </div>
                          ))}
                          <p className="text-xs text-gray-400 text-right pt-1">
                            {t.explore.reviewsSource}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Permanent "My Notes" section (visible once saved) ── */}
              {savedRestaurantId && (
                <div className="mt-4 bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                  {isEditingDetails ? (
                    /* ── Edit / Entry form ─────────────────────────────── */
                    <div className="p-5 md:p-6">
                      <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-5">
                        <span>📋</span>
                        {detailsSaved ? t.explore.detailFormUpdate : t.explore.detailFormTitle}
                      </h4>

                      <div className="space-y-5">
                        {/* Have you visited? */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">{t.explore.haveVisited}</p>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setDetailForm((f) => ({ ...f, is_visited: true }))}
                              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                                detailForm.is_visited
                                  ? "bg-green-50 border-green-300 text-green-700"
                                  : "border-gray-200 text-gray-500 hover:border-gray-300"
                              }`}
                            >
                              {t.explore.visitedYes}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDetailForm((f) => ({
                                  ...f,
                                  is_visited: false,
                                  user_rating: 0,
                                  want_to_revisit: null,
                                  visited_at: "",
                                }))
                              }
                              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                                !detailForm.is_visited
                                  ? "bg-orange-50 border-orange-300 text-orange-700"
                                  : "border-gray-200 text-gray-500 hover:border-gray-300"
                              }`}
                            >
                              {t.explore.visitedNo}
                            </button>
                          </div>
                        </div>

                        {/* Conditional fields — shown only if visited */}
                        {detailForm.is_visited && (
                          <>
                            {/* Your Rating */}
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">{t.explore.yourRating}</p>
                              <StarRating
                                value={detailForm.user_rating}
                                onChange={(v) => setDetailForm((f) => ({ ...f, user_rating: v }))}
                              />
                            </div>

                            {/* Visit Date */}
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">{t.explore.visitDate}</p>
                              <input
                                type="date"
                                value={detailForm.visited_at}
                                onChange={(e) =>
                                  setDetailForm((f) => ({ ...f, visited_at: e.target.value }))
                                }
                                max={new Date().toISOString().split("T")[0]}
                                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                              />
                            </div>

                            {/* Want to revisit */}
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">{t.explore.wantRevisit}</p>
                              <div className="flex gap-3">
                                {([true, false] as const).map((val) => (
                                  <button
                                    key={String(val)}
                                    type="button"
                                    onClick={() =>
                                      setDetailForm((f) => ({ ...f, want_to_revisit: val }))
                                    }
                                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                                      detailForm.want_to_revisit === val
                                        ? val
                                          ? "bg-blue-50 border-blue-300 text-blue-700"
                                          : "bg-gray-100 border-gray-300 text-gray-700"
                                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                                    }`}
                                  >
                                    {val
                                      ? language === "zh" ? "是 🔄" : "Yes 🔄"
                                      : language === "zh" ? "不了" : "No"}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Save */}
                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={handleSaveDetails}
                            disabled={savingDetails}
                            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors"
                          >
                            {savingDetails ? t.explore.savingDetails : t.explore.saveDetails}
                          </button>
                          {detailsSaved && (
                            <button
                              onClick={() => setIsEditingDetails(false)}
                              className="text-gray-400 hover:text-gray-600 font-medium px-4 py-2.5 rounded-xl text-sm border border-gray-200 hover:border-gray-300 transition-all"
                            >
                              {language === "zh" ? "取消" : "Cancel"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── Summary view (after details saved) ───────────── */
                    <div className="p-5 md:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                          <span>📋</span> {t.explore.myRecord}
                        </h4>
                        <button
                          onClick={() => setIsEditingDetails(true)}
                          className="text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors"
                        >
                          {t.explore.editRecord}
                        </button>
                      </div>

                      {/* Status badge */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span
                          className={`text-xs font-medium px-3 py-1 rounded-full ${
                            detailForm.is_visited
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {detailForm.is_visited ? t.explore.visitedYes : t.explore.visitedNo}
                        </span>
                        {detailForm.want_to_revisit && (
                          <span className="text-xs font-medium px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                            {language === "zh" ? "想再去 🔄" : "Want to revisit 🔄"}
                          </span>
                        )}
                      </div>

                      {/* Star rating */}
                      {detailForm.user_rating > 0 && (
                        <div className="flex gap-0.5 mb-3">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span
                              key={s}
                              className={`text-lg ${s <= detailForm.user_rating ? "text-orange-400" : "text-gray-200"}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Visit date */}
                      {detailForm.visited_at && (
                        <p className="text-xs text-gray-500">
                          📅{" "}
                          {new Date(detailForm.visited_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Recent Searches Sidebar — Desktop only (lg+) ──────── */}
        <div className="hidden lg:block w-56 shrink-0 sticky top-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t.explore.recentSearches}
              </h3>
              {recentSearches.length > 0 && (
                <button
                  onClick={handleClearRecent}
                  className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                >
                  {t.explore.clearAll}
                </button>
              )}
            </div>

            {recentSearches.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-3xl mb-2 opacity-40">🔍</div>
                <p className="text-xs text-gray-400">{t.explore.noRecentSearches}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[calc(100vh-200px)] overflow-y-auto">
                {recentSearches.map((search, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecentClick(search)}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors group"
                  >
                    <p className="text-sm font-medium text-gray-700 truncate group-hover:text-orange-600 transition-colors">
                      {search.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {(language === "zh" ? search.cuisine_type_zh : search.cuisine_type_en) ?? search.cuisine_type}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
