"use client";

import Link from "next/link";
import TranslatePanel from "@/components/TranslatePanel";
import { useI18n } from "@/components/LocaleProvider";

export default function AppHomePage() {
  const { t } = useI18n();

  const quickLinks = [
    {
      title: t({ zh: "卡片库", en: "Card library" }),
      description: t({
        zh: "按卡组、收藏、归档和标签管理你的卡片。",
        en: "Manage decks, favorites, archived cards, and tags in one place.",
      }),
      href: "/cards",
    },
    {
      title: t({ zh: "复习流程", en: "Review flow" }),
      description: t({
        zh: "进入自适应复习节奏，继续巩固今天该学的内容。",
        en: "Jump into the adaptive review loop and keep today’s memory work moving.",
      }),
      href: "/review",
    },
    {
      title: t({ zh: "模型配置", en: "Model settings" }),
      description: t({
        zh: "切换模型、接口地址和密钥配置。",
        en: "Switch models, API endpoints, and keys before your next translation batch.",
      }),
      href: "/profile",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
      <section className="grid gap-6 rounded-[34px] border border-black/10 bg-white/88 p-8 shadow-sm md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-400">
            {t({ zh: "工作台", en: "Workspace" })}
          </p>
          <h1 className="mt-3 font-serif text-4xl text-neutral-900 md:text-5xl">
            {t({ zh: "翻译工作台", en: "Translation workspace" })}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600">
            {t({
              zh: "在这里输入内容、完成翻译、丰富卡片信息，并把它们组织到不同卡组中。",
              en: "Translate new phrases, enrich each card with notes and context, and route everything into focused decks.",
            })}
          </p>
        </div>
        <div className="grid gap-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-4 transition hover:bg-white"
            >
              <p className="text-sm font-medium text-neutral-900">{item.title}</p>
              <p className="mt-1 text-sm text-neutral-500">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <TranslatePanel />
    </main>
  );
}
