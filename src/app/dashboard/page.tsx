import { redirect } from "next/navigation";

// Dashboard has been merged into the map page.
// Keep this file so old /dashboard bookmarks redirect gracefully.
export default function DashboardPage() {
  redirect("/map");
}
