"use client";

import { useI18n } from "@/components/LocaleProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/80 p-1 text-xs shadow-sm">
      <button
        onClick={() => setLocale("zh")}
        className={`rounded-full px-3 py-1.5 transition ${
          locale === "zh"
            ? "bg-neutral-950 text-white"
            : "text-neutral-600 hover:bg-black/5"
        }`}
        aria-pressed={locale === "zh"}
      >
        中文
      </button>
      <button
        onClick={() => setLocale("en")}
        className={`rounded-full px-3 py-1.5 transition ${
          locale === "en"
            ? "bg-neutral-950 text-white"
            : "text-neutral-600 hover:bg-black/5"
        }`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}
