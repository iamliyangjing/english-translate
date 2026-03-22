"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/components/LocaleProvider";

const navLinks = [
  { href: "/app", label: { zh: "工作台", en: "Workspace" } },
  { href: "/cards", label: { zh: "卡片库", en: "Cards" } },
  { href: "/review", label: { zh: "复习", en: "Review" } },
  { href: "/profile", label: { zh: "个人页", en: "Profile" } },
];

export default function AppNavbar() {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const loading = status === "loading";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/10 bg-white/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link
            href="/app"
            className="text-xl font-semibold tracking-tight text-black"
          >
            LinguaCards
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-neutral-600 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1 transition hover:bg-black/5 hover:text-black"
              >
                {t(link.label)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <LanguageSwitcher />
          {loading ? (
            <span className="text-neutral-500">
              {t({ zh: "加载中...", en: "Loading..." })}
            </span>
          ) : session?.user ? (
            <>
              <Link
                href="/profile"
                className="hidden items-center gap-2 rounded-full px-3 py-1 text-sm text-neutral-600 transition hover:bg-black/5 hover:text-black sm:inline-flex"
              >
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt="avatar"
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10 text-xs font-semibold text-neutral-700">
                    {(session.user.name ?? session.user.email ?? "U")
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                )}
                <span>
                  {session.user.name ??
                    session.user.email ??
                    t({ zh: "未命名用户", en: "Unnamed user" })}
                </span>
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-full border border-black/10 px-4 py-2 text-sm transition hover:border-black/20 hover:bg-black/5"
              >
                {t({ zh: "退出登录", en: "Sign out" })}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  signIn("github", { callbackUrl: window.location.href })
                }
                className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80"
              >
                {t({ zh: "GitHub 登录", en: "GitHub sign in" })}
              </button>
              <button
                onClick={() =>
                  signIn("google", { callbackUrl: window.location.href })
                }
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-black/5"
              >
                {t({ zh: "Google 登录", en: "Google sign in" })}
              </button>
            </div>
          )}
        </div>
      </div>
      <nav className="flex items-center gap-3 border-t border-black/5 px-6 py-3 text-xs text-neutral-600 md:hidden">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full px-2 py-1 transition hover:bg-black/5 hover:text-black"
          >
            {t(link.label)}
          </Link>
        ))}
      </nav>
    </header>
  );
}
