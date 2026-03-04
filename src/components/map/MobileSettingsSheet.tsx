"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { createClient } from "@/lib/supabase/client";

const OPENAI_KEY_STORAGE = "fb-openai-key";

interface MobileSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSettingsSheet({ isOpen, onClose }: MobileSettingsSheetProps) {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const [openaiKey, setOpenaiKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(OPENAI_KEY_STORAGE) ?? "";
    setOpenaiKey(saved);
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem(OPENAI_KEY_STORAGE, openaiKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl
          transition-transform duration-300 ease-out safe-area-pb
          ${isOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-1 pb-4 flex items-center justify-between border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-base">
            {language === "zh" ? "设置" : "Settings"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-500 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">

          {/* Language */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {language === "zh" ? "语言" : "Language"}
            </p>
            <div className="flex bg-gray-100 rounded-xl p-1 w-fit gap-1">
              <button
                onClick={() => setLanguage("zh")}
                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                  language === "zh"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                  language === "en"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* OpenAI API Key */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                OpenAI API Key
              </p>
              <span className="text-[9px] bg-orange-100 text-orange-500 font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                {language === "zh" ? "实验性" : "Beta"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-2.5">
              {language === "zh"
                ? "可选。填写后将使用您自己的 Key 进行 AI 搜索。"
                : "Optional. Your key will be used for AI-powered search."}
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => {
                  setOpenaiKey(e.target.value);
                  setKeySaved(false);
                }}
                placeholder="sk-..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
              />
              <button
                onClick={handleSaveKey}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  keySaved
                    ? "bg-green-500 text-white"
                    : "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700"
                }`}
              >
                {keySaved
                  ? language === "zh" ? "✓ 已保存" : "✓ Saved"
                  : language === "zh" ? "保存" : "Save"}
              </button>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
          >
            <span>👋</span>
            {language === "zh" ? "退出登录" : "Logout"}
          </button>

        </div>
      </div>
    </>
  );
}
