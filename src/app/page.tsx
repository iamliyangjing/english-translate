import TranslatePanel from "@/components/TranslatePanel";
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <TranslatePanel />

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "把翻译变成卡片",
            desc: "一键把翻译内容保存到卡片库，随时复习。",
          },
          {
            title: "导出 Anki",
            desc: "CSV 格式导出，导入 Anki 即可复习。",
          },
          {
            title: "站内复习",
            desc: "轻量复习流程，复习节奏刚刚好。",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm"
          >
            <h3 className="font-serif text-xl text-neutral-900">
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-neutral-600">{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col items-start gap-3 rounded-3xl border border-black/10 bg-neutral-900 p-6 text-white">
        <h2 className="font-serif text-2xl">下一步</h2>
        <p className="text-sm text-neutral-200">
          去卡片库管理内容，或者直接开始站内复习。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/cards"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900"
          >
            去卡片库
          </Link>
          <Link
            href="/review"
            className="rounded-full border border-white/30 px-4 py-2 text-sm font-medium"
          >
            开始复习
          </Link>
        </div>
      </section>
    </main>
  );
}
