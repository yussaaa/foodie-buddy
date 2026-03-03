import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

/**
 * GET /api/dish-photo?q={dishName}
 *
 * Returns { url: string | null, source: "google" | "openai" | "wikimedia" | "pexels" | null }
 *
 * ── Auto cascade (no ?provider param) ───────────────────────────────────────
 *
 * 1. Serper.dev  — real Google image search results; needs SERPER_API_KEY
 *      Free tier: 2,500 queries/month — https://serper.dev
 *
 * 2. Wikimedia Commons  — free, no key, encyclopedic food photos
 *
 * 3. Pexels             — stock photos fallback; needs PEXELS_API_KEY env var
 *
 * ── Manual override (?provider=...) ─────────────────────────────────────────
 *
 * ?provider=serper   — force Serper (Google image search)
 * ?provider=openai   — DALL·E 3 AI-generated image (~$0.04/image; on-demand only)
 * ?provider=google   — force Google CSE (legacy; needs GOOGLE_CSE_ID + GOOGLE_CSE_API_KEY)
 * ?provider=wikimedia — force Wikimedia
 * ?provider=pexels   — force Pexels
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

type PhotoSource = "google" | "openai" | "wikimedia" | "pexels" | "serper";
type PhotoResult = { url: string; source: PhotoSource };

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ url: null, source: null });

  // Optional ?provider= override for debugging (e.g. ?provider=openai)
  const providerOverride = request.nextUrl.searchParams.get("provider");

  if (providerOverride) {
    let result: PhotoResult | null = null;
    if (providerOverride === "serper")   result = await fetchSerper(q);
    if (providerOverride === "google")   result = await fetchGoogle(q);
    if (providerOverride === "openai")   result = await fetchDallE(q);
    if (providerOverride === "pexels")   result = await fetchPexels(q);
    if (providerOverride === "wikimedia") result = await fetchWikimedia(q);
    return NextResponse.json(result ?? { url: null, source: null });
  }

  // Default cascade: Serper → Wikimedia → Pexels
  // DALL·E excluded from auto-cascade (~$0.04/image) — use ?provider=openai on demand.
  // Google CSE kept as manual ?provider=google (legacy).

  if (process.env.SERPER_API_KEY) {
    const result = await fetchSerper(q);
    if (result) return NextResponse.json(result);
  }

  const wikiResult = await fetchWikimedia(q);
  if (wikiResult) return NextResponse.json(wikiResult);

  const pexelsResult = await fetchPexels(q);
  if (pexelsResult) return NextResponse.json(pexelsResult);

  return NextResponse.json({ url: null, source: null });
}

// ── 1. Serper.dev (Google Image Search) ──────────────────────────────────────

async function fetchSerper(q: string): Promise<PhotoResult | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: `${q} food`, num: 3 }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`[Serper] API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const url: string | undefined = data.images?.[0]?.imageUrl;
    return url ? { url, source: "serper" } : null;
  } catch (err) {
    console.warn("[Serper] Fetch failed:", err);
    return null;
  }
}

// ── 2. Google Custom Search (legacy) ─────────────────────────────────────────

async function fetchGoogle(q: string): Promise<PhotoResult | null> {
  // Prefer a dedicated CSE key (unrestricted) over the Maps key.
  // Maps keys often have HTTP-referrer restrictions that block server-side calls.
  const apiKey =
    process.env.GOOGLE_CSE_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cseId) return null;

  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx: cseId,
      q: `${q} food`,
      searchType: "image",
      num: "1",
      imgType: "photo",
      safe: "active",
    });

    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params}`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.warn(`[Google CSE] API error ${res.status}:`, JSON.stringify(errBody?.error ?? errBody));
      return null;
    }

    const data = await res.json();
    const url: string | undefined = data.items?.[0]?.link;
    return url ? { url, source: "google" } : null;
  } catch (err) {
    console.warn("[Google CSE] Fetch failed:", err);
    return null;
  }
}

// ── 2. OpenAI DALL·E 3 ───────────────────────────────────────────────────────

async function fetchDallE(q: string): Promise<PhotoResult | null> {
  try {
    const response = await getOpenAIClient().images.generate({
      model: "dall-e-3",
      prompt: `Ultra-realistic close-up food photography of "${q}", shot at macro distance, shallow depth of field, natural window lighting, high texture detail, ingredients clearly identifiable, vibrant but natural colors, editorial food styling, clean background, commercial food product style similar to menu listing, professional DSLR photography, high resolution, crisp focus on food surface texture, subtle highlights on sauce and moisture, no artificial look, no cameras.`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const url = response.data?.[0]?.url;
    return url ? { url, source: "openai" } : null;
  } catch (err) {
    console.warn("[DALL·E] Generation failed:", err);
    return null;
  }
}

// ── 3. Wikimedia Commons ─────────────────────────────────────────────────────

async function fetchWikimedia(q: string): Promise<PhotoResult | null> {
  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: `${q} food`,
      gsrnamespace: "6",
      prop: "imageinfo",
      iiprop: "url|mime",
      format: "json",
      gsrlimit: "5",
      iilimit: "1",
      origin: "*",
    });

    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?${params}`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      console.warn(`[Wikimedia] API error: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const pages = Object.values(data.query?.pages ?? {}) as Array<{
      imageinfo?: Array<{ url: string; mime: string }>;
    }>;

    const photo = pages.find((p) => {
      const mime = p.imageinfo?.[0]?.mime ?? "";
      return mime.startsWith("image/jpeg") || mime.startsWith("image/png") || mime.startsWith("image/webp");
    });

    const url = photo?.imageinfo?.[0]?.url;
    return url ? { url, source: "wikimedia" } : null;
  } catch (err) {
    console.warn("[Wikimedia] Fetch failed:", err);
    return null;
  }
}

// ── 4. Pexels ────────────────────────────────────────────────────────────────

async function fetchPexels(q: string): Promise<PhotoResult | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey || apiKey === "your_pexels_api_key") return null;

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(`${q} food dish`)}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) {
      console.warn(`[Pexels] API error: ${res.status}`);
      return null;
    }
    const data = await res.json();
    const url: string | undefined = data.photos?.[0]?.src?.large;
    return url ? { url, source: "pexels" } : null;
  } catch (err) {
    console.warn("[Pexels] Fetch failed:", err);
    return null;
  }
}
