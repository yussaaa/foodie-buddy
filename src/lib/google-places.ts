export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  publishTime: string;   // ISO date string
  relativeTime: string;  // "2 days ago"
}

export interface PlaceResult {
  placeId: string | null;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  types: string[];
  rating: number | null;
  reviews: PlaceReview[];
  photoNames: string[];        // Google Places photo resource names (up to 5)
  openingHours?: string[] | null; // weekdayDescriptions from regularOpeningHours
  website?: string | null;    // restaurant's own website (websiteUri from Places API)
}

/**
 * 解析用户输入，提取可用于搜索的查询词
 * 支持：Google Maps 长链接 / maps.app.goo.gl 短链接 / 普通网址 / 纯文本
 */
export async function parseUserInput(input: string): Promise<string> {
  const trimmed = input.trim();

  if (!trimmed.startsWith("http")) {
    // 纯文本，直接用作搜索词
    return trimmed;
  }

  try {
    // 短链接（goo.gl / maps.app.goo.gl）：跟随重定向获取真实 URL
    if (trimmed.includes("goo.gl")) {
      const res = await fetch(trimmed, {
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      return parseGoogleMapsUrl(res.url) ?? trimmed;
    }

    // Google Maps 完整链接
    if (trimmed.includes("google.com/maps")) {
      return parseGoogleMapsUrl(trimmed) ?? trimmed;
    }

    // 普通餐厅网站，取域名作为提示
    const url = new URL(trimmed);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return trimmed;
  }
}

function parseGoogleMapsUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // /maps/place/RESTAURANT_NAME/@...
    const placeMatch = urlObj.pathname.match(/\/maps\/place\/([^/@]+)/);
    if (placeMatch) {
      return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    }

    // ?q=RESTAURANT_NAME
    const q = urlObj.searchParams.get("q");
    if (q) return q;

    return null;
  } catch {
    return null;
  }
}

/**
 * 调用 Google Places Text Search API 搜索餐厅
 */
export async function searchPlace(query: string): Promise<PlaceResult | null> {
  // 只用一个 Google Maps API key（NEXT_PUBLIC_ 前缀在 server 端同样可读）
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === "your_google_maps_api_key") {
    console.warn("[Google Places] API key not configured, skipping Places search");
    return null;
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.reviews,places.photos,places.regularOpeningHours,places.websiteUri",
        },
        body: JSON.stringify({ textQuery: query }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      console.warn(`[Google Places] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const place = data.places?.[0];
    if (!place) return null;

    const rawReviews: Array<{
      authorAttribution?: { displayName?: string };
      rating?: number;
      text?: { text?: string };
      originalText?: { text?: string };
      publishTime?: string;
      relativePublishTimeDescription?: string;
    }> = place.reviews ?? [];

    const reviews: PlaceReview[] = rawReviews.slice(0, 5).map((r) => ({
      authorName: r.authorAttribution?.displayName ?? "Anonymous",
      rating: r.rating ?? 0,
      text: r.text?.text ?? r.originalText?.text ?? "",
      publishTime: r.publishTime ?? "",
      relativeTime: r.relativePublishTimeDescription ?? "",
    }));

    // Extract up to 5 photo resource names
    const photoNames: string[] = (place.photos ?? [])
      .slice(0, 5)
      .map((p: { name?: string }) => p.name ?? "")
      .filter(Boolean);

    // Extract real opening hours (weekdayDescriptions has 7 strings, one per day)
    const rawHours = place.regularOpeningHours ?? place.currentOpeningHours;
    const openingHours: string[] | null =
      (rawHours?.weekdayDescriptions as string[] | undefined) ?? null;

    return {
      placeId: place.id ?? null,
      name: place.displayName?.text ?? query,
      address: place.formattedAddress ?? null,
      lat: place.location?.latitude ?? null,
      lng: place.location?.longitude ?? null,
      types: place.types ?? [],
      rating: place.rating ?? null,
      reviews,
      photoNames,
      openingHours,
      website: (place.websiteUri as string | undefined) ?? null,
    };
  } catch (err) {
    console.warn("[Google Places] Fetch failed:", err);
    return null;
  }
}
