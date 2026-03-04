"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface MobileBottomBarProps {
  savedCount: number;
  onSavedClick: () => void;
  onSettingsClick: () => void;
}

export default function MobileBottomBar({
  savedCount,
  onSavedClick,
  onSettingsClick,
}: MobileBottomBarProps) {
  const router = useRouter();
  const { language } = useLanguage();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-2xl safe-area-pb">
      <div className="flex items-stretch h-16">

        {/* Explore */}
        <button
          onClick={() => router.push("/explore")}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-orange-500 active:text-orange-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[10px] font-semibold">
            {language === "zh" ? "探索" : "Explore"}
          </span>
        </button>

        <div className="w-px bg-gray-100 my-3" />

        {/* Saved */}
        <button
          onClick={onSavedClick}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-orange-500 active:text-orange-600 transition-colors"
        >
          <div className="relative">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {savedCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-orange-500 text-white text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 leading-none">
                {savedCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold">
            {language === "zh" ? "收藏" : "Saved"}
          </span>
        </button>

        <div className="w-px bg-gray-100 my-3" />

        {/* Settings */}
        <button
          onClick={onSettingsClick}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-orange-500 active:text-orange-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] font-semibold">
            {language === "zh" ? "设置" : "Setting"}
          </span>
        </button>

      </div>
    </div>
  );
}
