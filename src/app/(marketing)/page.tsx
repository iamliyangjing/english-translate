import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
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
              把翻译变成可复习的卡片
              <br />
              让英语学习更有节奏感
            </h1>
            <p className="text-base text-neutral-600">
              一次翻译，自动沉淀为卡片。随时复习、导出到 Anki，
              让你把输入变成真正掌握的内容。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/app"
                className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white"
              >
                进入应用
              </Link>
              <Link
                href="/signin"
                className="rounded-full border border-black/10 px-5 py-2 text-sm font-medium text-neutral-800"
              >
                登录同步学习记录
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="animate-float-slow rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                翻译示例
              </p>
              <p className="mt-3 text-sm text-neutral-700">
                “I want to build habits that actually stick.”
              </p>
              <div className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                “我想建立真正能坚持下去的习惯。”
              </div>
            </div>
            <div className="animate-shimmer rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                复习节奏
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-neutral-600">
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-center text-emerald-700">
                  今天
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-center text-amber-700">
                  3 天后
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-1 text-center text-sky-700">
                  7 天后
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
                产品界面
              </p>
              <h2 className="mt-3 font-serif text-2xl text-neutral-900">
                真实页面预览
              </h2>
            </div>
            <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              Preview
            </div>
          </div>
          <p className="mt-3 text-sm text-neutral-600">
            翻译、卡片库、复习流程都在一个产品里完成，保持专注。
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
        {[
          {
            title: "翻译 + 卡片一体化",
            desc: "翻译结果一键加入卡片库，省掉复制粘贴的碎片时间。",
          },
          {
            title: "轻量复习流程",
            desc: "正面/翻面/评分的最小流程，帮你保持复习节奏。",
          },
          {
            title: "随时导出 Anki",
            desc: "支持 CSV 导出，直接导入 Anki，延续你的复习习惯。",
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

      <section className="rounded-3xl border border-black/10 bg-neutral-900 p-8 text-white">
        <div className="grid gap-6 md:grid-cols-[1.3fr_0.7fr] md:items-center">
          <div>
            <h2 className="font-serif text-2xl">把每次翻译都变成长期记忆</h2>
            <p className="mt-3 text-sm text-neutral-200">
              现在就开始整理你的语言素材库，构建属于自己的复习体系。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/app"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900"
            >
              进入工作台
            </Link>
            <Link
              href="/signin"
              className="rounded-full border border-white/30 px-4 py-2 text-sm font-medium"
            >
              登录后继续学习
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
