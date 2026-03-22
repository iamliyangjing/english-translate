"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useI18n } from "@/components/LocaleProvider";

export default function SignInPage() {
  const { t } = useI18n();

  return (
    <main className="page-gradient mx-auto flex min-h-[72vh] w-full max-w-6xl items-center justify-center px-6 py-10">
      <section className="relative grid w-full max-w-3xl gap-6 rounded-[32px] border border-white/60 bg-white/60 p-8 shadow-[0_20px_80px_rgba(20,20,20,0.15)] backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="absolute -left-12 top-10 h-40 w-40 rounded-full bg-emerald-100/60" />
        <div className="absolute -right-10 bottom-12 h-32 w-32 rounded-full bg-amber-100/70" />

        <div className="relative flex flex-col justify-between gap-7">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
              LinguaCards
            </p>
            <h1 className="mt-4 font-serif text-3xl text-neutral-900 md:text-4xl">
              {t({ zh: "欢迎回来", en: "Welcome back" })}
            </h1>
            <p className="mt-3 text-sm text-neutral-600">
              {t({
                zh: "登录后即可保存卡片、同步复习节奏，并导出到 Anki。",
                en: "Sign in to save cards, sync your review rhythm, and export to Anki.",
              })}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
              {t({ zh: "OAuth 安全登录", en: "Secure OAuth sign in" })}
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t({ zh: "无密码存储", en: "No password storage" })}
            </div>
          </div>
          <div className="grid gap-3 rounded-2xl border border-black/10 bg-neutral-50/80 p-4 text-sm text-neutral-600">
            <div className="flex items-center justify-between">
              <span>{t({ zh: "卡片库", en: "Card library" })}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500">
                {t({ zh: "自动沉淀", en: "Auto capture" })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t({ zh: "复习节奏", en: "Review rhythm" })}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500">
                Adaptive
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t({ zh: "Anki 导出", en: "Anki export" })}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500">
                CSV
              </span>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col justify-center rounded-3xl border border-black/10 bg-white/90 p-5 shadow-sm">
          <div className="rounded-2xl bg-neutral-900 px-4 py-3 text-white">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">
              Sign in
            </p>
            <h2 className="mt-2 font-serif text-2xl">
              {t({ zh: "选择登录方式", en: "Choose a provider" })}
            </h2>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={() => signIn("github")}
              className="button-pulse rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              {t({ zh: "使用 GitHub 登录", en: "Continue with GitHub" })}
            </button>
            <button
              onClick={() => signIn("google")}
              className="rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:bg-black/5"
            >
              {t({ zh: "使用 Google 登录", en: "Continue with Google" })}
            </button>
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            {t({
              zh: "登录即表示你同意使用本产品提供的学习记录服务。",
              en: "By signing in, you agree to use the learning record service provided by this product.",
            })}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-black/10 px-4 py-2 text-xs text-neutral-600 transition hover:bg-black/5"
          >
            {t({ zh: "返回首页", en: "Back to home" })}
          </Link>
        </div>
      </section>
    </main>
  );
}
