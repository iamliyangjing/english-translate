"use client";

import { signIn } from "next-auth/react";

type LoginPromptProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
};

export default function LoginPrompt({
  title = "登录后继续使用",
  description = "登录后可保存卡片、复习进度并导出到 Anki。",
  actionLabel = "使用 GitHub 登录",
}: LoginPromptProps) {
  return (
    <section className="rounded-3xl border border-black/10 bg-white/90 p-8 text-center shadow-sm">
      <h2 className="font-serif text-2xl text-neutral-900">{title}</h2>
      <p className="mt-3 text-sm text-neutral-600">{description}</p>
      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={() => signIn("github", { callbackUrl: window.location.href })}
          className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          {actionLabel}
        </button>
        <button
          onClick={() => signIn("google", { callbackUrl: window.location.href })}
          className="rounded-full border border-black/10 px-5 py-2 text-sm font-medium text-neutral-700 transition hover:bg-black/5"
        >
          使用 Google 登录
        </button>
      </div>
    </section>
  );
}
