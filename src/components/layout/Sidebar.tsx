"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();

  const navItems = [
    { href: "/dashboard", icon: "🏠", label: t.nav.home },
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

        {/* Bottom: Language toggle + Logout */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-2 px-4 py-2">
            <span className="text-gray-400 text-xs">🌐</span>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-gray-100 safe-area-pb">
        <div className="flex items-center px-1 py-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            if (item.comingSoon) {
              return (
                <div
                  key={item.href}
                  className="flex-1 flex flex-col items-center justify-center min-w-0 cursor-not-allowed"
                >
                  <span className="flex flex-col items-center gap-0.5 w-full rounded-xl py-1.5 px-1 opacity-30">
                    <span className="text-[22px] leading-none">{item.icon}</span>
                    <span className="text-[9px] font-semibold w-full text-center truncate text-gray-400">
                      {item.label}
                    </span>
                  </span>
                </div>
              );
            }

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

          {/* Language toggle — single tap to switch */}
          <button
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            className="flex flex-col items-center justify-center px-2"
          >
            <span className="flex flex-col items-center gap-0.5 rounded-xl py-1.5 px-2 bg-gray-100 transition-all hover:bg-orange-50">
              <span className="text-[20px] leading-none">🌐</span>
              <span className="text-[9px] font-bold text-orange-500">
                {language === "zh" ? "EN" : "中"}
              </span>
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
