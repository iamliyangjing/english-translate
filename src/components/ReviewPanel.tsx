"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import LoginPrompt from "@/components/LoginPrompt";

type Card = {
  id: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
};

type CardSource = "server" | "repeat" | null;

const langToVoice = (lang: string) => {
  if (lang.toLowerCase().includes("chinese")) return "zh-CN";
  return "en-US";
};

export default function ReviewPanel() {
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [repeatQueue, setRepeatQueue] = useState<Card[]>([]);
  const [repeatNotice, setRepeatNotice] = useState<string | null>(null);
  const [cardSource, setCardSource] = useState<CardSource>(null);
  const [todayDue, setTodayDue] = useState(0);
  const [todayReviewed, setTodayReviewed] = useState(0);
  const [sessionReviewed, setSessionReviewed] = useState(0);

  const { status } = useSession();
  const isAuthed = status === "authenticated";
  const authLoading = status === "loading";

  const repeatCount = repeatQueue.length;
  const hasRepeat = repeatCount > 0;
  const canGrade = Boolean(card && showAnswer && !loading);

  const loadStats = async () => {
    try {
      const res = await fetch("/api/profile/stats");
      const data = await res.json();
      if (res.ok) {
        setTodayDue(Number(data.due ?? 0));
      }
    } catch {
      setTodayDue(0);
    }
  };

  const loadNext = async () => {
    setLoading(true);
    setMessage(null);
    setShowAnswer(false);
    try {
      const res = await fetch("/api/review/next");
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "获取待复习卡片失败。");
        setCard(null);
        setCardSource(null);
        return;
      }

      if (data.card) {
        setCard(data.card);
        setCardSource("server");
        return;
      }

      if (repeatQueue.length > 0) {
        const [next, ...rest] = repeatQueue;
        setRepeatQueue(rest);
        setCard(next);
        setCardSource("repeat");
        return;
      }

      setCard(null);
      setCardSource(null);
    } catch {
      setMessage("获取待复习卡片失败，请检查网络或稍后再试。");
      setCard(null);
      setCardSource(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (isAuthed) {
      loadStats();
      loadNext();
    } else {
      setLoading(false);
    }
  }, [isAuthed, authLoading]);

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
        setMessage(data.error ?? "提交评分失败。");
        return;
      }
      if (cardSource === "server") {
        setTodayReviewed((prev) => prev + 1);
      }
      setSessionReviewed((prev) => prev + 1);
      await loadNext();
    } catch {
      setMessage("提交评分失败，请稍后再试。");
    }
  };

  const handleSpeak = (text: string, lang: string) => {
    if (!text.trim()) return;
    if (!window.speechSynthesis) {
      setMessage("当前浏览器不支持语音朗读。");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  const handleRepeat = () => {
    if (!card) return;
    setRepeatQueue((prev) => [...prev, card]);
    setRepeatNotice("已加入重复复习队列。");
    setTimeout(() => setRepeatNotice(null), 2000);
  };

  const gradeOptions = useMemo(
    () => [
      { label: "还不熟", grade: 1, tone: "border-amber-200 hover:bg-amber-50" },
      { label: "有点印象", grade: 2, tone: "border-amber-200 hover:bg-amber-50" },
      { label: "比较熟", grade: 3, tone: "border-emerald-200 hover:bg-emerald-50" },
      { label: "非常熟", grade: 4, tone: "border-emerald-200 hover:bg-emerald-50" },
    ],
    [],
  );

  const todayTotal = todayDue > 0 ? todayDue : 0;
  const todayProgress =
    todayTotal > 0 ? Math.min(todayReviewed, todayTotal) / todayTotal : 0;
  const sessionRemaining = repeatQueue.length + (card ? 1 : 0);
  const sessionTotal = sessionReviewed + sessionRemaining;
  const sessionProgress =
    sessionTotal > 0 ? sessionReviewed / sessionTotal : 0;

  if (!isAuthed && !loading && !authLoading) {
    return (
      <LoginPrompt
        title="登录后开始复习"
        description="请先登录，再进入复习模式。"
        actionLabel="使用 GitHub 登录"
      />
    );
  }

  return (
    <section className="rounded-3xl border border-black/10 bg-white/90 p-8 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            Review
          </p>
          <h1 className="mt-2 font-serif text-2xl text-neutral-900">
            专注复习模式
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            翻面后评分，建立你的复习节奏。
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="rounded-full border border-black/10 bg-neutral-50 px-3 py-1 text-xs text-neutral-600">
            重复队列：{repeatCount}
          </div>
          <button
            onClick={loadNext}
            className="rounded-full border border-black/10 px-4 py-2 text-sm text-neutral-700 transition hover:bg-black/5"
          >
            换一张
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            今天
          </p>
          <div className="mt-2 flex items-center justify-between text-sm text-neutral-700">
            <span>{todayReviewed}</span>
            <span>{todayTotal}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white">
            <div
              className="h-2 rounded-full bg-emerald-500 transition"
              style={{ width: `${todayProgress * 100}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            本轮
          </p>
          <div className="mt-2 flex items-center justify-between text-sm text-neutral-700">
            <span>{sessionReviewed}</span>
            <span>{sessionTotal}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white">
            <div
              className="h-2 rounded-full bg-amber-500 transition"
              style={{ width: `${sessionProgress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl bg-black/5 px-4 py-3 text-sm text-neutral-700">
          {message}
        </p>
      ) : null}

      {repeatNotice ? (
        <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {repeatNotice}
        </p>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-neutral-400">加载中...</p>
        ) : !card ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
            今日暂无待复习卡片。{hasRepeat ? "可从重复队列继续复习。" : ""}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-black/10 bg-neutral-50 px-5 py-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                正面
              </p>
              <p className="mt-3 text-lg text-neutral-900">
                {card.sourceText}
              </p>
            </div>

            {showAnswer ? (
              <div className="rounded-2xl border border-black/10 bg-white px-5 py-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                  背面
                </p>
                <p className="mt-3 text-lg text-neutral-900">
                  {card.targetText}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() =>
                  handleSpeak(card.sourceText, langToVoice(card.sourceLang))
                }
                className="rounded-full border border-black/10 px-4 py-2 text-sm text-neutral-700 transition hover:bg-black/5"
              >
                朗读原文
              </button>
              {showAnswer ? (
                <button
                  onClick={() =>
                    handleSpeak(card.targetText, langToVoice(card.targetLang))
                  }
                  className="rounded-full border border-black/10 px-4 py-2 text-sm text-neutral-700 transition hover:bg-black/5"
                >
                  朗读译文
                </button>
              ) : null}
              <button
                onClick={handleRepeat}
                className="rounded-full border border-black/10 px-4 py-2 text-sm text-neutral-700 transition hover:bg-black/5"
              >
                重复复习
              </button>
              <button
                onClick={() => setShowAnswer((prev) => !prev)}
                className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                {showAnswer ? "收起答案" : "查看答案"}
              </button>
            </div>

            {showAnswer ? (
              <div className="grid gap-3 md:grid-cols-4">
                {gradeOptions.map((item) => (
                  <button
                    key={item.grade}
                    onClick={() => handleGrade(item.grade)}
                    disabled={!canGrade}
                    className={`rounded-2xl border px-4 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${item.tone}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
                翻面后可进行评分。
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
