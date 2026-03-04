"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Restaurant } from "@/types";

// ── 迷你统计 widget（仅桌面侧边栏） ──────────────────────────
function SidebarStats({ language }: { language: "zh" | "en" }) {
  const [counts, setCounts] = useState<{ all: number; visited: number; wishlist: number } | null>(null);

  useEffect(() => {
    fetch("/api/restaurants")
      .then((r) => r.json())
      .then((data: Restaurant[]) =>
        setCounts({
          all: data.length,
          visited: data.filter((r) => r.is_visited).length,
          wishlist: data.filter((r) => !r.is_visited).length,
        })
      )
      .catch(() => {});
  }, []);

  const n = (v?: number) => (v != null ? String(v) : "—");

  const stats = [
    { emoji: "📍", value: n(counts?.all),     label: language === "zh" ? "地点" : "Places",  bg: "bg-orange-50" },
    { emoji: "✅", value: n(counts?.visited),  label: language === "zh" ? "已探访" : "Visited", bg: "bg-green-50"  },
    { emoji: "🌟", value: n(counts?.wishlist), label: language === "zh" ? "心愿单" : "Wishlist", bg: "bg-yellow-50" },
  ];

  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <div className="grid grid-cols-3 gap-2">
        {stats.map(({ emoji, value, label, bg }) => (
          <div key={label} className={`flex flex-col items-center ${bg} rounded-xl py-2.5 gap-0.5`}>
            <span className="text-base leading-none">{emoji}</span>
            <span className="text-lg font-bold text-gray-800 leading-tight">{value}</span>
            <span className="text-[10px] text-gray-400 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // 点击设置面板外部自动关闭
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  const navItems = [
    { href: "/map", icon: "🗺️", label: t.nav.map },
    { href: "/explore", icon: "🔍", label: t.nav.explore },
    { href: "/nutrition", icon: "🥗", label: t.nav.nutrition, comingSoon: true },
    { href: "/diary", icon: "📖", label: t.nav.diary, comingSoon: true },
  ];

  const handleLogout = async () => {
    // Instantiate lazily — only when the user actually clicks logout,
    // never during SSR / static pre-render at build time.
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* ── Desktop Sidebar (hidden on mobile) ──────────────────── */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍜</span>
            <div>
              <h1 className="font-bold text-orange-600 text-lg leading-tight">
                Foodie Buddy
              </h1>
              <p className="text-xs text-gray-400">{t.landing.tagline}</p>
            </div>
          </div>
        </div>

        {/* Mini stats */}
        <SidebarStats language={language} />

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            if (item.comingSoon) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 cursor-not-allowed select-none"
                >
                  <span className="text-xl opacity-40">{item.icon}</span>
                  <span>{item.label}</span>
                  <span className="ml-auto text-[10px] font-semibold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    即将推出
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Settings gear + Logout */}
        <div className="p-4 border-t border-gray-100 space-y-1">
          {/* Settings button */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all"
            >
              {/* Gear icon */}
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {language === "zh" ? "设置" : "Settings"}
            </button>

            {/* Settings dropdown */}
            {settingsOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
                {/* Profile */}
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {language === "zh" ? "个人资料" : "Profile"}
                </button>

                {/* Language */}
                <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-50">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
                    <button
                      onClick={() => setLanguage("zh")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        language === "zh"
                          ? "bg-white text-orange-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      中文
                    </button>
                    <button
                      onClick={() => setLanguage("en")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        language === "en"
                          ? "bg-white text-orange-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all"
          >
            <span className="text-xl">👋</span>
            {t.nav.logout}
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Navigation Bar ────────────────────────── */}
      {/* Hidden on /map — replaced by the Google Maps-style MobileBottomBar */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-gray-100 safe-area-pb${pathname === "/map" ? " hidden" : ""}`}>
        <div className="flex items-center px-1 py-1">
          {navItems.filter((item) => !item.comingSoon).map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center min-w-0"
              >
                <span
                  className={`flex flex-col items-center gap-0.5 w-full rounded-xl py-1.5 px-1 transition-all ${
                    isActive
                      ? "bg-orange-50 text-orange-500"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <span className="text-[22px] leading-none">{item.icon}</span>
                  <span className="text-[9px] font-semibold w-full text-center truncate">
                    {item.label}
                  </span>
                </span>
              </Link>
            );
          })}

          {/* Settings — tap to switch language (hold for more later) */}
          <button
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            className="flex flex-col items-center justify-center px-2"
          >
            <span className="flex flex-col items-center gap-0.5 rounded-xl py-1.5 px-2 bg-gray-100 transition-all hover:bg-orange-50">
              <svg className="w-[20px] h-[20px] text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[9px] font-bold text-orange-500">
                {language === "zh" ? "设置" : "Setting"}
              </span>
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
