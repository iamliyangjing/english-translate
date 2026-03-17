"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white/90 p-8 text-center shadow-sm">
        <h1 className="font-serif text-3xl text-neutral-900">欢迎回来</h1>
        <p className="mt-3 text-sm text-neutral-600">
          选择一个方式登录，继续你的学习。
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => signIn("github")}
            className="rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            使用 GitHub 登录
          </button>
        </div>
        <Link
          href="/"
          className="mt-6 inline-block text-xs text-neutral-500 hover:text-neutral-700"
        >
          返回首页
        </Link>
      </div>
    </main>
  );
}
