"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import LoginPrompt from "@/components/LoginPrompt";

type Card = {
  id: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
};

const langToVoice = (lang: string) => {
  if (lang.toLowerCase().includes("chinese")) return "zh-CN";
  return "en-US";
};

export default function ReviewPanel() {
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { status } = useSession();
  const isAuthed = status === "authenticated";
  const authLoading = status === "loading";

  const loadNext = async () => {
    setLoading(true);
    setMessage(null);
    setShowAnswer(false);
    try {
      const res = await fetch("/api/review/next");
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "请先登录。");
        setCard(null);
        return;
      }
      setCard(data.card ?? null);
    } catch (error) {
      setMessage("加载失败，请检查网络。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (isAuthed) {
      loadNext();
    } else {
      setLoading(false);
    }
  }, [isAuthed, authLoading]);

  if (!isAuthed && !loading && !authLoading) {
    return (
      <LoginPrompt
        title="登录后开始复习"
        description="登录后可以看到待复习卡片并记录复习进度。"
      />
    );
  }

  const handleGrade = async (grade: number) => {
    if (!card) return;
    try {
      const res = await fetch("/api/review/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, grade }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "评分失败。");
        return;
      }
      await loadNext();
    } catch (error) {
      setMessage("评分失败，请稍后重试。");
    }
  };

  const handleSpeak = (text: string, lang: string) => {
    if (!text.trim()) return;
    if (!window.speechSynthesis) {
      setMessage("当前浏览器不支持语音播放。");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-neutral-900">站内复习</h1>
          <p className="text-sm text-neutral-500">
            简单节奏，保持学习惯性。
          </p>
        </div>
        <button
          onClick={loadNext}
          className="rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5"
        >
          刷新
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl bg-black/5 px-4 py-3 text-sm text-neutral-700">
          {message}
        </p>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-neutral-400">加载中...</p>
        ) : !card ? (
          <p className="text-sm text-neutral-500">暂无待复习的卡片。</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-5">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                正面
              </p>
              <p className="mt-2 text-lg text-neutral-900">
                {card.sourceText}
              </p>
            </div>

            {showAnswer ? (
              <div className="rounded-2xl border border-black/10 bg-white px-4 py-5">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                  背面
                </p>
                <p className="mt-2 text-lg text-neutral-900">
                  {card.targetText}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleSpeak(card.sourceText, langToVoice(card.sourceLang))}
                className="rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5"
              >
                播放原文
              </button>
              {showAnswer ? (
                <button
                  onClick={() =>
                    handleSpeak(card.targetText, langToVoice(card.targetLang))
                  }
                  className="rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5"
                >
                  播放译文
                </button>
              ) : null}
              <button
                onClick={() => setShowAnswer((prev) => !prev)}
                className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                {showAnswer ? "隐藏答案" : "显示答案"}
              </button>
            </div>

            {showAnswer ? (
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  { label: "不太记得", grade: 1 },
                  { label: "有点印象", grade: 2 },
                  { label: "记得清楚", grade: 3 },
                  { label: "非常熟练", grade: 4 },
                ].map((item) => (
                  <button
                    key={item.grade}
                    onClick={() => handleGrade(item.grade)}
                    className="rounded-2xl border border-black/10 px-4 py-3 text-sm transition hover:bg-black/5"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
