import { supabase } from "./supabase";
import { API_BASE_URL } from "./constants";
import type { Restaurant } from "@/types";

// ── Auth header ──────────────────────────────────────────────────────────────

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

// ── Explore ──────────────────────────────────────────────────────────────────

export async function exploreRestaurant(
  input: string,
  language: "zh" | "en" = "zh"
) {
  const headers = await authHeader();
  const res = await fetch(`${API_BASE_URL}/api/explore`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ input, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "explore_failed");
  }
  return res.json();
}

// ── Save restaurant ──────────────────────────────────────────────────────────

export async function saveRestaurant(payload: {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  cuisine_type: string;
  google_place_id: string | null;
  source_url?: string | null;
  ai_description?: string | null;
  rating?: number | null;
  signature_dishes?: unknown;
  ai_content?: unknown;
}) {
  const headers = await authHeader();
  const res = await fetch(`${API_BASE_URL}/api/restaurants`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "save_failed");
  }
  return res.json() as Promise<Restaurant>;
}

// ── Update restaurant annotations ────────────────────────────────────────────

export async function updateRestaurant(
  id: string,
  fields: Partial<Pick<Restaurant, "user_rating" | "want_to_revisit" | "visited_at" | "is_visited" | "notes">>
) {
  const headers = await authHeader();
  const res = await fetch(`${API_BASE_URL}/api/restaurants/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "update_failed");
  }
  return res.json() as Promise<Restaurant>;
}

// ── Dish photo ───────────────────────────────────────────────────────────────

export async function getDishPhoto(
  dishName: string
): Promise<{ url: string | null; source: string | null }> {
  const res = await fetch(
    `${API_BASE_URL}/api/dish-photo?q=${encodeURIComponent(dishName)}`
  );
  if (!res.ok) return { url: null, source: null };
  return res.json();
}

// ── Analyze reviews ──────────────────────────────────────────────────────────

export async function analyzeReviews(
  reviews: string[],
  language: "zh" | "en" = "zh"
) {
  const res = await fetch(`${API_BASE_URL}/api/analyze-reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviews, language }),
  });
  if (!res.ok) return { mentions: [] };
  return res.json();
}
