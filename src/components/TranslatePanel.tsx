"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useI18n } from "@/components/LocaleProvider";
import Modal from "@/components/Modal";
import { DEFAULT_DECK_NAME } from "@/lib/card-import";

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
  const [deckName, setDeckName] = useState(DEFAULT_DECK_NAME);
  const [notes, setNotes] = useState("");
  const [exampleSentence, setExampleSentence] = useState("");
  const [sourceContext, setSourceContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);

  const { status } = useSession();
  const { t } = useI18n();
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
        const response = await fetch("/api/profile/model-configs");
        const data = (await response.json()) as { configs?: ModelConfig[] };
        if (!response.ok) {
          setHasConfig(false);
          return;
        }
        setHasConfig((data.configs ?? []).length > 0);
      } catch {
        setHasConfig(false);
      }
    };

    void load();
  }, [isAuthed]);

  const handleTranslate = async () => {
    if (!canTranslate) return;

    setLoading(true);
    setMessage(null);
    setTranslation("");

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          sourceLang: meta.source,
          targetLang: meta.target,
        }),
      });
      const data = (await response.json()) as {
        translation?: string;
        error?: string;
      };

      if (!response.ok) {
        setMessage(
          data.error ??
            t({
              zh: "翻译失败，请稍后重试。",
              en: "Translation failed. Please try again.",
            }),
        );
        return;
      }

      setTranslation(data.translation ?? "");
    } catch {
      setMessage(
        t({
          zh: "翻译失败，请检查网络或模型配置。",
          en: "Translation failed. Check your network or model settings.",
        }),
      );
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
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: text,
          targetText: translation,
          sourceLang: meta.source,
          targetLang: meta.target,
          pronunciation,
          tags,
          deckName,
          notes,
          exampleSentence,
          sourceContext,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(
          data.error ??
            t({ zh: "保存卡片失败。", en: "Failed to save card." }),
        );
        return;
      }

      setMessage(
        t({ zh: "卡片已保存到卡片库。", en: "Card saved to your library." }),
      );
    } catch {
      setMessage(
        t({ zh: "保存卡片失败，请稍后重试。", en: "Failed to save card. Please try again." }),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSpeak = (content: string, lang: string) => {
    if (!content.trim()) return;

    if (!window.speechSynthesis) {
      setMessage(
        t({
          zh: "当前浏览器不支持语音朗读。",
          en: "Speech playback is not supported in this browser.",
        }),
      );
      return;
    }

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <section className="rounded-[34px] border border-black/10 bg-white/90 p-6 shadow-sm backdrop-blur md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-neutral-400">
            {t({ zh: "翻译", en: "Translate" })}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-neutral-900">
            {t({
              zh: "翻译、补充信息并保存成复习卡片",
              en: "Translate, enrich, and save study-ready cards",
            })}
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            {t({
              zh: "在翻译完成的当下补充卡组、例句、上下文和备注，后续复习会轻松很多。",
              en: "Add deck placement, examples, context, and notes while the translation is still fresh.",
            })}
          </p>
        </div>

        <button
          className="rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5"
          onClick={() =>
            setDirection(direction === "en-zh" ? "zh-en" : "en-zh")
          }
        >
          {meta.source} to {meta.target}
        </button>
      </div>

      {!isAuthed ? (
        <div className="mt-4 rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
          {t({
            zh: "登录后可在个人页配置模型，并把翻译保存到你的学习空间。",
            en: "Sign in to configure a model in your profile and save translations to your study library.",
          })}
        </div>
      ) : hasConfig === false ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <span>
            {t({
              zh: "你还没有可用的模型配置，请先到个人页添加并启用。",
              en: "You do not have an active model configuration yet. Add one in your profile first.",
            })}
          </span>
          <a
            href="/profile"
            className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
          >
            {t({ zh: "打开个人页", en: "Open profile" })}
          </a>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3 rounded-[28px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,247,242,0.95))] p-5">
          <label className="text-sm text-neutral-500">
            {t({ zh: "原文", en: "Source" })} {meta.source}
          </label>
          <textarea
            className="min-h-[220px] w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base shadow-sm outline-none transition focus:border-black/30"
            placeholder={t({
              zh: `输入需要翻译的 ${meta.source} 内容`,
              en: `Enter ${meta.source} text to translate`,
            })}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTranslate}
              disabled={!canTranslate}
              className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              {loading
                ? t({ zh: "翻译中...", en: "Translating..." })
                : t({ zh: "开始翻译", en: "Translate" })}
            </button>
            <button
              onClick={() => handleSpeak(text, meta.sourceTts)}
              className="rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5"
            >
              {t({ zh: "朗读原文", en: "Play source" })}
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-[28px] border border-black/10 bg-[linear-gradient(180deg,rgba(248,250,251,0.96),rgba(255,255,255,0.94))] p-5">
          <label className="text-sm text-neutral-500">
            {t({ zh: "译文", en: "Result" })} {meta.target}
          </label>
          <div className="min-h-[220px] rounded-2xl border border-black/10 bg-white px-4 py-3 text-base shadow-sm">
            {translation ? (
              <p className="whitespace-pre-wrap leading-8 text-neutral-900">
                {translation}
              </p>
            ) : (
              <p className="text-neutral-400">
                {t({
                  zh: "翻译结果会显示在这里",
                  en: "Your translated result will appear here.",
                })}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleSpeak(translation, meta.targetTts)}
              className="rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5"
            >
              {t({ zh: "朗读译文", en: "Play translation" })}
            </button>
            <button
              onClick={handleAddCard}
              disabled={!canSave}
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {saving
                ? t({ zh: "保存中...", en: "Saving..." })
                : t({ zh: "保存卡片", en: "Save card" })}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-black/10 bg-[linear-gradient(180deg,rgba(249,246,238,0.95),rgba(255,255,255,0.94))] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-neutral-900">
              {t({ zh: "卡片富化信息", en: "Card enrichment" })}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {t({
                zh: "这些字段不是必填，但能显著提升检索、组织和复习质量。",
                en: "These fields are optional, but they make search, organization, and review quality much stronger.",
              })}
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-500">
            {t({ zh: "默认卡组", en: "Default deck" })}:{" "}
            {deckName || DEFAULT_DECK_NAME}
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-neutral-500">
              {t({ zh: "卡组", en: "Deck" })}
            </label>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
              placeholder={DEFAULT_DECK_NAME}
              value={deckName}
              onChange={(event) => setDeckName(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-neutral-500">
              {t({ zh: "标签", en: "Tags" })}
            </label>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
              placeholder="travel, business, daily"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-neutral-500">
              {t({ zh: "发音 / 音标", en: "Pronunciation" })}
            </label>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
              placeholder="/travel/"
              value={pronunciation}
              onChange={(event) => setPronunciation(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-neutral-500">
              {t({ zh: "例句", en: "Example sentence" })}
            </label>
            <input
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
              placeholder={t({
                zh: "补一条更容易帮助回忆的例句",
                en: "Add a sentence that helps you recall the phrase.",
              })}
              value={exampleSentence}
              onChange={(event) => setExampleSentence(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm text-neutral-500">
              {t({ zh: "上下文来源", en: "Source context" })}
            </label>
            <textarea
              className="mt-2 min-h-28 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
              placeholder={t({
                zh: "例如：会议纪要、播客、邮件、文章片段",
                en: "Meeting notes, article excerpt, email thread, transcript...",
              })}
              value={sourceContext}
              onChange={(event) => setSourceContext(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-neutral-500">
              {t({ zh: "备注", en: "Notes" })}
            </label>
            <textarea
              className="mt-2 min-h-28 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
              placeholder={t({
                zh: "记录易错点、联想记忆或语气差异",
                en: "Store nuance, usage reminders, or memory hooks.",
              })}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
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
        title={t({ zh: "登录后保存卡片", en: "Sign in to save cards" })}
        description={t({
          zh: "登录后可把这次翻译保存到你的卡片库和学习空间中。",
          en: "Sign in to keep this translation in your card library and study workspace.",
        })}
        actions={
          <button
            onClick={() =>
              signIn(undefined, { callbackUrl: window.location.href })
            }
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            {t({ zh: "去登录", en: "Sign in" })}
          </button>
        }
      />
    </section>
  );
}
