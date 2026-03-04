#!/usr/bin/env python3
"""
update_prompts.py — Push ai_prompts rows to Supabase without touching the dashboard.

Usage:
  python scripts/update_prompts.py              # update Dev (default)
  python scripts/update_prompts.py --env prod   # update Prod
  python scripts/update_prompts.py --env both   # update Dev then Prod
  python scripts/update_prompts.py --dry-run    # preview changes, no writes

Credentials:
  Dev  → .env.local          (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
  Prod → .env.prod.local     (same variable names — create this file manually, never commit it)
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

# ── Repo root (one level up from this script) ─────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parent.parent

# ── Env file paths ────────────────────────────────────────────────────────────
ENV_FILES = {
    "dev":  REPO_ROOT / ".env.local",
    "prod": REPO_ROOT / ".env.prod.local",
}

PROD_ENV_INSTRUCTIONS = """
  .env.prod.local not found. Create it manually (it is gitignored):

  # .env.prod.local — Production Supabase credentials — DO NOT COMMIT
  NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROD_PROJECT.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key

  You can find these in the GCP Cloud Run Console → the service's environment variables,
  or in the Supabase dashboard → Project Settings → API.
"""


# ── Prompt definitions ────────────────────────────────────────────────────────
# Keep these in sync with FALLBACK_* constants in src/lib/openai.ts.
# The script is the canonical way to push changes; openai.ts fallbacks are a safety net.

PROMPTS = [
    {
        "key":         "restaurant_info_system",
        "role":        "system",
        "model":       "gpt-4o-mini",
        "temperature": 0.7,
        "max_tokens":  4000,
        "description": "System prompt for restaurant info generation (also holds model/temperature/max_tokens config)",
        "content": (
            "You are an expert culinary historian and food critic.\n"
            "Your task is to provide detailed, accurate, and engaging information about restaurants and their cuisines.\n"
            "Always respond in valid JSON format with no markdown formatting."
        ),
    },
    {
        "key":         "restaurant_info_user",
        "role":        "user",
        "description": "User prompt template for restaurant info. Placeholders: {{name}}, {{address}}, {{types}}, {{rating}}, {{lang}}",
        "content": """\
Restaurant details:
- Name: {{name}}
- Address: {{address}}
- Categories: {{types}}
- Rating: {{rating}}

Please provide a comprehensive guide in {{lang}}.
IMPORTANT: The "signature_dishes" array must include between 5 and 10 of the most iconic and representative dishes of this cuisine type. Do not return fewer than 5 dishes.
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
    },
    "... include 5–10 dishes total using the same structure above ..."
  ],

  "nutrition_highlights": "2 paragraphs summarizing the typical nutritional characteristics of this cuisine. Include macronutrients, common ingredients, and general health impact.",

  "dietary_notes": "1-2 paragraphs covering: common allergens in this cuisine, suitability for vegetarians/vegans, gluten considerations, and general dietary advice."
}""",
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_env_file(path: Path) -> dict[str, str]:
    """Read KEY=VALUE lines from an env file; skip comments and blanks."""
    env: dict[str, str] = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip()
    return env


def load_credentials(env_name: str) -> tuple[str, str]:
    """Return (supabase_url, service_role_key) for the given env."""
    env_file = ENV_FILES[env_name]
    if not env_file.exists():
        if env_name == "prod":
            print(f"\n❌  Error: {env_file} does not exist.")
            print(PROD_ENV_INSTRUCTIONS)
        else:
            print(f"\n❌  Error: {env_file} does not exist.")
            print("   Make sure you are running this script from the repo root.")
        sys.exit(1)

    env = parse_env_file(env_file)
    url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")

    if not url or not key:
        missing = []
        if not url:
            missing.append("NEXT_PUBLIC_SUPABASE_URL")
        if not key:
            missing.append("SUPABASE_SERVICE_ROLE_KEY")
        print(f"\n❌  Error: Missing variables in {env_file}: {', '.join(missing)}")
        sys.exit(1)

    return url, key


def upsert_prompt(url: str, key: str, prompt: dict, env_label: str, dry_run: bool) -> bool:
    """POST a single prompt row to Supabase with upsert semantics. Returns True on success."""
    prompt_key = prompt["key"]

    if dry_run:
        preview = json.dumps(prompt, indent=2, ensure_ascii=False)
        print(f"\n[DRY RUN] Would upsert '{prompt_key}' ({env_label}):")
        # Show first 400 chars of content for readability
        content_preview = prompt["content"][:400].replace("\n", "↵")
        if len(prompt["content"]) > 400:
            content_preview += f"... (+{len(prompt['content']) - 400} chars)"
        print(f"  content preview: {content_preview}")
        extra_fields = {k: v for k, v in prompt.items() if k not in ("key", "role", "content", "description")}
        if extra_fields:
            print(f"  extra fields: {extra_fields}")
        return True

    endpoint = f"{url}/rest/v1/ai_prompts"
    body = json.dumps(prompt).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "apikey":        key,
            "Authorization": f"Bearer {key}",
            "Content-Type":  "application/json",
            "Prefer":        "resolution=merge-duplicates",
        },
    )

    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            if status in (200, 201):
                print(f"  ✅  {prompt_key} ({env_label})")
                return True
            else:
                body_resp = resp.read().decode()
                print(f"  ❌  {prompt_key} ({env_label}) — HTTP {status}: {body_resp}")
                return False
    except urllib.error.HTTPError as e:
        body_resp = e.read().decode()
        print(f"  ❌  {prompt_key} ({env_label}) — HTTP {e.code}: {body_resp}")
        return False
    except urllib.error.URLError as e:
        print(f"  ❌  {prompt_key} ({env_label}) — Network error: {e.reason}")
        return False


def run_for_env(env_name: str, dry_run: bool) -> bool:
    """Load credentials and upsert all prompts for one environment. Returns True if all succeeded."""
    label = f"{'[DRY RUN] ' if dry_run else ''}{env_name.upper()}"
    print(f"\n{'─' * 50}")
    print(f"  Environment: {label}")
    print(f"{'─' * 50}")

    if dry_run:
        # No network calls needed — skip credential loading
        url, key = "", ""
    else:
        url, key = load_credentials(env_name)
        print(f"  Supabase URL: {url}")

    all_ok = True
    for prompt in PROMPTS:
        ok = upsert_prompt(url, key, prompt, env_name, dry_run)
        if not ok:
            all_ok = False

    return all_ok


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Push ai_prompts rows to Supabase (Dev and/or Prod).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--env",
        choices=["dev", "prod", "both"],
        default="dev",
        help="Which database to update (default: dev)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what would be sent without making any writes",
    )
    args = parser.parse_args()

    dry_run = args.dry_run
    targets = ["dev", "prod"] if args.env == "both" else [args.env]

    print(f"\nupdate_prompts.py  |  {len(PROMPTS)} prompts  |  env={args.env}  |  dry_run={dry_run}")

    all_ok = True
    for env_name in targets:
        ok = run_for_env(env_name, dry_run)
        if not ok:
            all_ok = False

    print()
    if dry_run:
        print("Dry run complete — no changes were made.")
        print("Re-run without --dry-run to apply.")
    elif all_ok:
        print("All prompts updated successfully.")
        print("Remember to restart the dev server (or wait 5 min) to clear the prompt cache.")
    else:
        print("Some prompts failed to update. Check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
