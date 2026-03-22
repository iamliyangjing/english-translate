import Link from "next/link";
import TranslatePanel from "@/components/TranslatePanel";

const quickLinks = [
  {
    title: "卡片库",
    description: "查看、编辑和导出你的翻译卡片。",
    href: "/cards",
  },
  {
    title: "复习模式",
    description: "按节奏翻面、评分，维持记忆曲线。",
    href: "/review",
  },
  {
    title: "模型配置",
    description: "切换模型、接口地址与 API Key。",
    href: "/profile",
  },
];

export default function AppHomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="grid gap-6 rounded-[32px] border border-black/10 bg-white/85 p-8 shadow-sm md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-400">
            Workspace
          </p>
          <h1 className="mt-3 font-serif text-4xl text-neutral-900 md:text-5xl">
            翻译工作台
          </h1>
          <p className="mt-4 max-w-2xl text-base text-neutral-600">
            在这里输入内容、完成翻译、保存卡片，并快速进入复习和卡片管理。
          </p>
        </div>
        <div className="grid gap-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-4 transition hover:bg-white"
            >
              <p className="text-sm font-medium text-neutral-900">{item.title}</p>
              <p className="mt-1 text-sm text-neutral-500">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <TranslatePanel />
    </main>
  );
}
