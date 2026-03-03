import { createClient } from "@supabase/supabase-js";

/**
 * AI Prompt management — reads prompts from the `ai_prompts` Supabase table.
 *
 * Table columns used:
 *   key          TEXT UNIQUE — e.g. "restaurant_info_system", "restaurant_info_user"
 *   content      TEXT        — prompt body; user templates use {{placeholder}} syntax
 *   role         TEXT        — "system" | "user"
 *   model        TEXT        — OpenAI model override (read from system row)
 *   temperature  FLOAT       — generation temperature override
 *   max_tokens   INTEGER     — max token override
 *   is_active    BOOLEAN     — only active rows are fetched
 *
 * In-process cache: 5-minute TTL so DB edits are reflected without restarts.
 * Falls back to hardcoded defaults in openai.ts if the DB is unavailable.
 */

export interface PromptRow {
  key: string;
  content: string;
  role: "system" | "user";
  model?: string | null;
  temperature?: number | null;
  max_tokens?: number | null;
}

// ── In-process cache ──────────────────────────────────────────────────────────

interface CacheEntry {
  data: PromptRow;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const _cache = new Map<string, CacheEntry>();

// ── Supabase client (anon, server-side, no cookie handling needed) ────────────

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetches a prompt row by key from the `ai_prompts` table.
 * Returns null (and logs a warning) if the DB is unreachable or the key doesn't exist.
 * Results are cached in-process for 5 minutes.
 */
export async function getPrompt(key: string): Promise<PromptRow | null> {
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("ai_prompts")
      .select("key, content, role, model, temperature, max_tokens")
      .eq("key", key)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.warn(`[Prompts] Could not fetch prompt "${key}":`, error?.message ?? "no data");
      return null;
    }

    const row = data as PromptRow;
    _cache.set(key, { data: row, fetchedAt: Date.now() });
    return row;
  } catch (err) {
    console.warn(`[Prompts] Unexpected error fetching "${key}":`, err);
    return null;
  }
}

/**
 * Invalidates the in-process cache for a specific key (or all keys if omitted).
 * Useful in tests or after seeding the DB.
 */
export function invalidatePromptCache(key?: string) {
  if (key) {
    _cache.delete(key);
  } else {
    _cache.clear();
  }
}

/**
 * Simple {{key}} → value template substitution.
 * Unknown placeholders are left as-is (e.g. {{unknown}} stays {{unknown}}).
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? `{{${k}}}`);
}
