"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Modal from "@/components/Modal";

type Direction = "en-zh" | "zh-en";

type ModelConfig = {
  id: string;
  isActive: boolean;
};

const directionMeta = {
  "en-zh": {
    source: "English",
    target: "Chinese",
    sourceTts: "en-US",
    targetTts: "zh-CN",
  },
  "zh-en": {
    source: "Chinese",
    target: "English",
    sourceTts: "zh-CN",
    targetTts: "en-US",
  },
} as const;

export default function TranslatePanel() {
  const [direction, setDirection] = useState<Direction>("en-zh");
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);

  const { status } = useSession();
  const isAuthed = status === "authenticated";

  const meta = directionMeta[direction];

  const canTranslate = text.trim().length > 0 && !loading;

  const canSave = useMemo(
    () => translation.trim().length > 0 && !saving,
    [translation, saving],
  );

  useEffect(() => {
    if (!isAuthed) {
      setHasConfig(null);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch("/api/profile/model-configs");
        const data = await res.json();
        if (!res.ok) {
          setHasConfig(false);
          return;
        }
        const configs = (data.configs ?? []) as ModelConfig[];
        setHasConfig(configs.length > 0);
      } catch {
        setHasConfig(false);
      }
    };

    load();
  }, [isAuthed]);

  const handleTranslate = async () => {
    if (!canTranslate) return;
    setLoading(true);
    setMessage(null);
    setTranslation("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          sourceLang: meta.source,
          targetLang: meta.target,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "翻译失败，请稍后再试。");
        return;
      }
      setTranslation(data.translation);
    } catch {
      setMessage("翻译失败，请检查网络或配置。");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    if (!isAuthed) {
      setLoginOpen(true);
      return;
    }
    if (!canSave) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: text,
          targetText: translation,
          sourceLang: meta.source,
          targetLang: meta.target,
          pronunciation,
          tags,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "保存卡片失败。" );
        return;
      }
      setMessage("已加入卡片库。" );
    } catch {
      setMessage("保存卡片失败，请稍后再试。" );
    } finally {
      setSaving(false);
    }
  };

  const handleSpeak = (content: string, lang: string) => {
    if (!content.trim()) return;
    if (!window.speechSynthesis) {
      setMessage("当前浏览器不支持语音朗读。");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">
            翻译
          </p>
          <h1 className="font-serif text-3xl font-semibold text-neutral-900">
            输入内容，一键翻译并存入卡片库
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            className="rounded-full border border-black/10 px-4 py-2 transition hover:bg-black/5"
            onClick={() =>
              setDirection(direction === "en-zh" ? "zh-en" : "en-zh")
            }
          >
            {meta.source} → {meta.target}
          </button>
        </div>
      </div>

      {!isAuthed ? (
        <div className="mt-4 rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
          登录后可在个人页配置模型与 API Key。
        </div>
      ) : hasConfig === false ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <span>你还没有模型配置，请前往个人页添加并设为当前配置。</span>
          <a
            href="/profile"
            className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
          >
            去配置
          </a>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-3">
          <label className="text-sm text-neutral-500">
            原文 {meta.source}
          </label>
          <textarea
            className="min-h-[180px] w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-black/30"
            placeholder={`输入需要翻译的 ${meta.source} 内容`}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTranslate}
              disabled={!canTranslate}
              className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              {loading ? "翻译中..." : "开始翻译"}
            </button>
            <button
              onClick={() => handleSpeak(text, meta.sourceTts)}
              className="rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5"
            >
              朗读原文
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm text-neutral-500">
            译文 {meta.target}
          </label>
          <div className="min-h-[180px] rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-base">
            {translation ? (
              <p className="whitespace-pre-wrap text-neutral-900">
                {translation}
              </p>
            ) : (
              <p className="text-neutral-400">翻译结果会显示在这里</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleSpeak(translation, meta.targetTts)}
              className="rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5"
            >
              朗读译文
            </button>
            <button
              onClick={handleAddCard}
              disabled={!canSave}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {saving ? "保存中..." : "加入卡片库"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm text-neutral-500">发音 / 音标</label>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
            placeholder="例如 /ˈtrævəl/"
            value={pronunciation}
            onChange={(event) => setPronunciation(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-neutral-500">标签</label>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
            placeholder="travel, business, daily"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl bg-black/5 px-4 py-3 text-sm text-neutral-700">
          {message}
        </p>
      ) : null}

      <Modal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        title="登录后才能保存卡片"
        description="登录后可将翻译结果保存到卡片库，并同步到 Anki 复习。"
        actions={
          <button
            onClick={() => signIn(undefined, { callbackUrl: window.location.href })}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            去登录
          </button>
        }
      />
    </section>
  );
}
