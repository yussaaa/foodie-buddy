"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

interface DashboardClientProps {
  displayName: string;
  restaurantCount: number;
  visitedCount: number;
  wishlistCount: number;
}

export default function DashboardClient({
  displayName,
  restaurantCount,
  visitedCount,
  wishlistCount,
}: DashboardClientProps) {
  const { t } = useLanguage();

  return (
    <div className="p-8">
      {/* 欢迎语 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">
          {t.dashboard.greeting}，{displayName} 👋
        </h2>
        <p className="text-gray-500 mt-1">{t.dashboard.subtitle}</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="text-3xl mb-2">📍</div>
          <div className="text-2xl font-bold text-gray-800">{restaurantCount}</div>
          <div className="text-sm text-gray-500 mt-1">{t.dashboard.savedRestaurants}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-2xl font-bold text-gray-800">{visitedCount}</div>
          <div className="text-sm text-gray-500 mt-1">{t.dashboard.visited}</div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="text-3xl mb-2">🌟</div>
          <div className="text-2xl font-bold text-gray-800">{wishlistCount}</div>
          <div className="text-sm text-gray-500 mt-1">{t.dashboard.wishlist}</div>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 gap-4">
        <a
          href="/explore"
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl p-6 transition-colors"
        >
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="font-bold text-lg">{t.dashboard.exploreNew}</h3>
          <p className="text-orange-100 text-sm mt-1">{t.dashboard.exploreDesc}</p>
        </a>
        <a
          href="/map"
          className="bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl p-6 transition-colors shadow-sm"
        >
          <div className="text-4xl mb-3">🗺️</div>
          <h3 className="font-bold text-lg text-gray-800">{t.dashboard.viewMap}</h3>
          <p className="text-gray-400 text-sm mt-1">{t.dashboard.viewMapDesc}</p>
        </a>
        <a
          href="/nutrition"
          className="bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl p-6 transition-colors shadow-sm"
        >
          <div className="text-4xl mb-3">🥗</div>
          <h3 className="font-bold text-lg text-gray-800">{t.dashboard.nutrition}</h3>
          <p className="text-gray-400 text-sm mt-1">{t.dashboard.nutritionDesc}</p>
        </a>
        <a
          href="/diary"
          className="bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl p-6 transition-colors shadow-sm"
        >
          <div className="text-4xl mb-3">📖</div>
          <h3 className="font-bold text-lg text-gray-800">{t.dashboard.diary}</h3>
          <p className="text-gray-400 text-sm mt-1">{t.dashboard.diaryDesc}</p>
        </a>
      </div>
    </div>
  );
}
