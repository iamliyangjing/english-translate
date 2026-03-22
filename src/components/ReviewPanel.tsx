"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import LoginPrompt from "@/components/LoginPrompt";
import { formatReviewInterval } from "@/lib/review";

type Card = {
  id: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  nextReviewAt?: string;
  reviewCount?: number;
  intervalDays?: number;
  easeFactor?: number;
  lastGrade?: number | null;
};

type ReviewStats = {
  total: number;
  due: number;
  newCards: number;
  reviewedToday: number;
  reviewedThisWeek: number;
  mastered: number;
  learningCards: number;
  completionRate: number;
};

type GradeResponse = {
  card?: {
    id: string;
    sourceText: string;
    lastGrade: number;
    nextReviewAt: string;
    intervalDays: number;
    easeFactor: number;
    reviewCount: number;
    lapseCount: number;
    nextReviewLabel: string;
  };
  error?: string;
};

type CardSource = "server" | "repeat" | null;

const defaultStats: ReviewStats = {
  total: 0,
  due: 0,
  newCards: 0,
  reviewedToday: 0,
  reviewedThisWeek: 0,
  mastered: 0,
  learningCards: 0,
  completionRate: 0,
};

const gradeOptions = [
  {
    label: "完全没想起来",
    hint: "10 分钟后再见",
    grade: 1,
    tone:
      "border-rose-200 bg-white/90 text-rose-900 hover:-translate-y-1 hover:bg-rose-50",
  },
  {
    label: "有点模糊",
    hint: "缩短间隔，继续巩固",
    grade: 2,
    tone:
      "border-amber-200 bg-white/90 text-amber-900 hover:-translate-y-1 hover:bg-amber-50",
  },
  {
    label: "基本记住了",
    hint: "按当前节奏推进",
    grade: 3,
    tone:
      "border-emerald-200 bg-white/90 text-emerald-900 hover:-translate-y-1 hover:bg-emerald-50",
  },
  {
    label: "非常熟练",
    hint: "拉长间隔，减少打扰",
    grade: 4,
    tone:
      "border-sky-200 bg-white/90 text-sky-900 hover:-translate-y-1 hover:bg-sky-50",
  },
] as const;

const langToVoice = (lang: string) => {
  if (lang.toLowerCase().includes("chinese")) {
    return "zh-CN";
  }

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
  const [stats, setStats] = useState<ReviewStats>(defaultStats);
  const [sessionReviewed, setSessionReviewed] = useState(0);
  const [lastReviewSummary, setLastReviewSummary] = useState<string | null>(null);

  const { status } = useSession();
  const isAuthed = status === "authenticated";
  const authLoading = status === "loading";
  const repeatQueueRef = useRef(repeatQueue);

  useEffect(() => {
    repeatQueueRef.current = repeatQueue;
  }, [repeatQueue]);

  const repeatCount = repeatQueue.length;
  const hasRepeat = repeatCount > 0;
  const canGrade = Boolean(card && showAnswer && !loading);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch("/api/profile/stats");
      const data = (await response.json()) as Partial<ReviewStats> & {
        error?: string;
      };

      if (!response.ok) {
        setMessage(data.error ?? "获取学习统计失败。");
        return;
      }

      setStats({
        total: Number(data.total ?? 0),
        due: Number(data.due ?? 0),
        newCards: Number(data.newCards ?? 0),
        reviewedToday: Number(data.reviewedToday ?? 0),
        reviewedThisWeek: Number(data.reviewedThisWeek ?? 0),
        mastered: Number(data.mastered ?? 0),
        learningCards: Number(data.learningCards ?? 0),
        completionRate: Number(data.completionRate ?? 0),
      });
    } catch {
      setMessage("获取学习统计失败，请稍后再试。");
    }
  }, []);

  const loadNext = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    setShowAnswer(false);

    try {
      const response = await fetch("/api/review/next");
      const data = (await response.json()) as { card?: Card | null; error?: string };

      if (!response.ok) {
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

      if (repeatQueueRef.current.length > 0) {
        const [next, ...rest] = repeatQueueRef.current;
        setRepeatQueue(rest);
        setCard(next);
        setCardSource("repeat");
        return;
      }

      setCard(null);
      setCardSource(null);
    } catch {
      setMessage("获取待复习卡片失败，请检查网络后重试。");
      setCard(null);
      setCardSource(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (isAuthed) {
      void loadStats();
      void loadNext();
      return;
    }

    setLoading(false);
  }, [authLoading, isAuthed, loadNext, loadStats]);

  const handleGrade = async (grade: number) => {
    if (!card) {
      return;
    }

    try {
      const response = await fetch("/api/review/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, grade }),
      });
      const data = (await response.json()) as GradeResponse;

      if (!response.ok) {
        setMessage(data.error ?? "提交评分失败。");
        return;
      }

      if (cardSource === "server") {
        await loadStats();
      }

      if (data.card) {
        setLastReviewSummary(
          `“${data.card.sourceText}” 已安排在 ${data.card.nextReviewLabel}。当前间隔 ${formatReviewInterval(data.card.intervalDays)}，难度系数 ${data.card.easeFactor.toFixed(2)}。`,
        );
      }

      setSessionReviewed((prev) => prev + 1);
      await loadNext();
    } catch {
      setMessage("提交评分失败，请稍后再试。");
    }
  };

  const handleSpeak = (text: string, lang: string) => {
    if (!text.trim()) {
      return;
    }

    if (!window.speechSynthesis) {
      setMessage("当前浏览器不支持语音朗读。");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  const handleRepeat = () => {
    if (!card) {
      return;
    }

    setRepeatQueue((prev) => [...prev, card]);
    setRepeatNotice("这张卡片已加入本轮重复队列。");
    window.setTimeout(() => setRepeatNotice(null), 2000);
  };

  const todayTotal = stats.due > 0 ? stats.due : 0;
  const todayProgress =
    todayTotal > 0 ? Math.min(stats.reviewedToday, todayTotal) / todayTotal : 0;
  const sessionRemaining = repeatQueue.length + (card ? 1 : 0);
  const sessionTotal = sessionReviewed + sessionRemaining;
  const sessionProgress = sessionTotal > 0 ? sessionReviewed / sessionTotal : 0;
  const currentIntervalLabel =
    card?.intervalDays && card.intervalDays > 0
      ? formatReviewInterval(card.intervalDays)
      : "首次复习";

  if (!isAuthed && !loading && !authLoading) {
    return (
      <LoginPrompt
        title="登录后开始复习"
        description="登录后即可同步复习进度、查看学习统计，并在不同设备间延续你的记忆节奏。"
        actionLabel="使用 GitHub 登录"
      />
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[40px] border border-black/10 bg-[linear-gradient(180deg,rgba(18,24,36,0.98),rgba(36,31,52,0.94))] p-6 text-white shadow-[0_32px_90px_rgba(15,23,42,0.28)] md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(110,231,183,0.16),transparent_28%),radial-gradient(circle_at_left_center,rgba(251,191,36,0.14),transparent_22%),radial-gradient(circle_at_bottom,rgba(96,165,250,0.15),transparent_26%)]" />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.32em] text-white/50">
              Review
            </p>
            <h1 className="mt-3 font-serif text-3xl text-white md:text-4xl">
              专注复习模式
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/70 md:text-base">
              在更沉浸的界面里翻面、朗读、评分，让系统自动帮你压缩遗忘曲线最容易松动的部分。
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs text-white/80 backdrop-blur">
              重复队列：{repeatCount}
            </div>
            <button
              onClick={() => void loadNext()}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/15"
            >
              换一张卡片
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <div className="rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-white/45">
              今日进度
            </p>
            <div className="mt-3 flex items-center justify-between text-sm text-white/80">
              <span>{stats.reviewedToday}</span>
              <span>{todayTotal}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-emerald-400 transition"
                style={{ width: `${todayProgress * 100}%` }}
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-white/45">
              本轮进度
            </p>
            <div className="mt-3 flex items-center justify-between text-sm text-white/80">
              <span>{sessionReviewed}</span>
              <span>{sessionTotal}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-amber-300 transition"
                style={{ width: `${sessionProgress * 100}%` }}
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-white/45">
              新卡片
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">{stats.newCards}</p>
            <p className="mt-2 text-sm text-white/60">仍在建立第一层记忆</p>
          </div>

          <div className="rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-white/45">
              掌握率
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {stats.completionRate}%
            </p>
            <p className="mt-2 text-sm text-white/60">已脱离待复习队列的比例</p>
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-2xl border border-amber-200/30 bg-amber-100/10 px-4 py-3 text-sm text-amber-100">
            {message}
          </p>
        ) : null}

        {repeatNotice ? (
          <p className="mt-4 rounded-2xl border border-emerald-200/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            {repeatNotice}
          </p>
        ) : null}

        {lastReviewSummary ? (
          <p className="mt-4 rounded-2xl border border-sky-200/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
            {lastReviewSummary}
          </p>
        ) : null}

        <div className="mt-6">
          {loading ? (
            <div className="rounded-[32px] border border-white/10 bg-white/6 px-6 py-16 text-center text-sm text-white/55">
              正在为你加载下一张复习卡片...
            </div>
          ) : !card ? (
            <div className="rounded-[32px] border border-dashed border-white/15 bg-white/6 px-6 py-16 text-center">
              <p className="text-xl font-medium text-white">今天暂时没有待复习卡片</p>
              <p className="mt-3 text-sm text-white/60">
                {hasRepeat
                  ? "你仍然可以继续处理重复队列中的内容。"
                  : "状态很不错，稍后再回来看看新的到期卡片。"}
              </p>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                      当前间隔
                    </p>
                    <p className="mt-3 text-sm font-medium text-white">
                      {currentIntervalLabel}
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                      累计复习
                    </p>
                    <p className="mt-3 text-sm font-medium text-white">
                      {card.reviewCount ?? 0} 次
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                      学习中卡片
                    </p>
                    <p className="mt-3 text-sm font-medium text-white">
                      {stats.learningCards} 张
                    </p>
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                    Front
                  </p>
                  <p className="mt-5 text-2xl leading-10 text-white md:text-3xl md:leading-[3.4rem]">
                    {card.sourceText}
                  </p>
                </div>

                {showAnswer ? (
                  <div className="rounded-[32px] border border-emerald-200/16 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(255,255,255,0.06))] p-6 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">
                      Back
                    </p>
                    <p className="mt-5 text-xl leading-9 text-white md:text-2xl">
                      {card.targetText}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-5">
                <div className="rounded-[32px] border border-white/12 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Session Controls
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() =>
                        handleSpeak(card.sourceText, langToVoice(card.sourceLang))
                      }
                      className="rounded-full border border-white/12 bg-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/15"
                    >
                      朗读原文
                    </button>

                    {showAnswer ? (
                      <button
                        onClick={() =>
                          handleSpeak(card.targetText, langToVoice(card.targetLang))
                        }
                        className="rounded-full border border-white/12 bg-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/15"
                      >
                        朗读译文
                      </button>
                    ) : null}

                    <button
                      onClick={handleRepeat}
                      className="rounded-full border border-white/12 bg-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/15"
                    >
                      加入重复队列
                    </button>

                    <button
                      onClick={() => setShowAnswer((prev) => !prev)}
                      className="rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-950 transition hover:-translate-y-0.5 hover:bg-neutral-100"
                    >
                      {showAnswer ? "收起答案" : "查看答案"}
                    </button>
                  </div>
                </div>

                {showAnswer ? (
                  <div className="rounded-[32px] border border-white/12 bg-white/10 p-5 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                      Rate Memory
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {gradeOptions.map((item) => (
                        <button
                          key={item.grade}
                          onClick={() => void handleGrade(item.grade)}
                          disabled={!canGrade}
                          className={`rounded-[26px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${item.tone}`}
                        >
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="mt-1 text-xs opacity-75">{item.hint}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[32px] border border-dashed border-white/15 bg-white/6 px-5 py-6 text-sm text-white/60">
                    先翻面查看答案，再根据熟练度选择评分。评分越准确，系统安排的下次出现时间就越合理。
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
