"use client";

import { signIn } from "next-auth/react";

type LoginPromptProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
};

export default function LoginPrompt({
  title = "需要登录才能继续",
  description = "登录后可保存卡片、导出 Anki、开始复习。",
  actionLabel = "使用 GitHub / Google 登录",
}: LoginPromptProps) {
  return (
    <section className="rounded-3xl border border-black/10 bg-white/90 p-8 text-center shadow-sm">
      <h2 className="font-serif text-2xl text-neutral-900">{title}</h2>
      <p className="mt-3 text-sm text-neutral-600">{description}</p>
      <button
        onClick={() => signIn(undefined, { callbackUrl: window.location.href })}
        className="mt-6 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
      >
        {actionLabel}
      </button>
    </section>
  );
}
