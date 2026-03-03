import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/restaurants — fetch all saved restaurants for the logged-in user
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[/api/restaurants GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("[/api/restaurants GET]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      address,
      lat,
      lng,
      cuisine_type,
      google_place_id,
      source_url,
      ai_description,
      rating,
      signature_dishes,
      ai_content,
    } = body;

    const basePayload = {
      user_id: user.id,
      name,
      address,
      lat,
      lng,
      cuisine_type,
      google_place_id,
      source_url,
      ai_description,
      rating,
      is_visited: false,
      is_wishlist: true,
    };

    // Attempt insert with new columns; fall back to base payload if columns
    // don't exist yet (migration not yet run — PostgreSQL error 42703)
    let { data, error } = await supabase
      .from("restaurants")
      .insert({ ...basePayload, signature_dishes: signature_dishes ?? null, ai_content: ai_content ?? null })
      .select()
      .single();

    if (error && (error.code === "42703" || error.message?.includes("column"))) {
      console.warn("[/api/restaurants POST] New columns not yet migrated, retrying without them");
      const retry = await supabase
        .from("restaurants")
        .insert(basePayload)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("[/api/restaurants POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/restaurants POST]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
