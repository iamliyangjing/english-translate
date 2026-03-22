"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/components/LocaleProvider";

export default function LandingNavbar() {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const loading = status === "loading";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/10 bg-[rgba(246,244,239,0.82)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-semibold tracking-tight text-black">
            LinguaCards
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-neutral-600 md:flex">
            <Link
              href="/#preview"
              className="rounded-full px-3 py-1 transition hover:bg-black/5 hover:text-black"
            >
              {t({ zh: "界面预览", en: "Preview" })}
            </Link>
            <Link
              href="/#features"
              className="rounded-full px-3 py-1 transition hover:bg-black/5 hover:text-black"
            >
              {t({ zh: "产品亮点", en: "Features" })}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <LanguageSwitcher />
          {loading ? (
            <span className="text-neutral-500">
              {t({ zh: "加载中...", en: "Loading..." })}
            </span>
          ) : session?.user ? (
            <>
              <Link
                href="/profile"
                className="hidden rounded-full border border-black/10 px-4 py-2 text-neutral-600 transition hover:bg-black/5 sm:inline-flex"
              >
                {session.user.name ?? t({ zh: "个人页", en: "Profile" })}
              </Link>
              <Link
                href="/app"
                className="rounded-full bg-neutral-900 px-4 py-2 font-medium text-white transition hover:bg-neutral-800"
              >
                {t({ zh: "进入应用", en: "Open app" })}
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="rounded-full border border-black/10 px-4 py-2 text-neutral-700 transition hover:bg-black/5"
              >
                {t({ zh: "登录", en: "Sign in" })}
              </Link>
              <Link
                href="/app"
                className="rounded-full bg-neutral-900 px-4 py-2 font-medium text-white transition hover:bg-neutral-800"
              >
                {t({ zh: "立即体验", en: "Try now" })}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
