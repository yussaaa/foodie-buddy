import { NextRequest, NextResponse } from "next/server";
import { parseUserInput, searchPlace, PlaceReview } from "@/lib/google-places";
import { generateRestaurantInfo, AIRestaurantInfo } from "@/lib/openai";
import { Language } from "@/lib/i18n/translations";
import { createClient } from "@/lib/supabase/server";

export interface ExploreResponse {
  restaurant: {
    name: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
    cuisine_type: string;
    google_place_id: string | null;
    rating: number | null;
    reviews: PlaceReview[];
    photoNames: string[];           // Google Places photo resource names
    openingHours?: string[] | null; // Real hours from Google Places (weekdayDescriptions)
    website?: string | null;        // Restaurant's own website from Google Places
  };
  ai: AIRestaurantInfo;
  fromCache?: boolean;       // true if result was served from DB cache
  restaurantId?: string;     // DB id of the cached restaurant
  savedDetails?: {           // user's existing annotations (for DB cache hits)
    is_visited: boolean;
    user_rating: number | null;
    visited_at: string | null;
    want_to_revisit: boolean | null;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, language = "zh" } = body as {
      input: string;
      language: Language;
    };

    if (!input?.trim()) {
      return NextResponse.json({ error: "input_required" }, { status: 400 });
    }

    // Step 1: 解析用户输入（URL → 搜索词）
    const query = await parseUserInput(input.trim());

    // Step 2: 尝试 Google Places 搜索
    const place = await searchPlace(query);

    const restaurantName = place?.name ?? query;
    const address = place?.address ?? null;

    // Step 3: Cache check — if user is logged in and we have a placeId,
    // check if this restaurant was already explored and saved
    if (place?.placeId) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: cached } = await supabase
            .from("restaurants")
            .select("*")
            .eq("user_id", user.id)
            .eq("google_place_id", place.placeId)
            .maybeSingle();

          if (cached && cached.ai_content) {
            // Return cached result — skip OpenAI call
            // Reviews + photos + hours come from the just-completed searchPlace call (always fresh)
            return NextResponse.json({
              restaurant: {
                name: cached.name,
                address: cached.address,
                lat: cached.lat ? Number(cached.lat) : null,
                lng: cached.lng ? Number(cached.lng) : null,
                cuisine_type: cached.cuisine_type ?? "",
                google_place_id: cached.google_place_id,
                rating: cached.rating ? Number(cached.rating) : null,
                reviews: place?.reviews ?? [],
                photoNames: place?.photoNames ?? [],
                openingHours: place?.openingHours ?? null,
                website: place?.website ?? null,
              },
              ai: cached.ai_content as AIRestaurantInfo,
              fromCache: true,
              restaurantId: cached.id,
              savedDetails: {
                is_visited: cached.is_visited ?? false,
                user_rating: cached.user_rating ? Number(cached.user_rating) : null,
                visited_at: cached.visited_at ?? null,
                want_to_revisit: cached.want_to_revisit ?? null,
              },
            } satisfies ExploreResponse);
          }
        }
      } catch {
        // Soft fail — cache miss, continue with fresh AI call
      }
    }

    // Step 4: OpenAI 生成菜系介绍
    const ai = await generateRestaurantInfo({
      name: restaurantName,
      address,
      types: place?.types,
      rating: place?.rating,
      language,
    });

    const result: ExploreResponse = {
      restaurant: {
        name: restaurantName,
        address,
        lat: place?.lat ?? null,
        lng: place?.lng ?? null,
        cuisine_type: ai.cuisine_type,
        google_place_id: place?.placeId ?? null,
        rating: place?.rating ?? null,
        reviews: place?.reviews ?? [],
        photoNames: place?.photoNames ?? [],
        openingHours: place?.openingHours ?? null,
        website: place?.website ?? null,
      },
      ai,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/explore]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
