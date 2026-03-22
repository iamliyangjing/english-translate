"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function LandingNavbar() {
  const { data: session, status } = useSession();
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
              界面预览
            </Link>
            <Link
              href="/#features"
              className="rounded-full px-3 py-1 transition hover:bg-black/5 hover:text-black"
            >
              产品亮点
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {loading ? (
            <span className="text-neutral-500">加载中...</span>
          ) : session?.user ? (
            <>
              <Link
                href="/profile"
                className="hidden rounded-full border border-black/10 px-4 py-2 text-neutral-600 transition hover:bg-black/5 sm:inline-flex"
              >
                {session.user.name ?? "个人页"}
              </Link>
              <Link
                href="/app"
                className="rounded-full bg-neutral-900 px-4 py-2 font-medium text-white transition hover:bg-neutral-800"
              >
                进入应用
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="rounded-full border border-black/10 px-4 py-2 text-neutral-700 transition hover:bg-black/5"
              >
                登录
              </Link>
              <Link
                href="/app"
                className="rounded-full bg-neutral-900 px-4 py-2 font-medium text-white transition hover:bg-neutral-800"
              >
                立即体验
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
