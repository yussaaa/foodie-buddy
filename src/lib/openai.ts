import OpenAI from "openai";
import { getPrompt, renderTemplate } from "./prompts";

// 单例模式，避免重复创建客户端
let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export interface AIRestaurantInfo {
  cuisine_type: string;

  // ── Introduction tab ────────────────────────────────────────────────────────
  introduction: string;
  restaurant_spotlight?: {
    neighborhood: string; // 1-2 sentences about the area / vibe
    hours: string;        // typical operating hours (AI estimate)
    parking: string;      // 1 sentence on parking accessibility
  };

  // ── Food History tab ─────────────────────────────────────────────────────────
  history: string;
  common_ingredients?: string[]; // up to 8 — defining ingredients of this cuisine
  common_spices?: string[];      // up to 6 — signature spices / sauces / condiments
  food_pairings?: string[];      // up to 5 — drinks, sides, accompaniments

  // ── Signature Dishes tab ─────────────────────────────────────────────────────
  signature_dishes: Array<{
    name: string;
    search_name: string;
    description: string;           // 50-70 word taste + cultural overview
    key_ingredients?: string[];    // up to 5 main ingredients
    cooking_method?: string;       // 1 sentence primary technique
    how_to_eat?: string;           // 1-2 sentences on eating style / dipping sauce
    price_range?: string;          // e.g. "$18-28" or "¥68-98" (AI estimate)
  }>;

  // ── Nutrition tab ─────────────────────────────────────────────────────────────
  nutrition_highlights: string;
  dietary_notes: string;
}

// ── Hardcoded fallback prompts ─────────────────────────────────────────────────
// Used when the `ai_prompts` Supabase table is unreachable.
// Must stay in sync with the seed data in supabase/schema.sql.

const FALLBACK_SYSTEM_PROMPT = `You are an expert culinary historian and food critic.
Your task is to provide detailed, accurate, and engaging information about restaurants and their cuisines.
Always respond in valid JSON format with no markdown formatting.`;

const FALLBACK_USER_TEMPLATE = `Restaurant details:
- Name: {{name}}
- Address: {{address}}
- Categories: {{types}}
- Rating: {{rating}}

Please provide a comprehensive guide in {{lang}}.
Respond with ONLY a JSON object (no markdown, no code blocks) with these exact fields:

{
  "cuisine_type": "Brief cuisine label (e.g., 日本料理, Italian, Sichuan Chinese) - max 20 chars",

  "introduction": "2-3 engaging paragraphs introducing this restaurant and its cuisine style. Include what makes it unique.",

  "restaurant_spotlight": {
    "neighborhood": "1-2 sentences describing the neighborhood character based on the address. If address is unknown, describe what kind of location this cuisine type typically favors.",
    "hours": "Typical operating hours for this type of restaurant. Format: 'Mon–Fri HH:mm–HH:mm, Sat–Sun HH:mm–HH:mm'. Append '(请以实际营业时间为准)' in Chinese or '(estimate — verify on-site)' in English.",
    "parking": "1 sentence on parking accessibility inferred from the address and area type (e.g. street parking, garage nearby, difficult in dense urban area)."
  },

  "history": "2-3 paragraphs about the cultural and historical background of this cuisine type. Include origin, evolution, and cultural significance.",

  "common_ingredients": ["Up to 8 ingredients that define this cuisine — single words or short phrases, e.g. 'Rice noodles', 'Lemongrass'"],

  "common_spices": ["Up to 6 signature spices, sauces, or condiments used in this cuisine, e.g. 'Fish sauce', 'Five-spice powder'"],

  "food_pairings": ["Up to 5 drinks, sides, or accompaniments that pair well with this cuisine, e.g. 'Jasmine tea', 'Cold beer', 'Steamed rice'"],

  "signature_dishes": [
    {
      "name": "Dish name in {{lang}} (for display)",
      "search_name": "Dish name in its ORIGINAL menu language, e.g. English for Western/Japanese/Italian restaurants, Chinese for Chinese restaurants — used for image search only",
      "description": "50-70 word overview of this dish's taste profile, texture, and cultural significance",
      "key_ingredients": ["Up to 5 main ingredients in this dish, e.g. 'Wagyu beef', 'Ponzu sauce'"],
      "cooking_method": "1 sentence describing the primary cooking technique, e.g. 'Slow-braised for 6 hours in aromatic broth until fall-apart tender.'",
      "how_to_eat": "1-2 sentences on the best way to enjoy this dish — dipping sauces, correct utensils, ideal order of eating, or what to pair it with at the table.",
      "price_range": "Estimated price at this specific restaurant, inferred from its rating and cuisine type. Use local currency symbol. E.g. '$18-28' or '¥68-98'. Append '(estimate)' or '(参考价格)'."
    }
  ],

  "nutrition_highlights": "2 paragraphs summarizing the typical nutritional characteristics of this cuisine. Include macronutrients, common ingredients, and general health impact.",

  "dietary_notes": "1-2 paragraphs covering: common allergens in this cuisine, suitability for vegetarians/vegans, gluten considerations, and general dietary advice."
}`;

const FALLBACK_MODEL       = "gpt-4o-mini";
const FALLBACK_TEMPERATURE = 0.7;
const FALLBACK_MAX_TOKENS  = 2500;

// ── Main function ──────────────────────────────────────────────────────────────

/**
 * Calls OpenAI to generate restaurant & cuisine info.
 *
 * Prompts are loaded from the `ai_prompts` Supabase table (keys:
 * "restaurant_info_system" and "restaurant_info_user") with a 5-minute
 * in-process cache.  Falls back to hardcoded defaults if the DB is unreachable.
 *
 * Model, temperature and max_tokens are read from the system prompt row;
 * they also fall back to the constants above.
 */
export async function generateRestaurantInfo(params: {
  name: string;
  address?: string | null;
  types?: string[];
  rating?: number | null;
  language: "zh" | "en";
}): Promise<AIRestaurantInfo> {
  const { name, address, types, rating, language } = params;
  const langLabel = language === "zh" ? "简体中文" : "English";

  // ── Load prompts from DB (parallel, with fallback) ───────────────────────────
  const [sysRow, userRow] = await Promise.all([
    getPrompt("restaurant_info_system"),
    getPrompt("restaurant_info_user"),
  ]);

  const systemPrompt = sysRow?.content ?? FALLBACK_SYSTEM_PROMPT;
  const userTemplate = userRow?.content ?? FALLBACK_USER_TEMPLATE;

  // ── Render user template ─────────────────────────────────────────────────────
  const userPrompt = renderTemplate(userTemplate, {
    name,
    address: address || "Unknown location",
    types:   types?.join(", ") || "Restaurant",
    rating:  String(rating ?? "N/A"),
    lang:    langLabel,
  });

  // ── Model config (from system row, or fallback constants) ────────────────────
  const model       = sysRow?.model       ?? FALLBACK_MODEL;
  const temperature = sysRow?.temperature ?? FALLBACK_TEMPERATURE;
  const max_tokens  = sysRow?.max_tokens  ?? FALLBACK_MAX_TOKENS;

  // ── Call OpenAI ──────────────────────────────────────────────────────────────
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt   },
    ],
    temperature,
    max_tokens,
  });

  const raw = response.choices[0].message.content ?? "{}";
  return JSON.parse(raw) as AIRestaurantInfo;
}
