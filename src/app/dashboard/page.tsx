import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { count: restaurantCount } = await supabase
    .from("restaurants")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: visitedCount } = await supabase
    .from("restaurants")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_visited", true);

  const { count: wishlistCount } = await supabase
    .from("restaurants")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_wishlist", true);

  const displayName =
    profile?.display_name || user.email?.split("@")[0] || "美食家";

  return (
    <DashboardClient
      displayName={displayName}
      restaurantCount={restaurantCount ?? 0}
      visitedCount={visitedCount ?? 0}
      wishlistCount={wishlistCount ?? 0}
    />
  );
}
