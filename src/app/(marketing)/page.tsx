"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/components/LocaleProvider";

export default function LandingPage() {
  const { t } = useI18n();

  const features = [
    {
      title: t({ zh: "翻译与卡片一体化", en: "Translation and cards in one flow" }),
      desc: t({
        zh: "翻译完成后立即沉淀成卡片，不再来回复制粘贴。",
        en: "Turn each translation into a reusable study card without copy-paste friction.",
      }),
    },
    {
      title: t({ zh: "轻量复习节奏", en: "Focused review rhythm" }),
      desc: t({
        zh: "用更专注的复习界面保持记忆节奏，不被复杂操作打断。",
        en: "Keep a steady memory loop with a focused review flow that stays out of the way.",
      }),
    },
    {
      title: t({ zh: "可导出到 Anki", en: "Export to Anki anytime" }),
      desc: t({
        zh: "支持 CSV 导出，方便继续在你熟悉的工具里学习。",
        en: "Export as CSV whenever you want to continue studying in Anki.",
      }),
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
      <section className="relative overflow-hidden rounded-[32px] border border-black/10 bg-white/80 p-10 shadow-sm">
        <div className="absolute -left-24 -top-24 h-60 w-60 rounded-full bg-[radial-gradient(circle,_rgba(29,107,90,0.25)_0%,_rgba(29,107,90,0)_70%)]" />
        <div className="absolute -right-20 top-10 h-52 w-52 rounded-full bg-[radial-gradient(circle,_rgba(240,162,2,0.35)_0%,_rgba(240,162,2,0)_70%)]" />
        <div className="relative grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div className="space-y-5">
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              LinguaCards
            </p>
            <h1 className="font-serif text-4xl font-semibold text-neutral-900 md:text-5xl">
              {t({
                zh: "把翻译变成可复习的卡片，让语言学习更有节奏",
                en: "Turn translation into reviewable cards and make language study stick",
              })}
            </h1>
            <p className="text-base text-neutral-600">
              {t({
                zh: "一次翻译，自动沉淀成卡片。随时复习、导出到 Anki，把输入真正变成长期记忆。",
                en: "Translate once, save it as a card, review it later, and export to Anki when you need it.",
              })}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/app"
                className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white"
              >
                {t({ zh: "进入应用", en: "Open app" })}
              </Link>
              <Link
                href="/signin"
                className="rounded-full border border-black/10 px-5 py-2 text-sm font-medium text-neutral-800"
              >
                {t({ zh: "登录并同步学习记录", en: "Sign in to sync your progress" })}
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="animate-float-slow rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                {t({ zh: "翻译示例", en: "Translation sample" })}
              </p>
              <p className="mt-3 text-sm text-neutral-700">
                “I want to build habits that actually stick.”
              </p>
              <div className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                {t({
                  zh: "“我想建立真正能坚持下去的习惯。”",
                  en: '"I want to build habits that actually stick."',
                })}
              </div>
            </div>
            <div className="animate-shimmer rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                {t({ zh: "复习节奏", en: "Review rhythm" })}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-neutral-600">
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-center text-emerald-700">
                  {t({ zh: "今天", en: "Today" })}
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-center text-amber-700">
                  {t({ zh: "3 天后", en: "In 3 days" })}
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-1 text-center text-sky-700">
                  {t({ zh: "7 天后", en: "In 7 days" })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="preview"
        className="grid gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center"
      >
        <div className="rounded-[28px] border border-black/10 bg-white/80 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                {t({ zh: "产品界面", en: "Product view" })}
              </p>
              <h2 className="mt-3 font-serif text-2xl text-neutral-900">
                {t({ zh: "真实页面预览", en: "A look at the real workspace" })}
              </h2>
            </div>
            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              Preview
            </div>
          </div>
          <p className="mt-3 text-sm text-neutral-600">
            {t({
              zh: "翻译、卡片库和复习流程都在同一个产品里完成，减少上下文切换。",
              en: "Translate, organize cards, and review in one product without bouncing between tools.",
            })}
          </p>
        </div>
        <div className="relative">
          <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-emerald-100/70" />
          <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-amber-100/80" />
          <Image
            src="/landing-shot.svg"
            alt="LinguaCards screenshot"
            width={1200}
            height={800}
            className="relative rounded-[28px] border border-black/10 bg-white/90 shadow-lg"
          />
        </div>
      </section>

      <section id="features" className="grid gap-6 md:grid-cols-3">
        {features.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm"
          >
            <h3 className="font-serif text-xl text-neutral-900">{item.title}</h3>
            <p className="mt-2 text-sm text-neutral-600">{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-black/10 bg-neutral-900 p-8 text-white">
        <div className="grid gap-6 md:grid-cols-[1.3fr_0.7fr] md:items-center">
          <div>
            <h2 className="font-serif text-2xl">
              {t({
                zh: "把每次翻译都变成长效记忆",
                en: "Turn every translation into long-term memory",
              })}
            </h2>
            <p className="mt-3 text-sm text-neutral-200">
              {t({
                zh: "从现在开始整理你的语言素材库，建立属于自己的复习系统。",
                en: "Start organizing your language material and build a review system that belongs to you.",
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/app"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900"
            >
              {t({ zh: "进入工作台", en: "Open workspace" })}
            </Link>
            <Link
              href="/signin"
              className="rounded-full border border-white/30 px-4 py-2 text-sm font-medium"
            >
              {t({ zh: "登录后继续学习", en: "Sign in to continue" })}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
