import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH /api/restaurants/[id] — update user annotation fields for a saved restaurant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Only allow updating these annotation fields
    const allowedFields = [
      "user_rating",
      "want_to_revisit",
      "visited_at",
      "is_visited",
      "notes",
    ];

    const update = Object.fromEntries(
      Object.entries(body as Record<string, unknown>).filter(([k]) =>
        allowedFields.includes(k)
      )
    );

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "no_valid_fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("restaurants")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("[/api/restaurants/:id PATCH]", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/restaurants/:id PATCH]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
