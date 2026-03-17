"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";

type Direction = "en-zh" | "zh-en";

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
  const [model, setModel] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const { status } = useSession();
  const isAuthed = status === "authenticated";

  const meta = directionMeta[direction];

  const canTranslate = text.trim().length > 0 && !loading;

  const canSave = useMemo(
    () => translation.trim().length > 0 && !saving,
    [translation, saving],
  );

  const STORAGE_KEY = "lingua-model";
  const ENDPOINT_KEY = "lingua-endpoint";
  const API_KEY_STORAGE = "lingua-api-key";

  const loadModel = () => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setModel(stored);
    }
  };

  const loadEndpoint = () => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(ENDPOINT_KEY);
    if (stored) {
      setApiEndpoint(stored);
    }
  };

  const loadApiKey = () => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(API_KEY_STORAGE);
    if (stored) {
      setApiKey(stored);
    }
  };

  const persistModel = (value: string) => {
    if (typeof window === "undefined") return;
    if (!value.trim()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, value);
  };

  const persistEndpoint = (value: string) => {
    if (typeof window === "undefined") return;
    if (!value.trim()) {
      window.localStorage.removeItem(ENDPOINT_KEY);
      return;
    }
    window.localStorage.setItem(ENDPOINT_KEY, value);
  };

  const persistApiKey = (value: string) => {
    if (typeof window === "undefined") return;
    if (!value.trim()) {
      window.sessionStorage.removeItem(API_KEY_STORAGE);
      return;
    }
    window.sessionStorage.setItem(API_KEY_STORAGE, value);
  };

  useEffect(() => {
    loadModel();
    loadEndpoint();
    loadApiKey();
  }, []);

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
          model: model.trim() || undefined,
          apiEndpoint: apiEndpoint.trim() || undefined,
          apiKey: apiKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "翻译失败，请稍后再试。");
        return;
      }
      setTranslation(data.translation);
    } catch (error) {
      setMessage("翻译失败，请检查网络。");
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
        setMessage(data.error ?? "保存失败。");
        return;
      }
      setMessage("已加入卡片库。");
    } catch (error) {
      setMessage("保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  };

  const handleSpeak = (content: string, lang: string) => {
    if (!content.trim()) return;
    if (!window.speechSynthesis) {
      setMessage("当前浏览器不支持语音播放。");
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
            双向翻译
          </p>
          <h1 className="font-serif text-3xl font-semibold text-neutral-900">
            让翻译变成可复习的卡片
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

      <div className="mt-6 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-3">
          <label className="text-sm text-neutral-500">
            输入 {meta.source}
          </label>
          <textarea
            className="min-h-[180px] w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-black/30"
            placeholder={`输入要翻译的${meta.source}内容`}
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
              播放原文
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm text-neutral-500">
            {meta.target} 译文
          </label>
          <div className="min-h-[180px] rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-base">
            {translation ? (
              <p className="whitespace-pre-wrap text-neutral-900">
                {translation}
              </p>
            ) : (
              <p className="text-neutral-400">译文将在这里展示</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleSpeak(translation, meta.targetTts)}
              className="rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5"
            >
              播放译文
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
          <label className="text-sm text-neutral-500">发音/备注（可选）</label>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
            placeholder="例如：/təˈmeɪtoʊ/"
            value={pronunciation}
            onChange={(event) => setPronunciation(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-neutral-500">标签（可选）</label>
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

      <div className="mt-6 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-neutral-600">
        <button
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="text-sm font-medium text-neutral-800"
          type="button"
        >
          {showAdvanced ? "收起高级设置" : "展开高级设置"}
        </button>
        {showAdvanced ? (
          <div className="mt-4 grid gap-4">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                模型配置（可选）
              </label>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
                placeholder="如 gpt-4o-mini"
                value={model}
                onChange={(event) => {
                  setModel(event.target.value);
                  persistModel(event.target.value);
                }}
              />
              <p className="mt-2 text-xs text-neutral-400">
                留空则使用服务器默认模型（OPENAI_MODEL）。
              </p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                API Endpoint（可选）
              </label>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
                placeholder="https://api.openai.com/v1/chat/completions"
                value={apiEndpoint}
                onChange={(event) => {
                  setApiEndpoint(event.target.value);
                  persistEndpoint(event.target.value);
                }}
              />
              <p className="mt-2 text-xs text-neutral-400">
                仅支持 OpenAI-compatible Chat Completions 格式。
              </p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                API Key（仅本地保存）
              </label>
              <input
                type="password"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
                placeholder="sk-..."
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  persistApiKey(event.target.value);
                }}
              />
              <p className="mt-2 text-xs text-neutral-400">
                存在浏览器会话中，刷新仍可用，关闭浏览器后清除。
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <Modal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        title="登录后才能保存卡片"
        description="登录后可保存翻译、导出 Anki、开始复习。"
        actions={
          <button
            onClick={() => signIn(undefined, { callbackUrl: window.location.href })}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            立即登录
          </button>
        }
      />
    </section>
  );
}
