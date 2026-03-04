import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

// Always server-render: page calls createServerClient() which needs cookies & Supabase env vars
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 已登录直接跳地图（主功能页）
  if (user) redirect("/map");

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-lg space-y-6">
        <div className="text-7xl">🍜</div>
        <h1 className="text-5xl font-bold text-orange-600">Foodie Buddy</h1>
        <p className="text-gray-500 text-xl">你的私人美食探索伙伴</p>

        <div className="grid grid-cols-2 gap-3 text-left mt-8">
          {[
            { icon: "🗺️", text: "在地图上标注收藏餐厅" },
            { icon: "🔍", text: "AI 解读任意餐厅菜系" },
            { icon: "🥗", text: "一键分析菜式营养成分" },
            { icon: "📖", text: "记录你的美食旅程" },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sm text-gray-600">{item.text}</span>
            </div>
          ))}
        </div>

        <Link
          href="/login"
          className="inline-block mt-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-10 py-4 rounded-2xl text-lg transition-colors shadow-lg shadow-orange-200"
        >
          开始探索 →
        </Link>
      </div>
    </main>
  );
}
