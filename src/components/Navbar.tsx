"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

const navLinks = [
  { href: "/", label: "翻译" },
  { href: "/cards", label: "卡片库" },
  { href: "/review", label: "复习" },
];

export default function Navbar() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/10 bg-white/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
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
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {loading ? (
            <span className="text-neutral-500">加载中...</span>
          ) : session?.user ? (
            <>
              <span className="hidden text-neutral-600 sm:inline">
                {session.user.name ?? session.user.email ?? "已登录"}
              </span>
              <button
                onClick={() => signOut()}
                className="rounded-full border border-black/10 px-4 py-2 text-sm transition hover:border-black/20 hover:bg-black/5"
              >
                退出
              </button>
            </>
          ) : (
            <button
              onClick={() =>
                signIn(undefined, { callbackUrl: window.location.href })
              }
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80"
            >
              登录
            </button>
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
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
