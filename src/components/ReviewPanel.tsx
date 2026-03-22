"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import LoginPrompt from "@/components/LoginPrompt";
import { useI18n } from "@/components/LocaleProvider";
import { formatReviewInterval } from "@/lib/review";

type Card = {
  id: string; sourceText: string; targetText: string; sourceLang: string; targetLang: string;
  nextReviewAt?: string; reviewCount?: number; intervalDays?: number; easeFactor?: number; lastGrade?: number | null;
};
type ReviewStats = {
  total: number; due: number; newCards: number; reviewedToday: number; reviewedThisWeek: number;
  mastered: number; learningCards: number; completionRate: number;
};
type GradeResponse = {
  card?: {
    id: string; sourceText: string; lastGrade: number; nextReviewAt: string; intervalDays: number;
    easeFactor: number; reviewCount: number; lapseCount: number; nextReviewLabel: string;
  };
  error?: string;
};
type CardSource = "server" | "repeat" | null;

const defaultStats: ReviewStats = { total: 0, due: 0, newCards: 0, reviewedToday: 0, reviewedThisWeek: 0, mastered: 0, learningCards: 0, completionRate: 0 };
const langToVoice = (lang: string) => lang.toLowerCase().includes("chinese") ? "zh-CN" : "en-US";

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
  const { t } = useI18n();
  const isAuthed = status === "authenticated";
  const authLoading = status === "loading";
  const repeatQueueRef = useRef(repeatQueue);

  useEffect(() => { repeatQueueRef.current = repeatQueue; }, [repeatQueue]);

  const gradeOptions = [
    { label: t({ zh: "完全没想起来", en: "Total blank" }), hint: t({ zh: "很快再见", en: "See it again soon" }), grade: 1, tone: "border-rose-200 bg-white/90 text-rose-900 hover:-translate-y-1 hover:bg-rose-50" },
    { label: t({ zh: "有点模糊", en: "A bit fuzzy" }), hint: t({ zh: "缩短间隔", en: "Shorten the interval" }), grade: 2, tone: "border-amber-200 bg-white/90 text-amber-900 hover:-translate-y-1 hover:bg-amber-50" },
    { label: t({ zh: "基本记住了", en: "Mostly remembered" }), hint: t({ zh: "按当前节奏推进", en: "Keep the current pace" }), grade: 3, tone: "border-emerald-200 bg-white/90 text-emerald-900 hover:-translate-y-1 hover:bg-emerald-50" },
    { label: t({ zh: "非常熟练", en: "Very easy" }), hint: t({ zh: "拉长间隔", en: "Stretch the interval" }), grade: 4, tone: "border-sky-200 bg-white/90 text-sky-900 hover:-translate-y-1 hover:bg-sky-50" },
  ] as const;

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch("/api/profile/stats");
      const data = (await response.json()) as Partial<ReviewStats> & { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? t({ zh: "获取学习统计失败。", en: "Failed to load study stats." }));
        return;
      }
      setStats({
        total: Number(data.total ?? 0), due: Number(data.due ?? 0), newCards: Number(data.newCards ?? 0),
        reviewedToday: Number(data.reviewedToday ?? 0), reviewedThisWeek: Number(data.reviewedThisWeek ?? 0),
        mastered: Number(data.mastered ?? 0), learningCards: Number(data.learningCards ?? 0), completionRate: Number(data.completionRate ?? 0),
      });
    } catch {
      setMessage(t({ zh: "获取学习统计失败。", en: "Failed to load study stats." }));
    }
  }, [t]);

  const loadNext = useCallback(async () => {
    setLoading(true); setMessage(null); setShowAnswer(false);
    try {
      const response = await fetch("/api/review/next");
      const data = (await response.json()) as { card?: Card | null; error?: string };
      if (!response.ok) {
        setMessage(data.error ?? t({ zh: "获取待复习卡片失败。", en: "Failed to load the next review card." }));
        setCard(null); setCardSource(null); return;
      }
      if (data.card) { setCard(data.card); setCardSource("server"); return; }
      if (repeatQueueRef.current.length > 0) {
        const [next, ...rest] = repeatQueueRef.current;
        setRepeatQueue(rest); setCard(next); setCardSource("repeat"); return;
      }
      setCard(null); setCardSource(null);
    } catch {
      setMessage(t({ zh: "获取待复习卡片失败。", en: "Failed to load the next review card." }));
      setCard(null); setCardSource(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthed) { void loadStats(); void loadNext(); return; }
    setLoading(false);
  }, [authLoading, isAuthed, loadNext, loadStats]);

  const handleGrade = async (grade: number) => {
    if (!card) return;
    try {
      const response = await fetch("/api/review/grade", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId: card.id, grade }),
      });
      const data = (await response.json()) as GradeResponse;
      if (!response.ok) {
        setMessage(data.error ?? t({ zh: "提交评分失败。", en: "Failed to submit the grade." }));
        return;
      }
      if (cardSource === "server") await loadStats();
      if (data.card) {
        setLastReviewSummary(t({
          zh: `“${data.card.sourceText}” 已安排在 ${data.card.nextReviewLabel}。当前间隔 ${formatReviewInterval(data.card.intervalDays)}，难度系数 ${data.card.easeFactor.toFixed(2)}。`,
          en: `"${data.card.sourceText}" is now scheduled for ${data.card.nextReviewLabel}. Current interval: ${formatReviewInterval(data.card.intervalDays)}, ease ${data.card.easeFactor.toFixed(2)}.`,
        }));
      }
      setSessionReviewed((prev) => prev + 1);
      await loadNext();
    } catch {
      setMessage(t({ zh: "提交评分失败。", en: "Failed to submit the grade." }));
    }
  };

  const handleSpeak = (text: string, lang: string) => {
    if (!text.trim()) return;
    if (!window.speechSynthesis) {
      setMessage(t({ zh: "当前浏览器不支持语音朗读。", en: "Speech playback is not supported in this browser." }));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  const handleRepeat = () => {
    if (!card) return;
    setRepeatQueue((prev) => [...prev, card]);
    setRepeatNotice(t({ zh: "这张卡片已加入本轮重复队列。", en: "This card was added to the repeat queue." }));
    window.setTimeout(() => setRepeatNotice(null), 2000);
  };

  const repeatCount = repeatQueue.length;
  const hasRepeat = repeatCount > 0;
  const canGrade = Boolean(card && showAnswer && !loading);
  const todayTotal = stats.due > 0 ? stats.due : 0;
  const todayProgress = todayTotal > 0 ? Math.min(stats.reviewedToday, todayTotal) / todayTotal : 0;
  const sessionRemaining = repeatQueue.length + (card ? 1 : 0);
  const sessionTotal = sessionReviewed + sessionRemaining;
  const sessionProgress = sessionTotal > 0 ? sessionReviewed / sessionTotal : 0;
  const currentIntervalLabel = card?.intervalDays && card.intervalDays > 0 ? formatReviewInterval(card.intervalDays) : t({ zh: "首次复习", en: "First review" });

  if (!isAuthed && !loading && !authLoading) {
    return <LoginPrompt title={t({ zh: "登录后开始复习", en: "Sign in to start reviewing" })} description={t({ zh: "登录后即可同步复习进度、查看学习统计，并在不同设备间延续你的记忆节奏。", en: "Sign in to sync review progress, view study stats, and continue across devices." })} actionLabel={t({ zh: "使用 GitHub 登录", en: "Continue with GitHub" })} />;
  }

  return (
    <section className="relative overflow-hidden rounded-[40px] border border-black/10 bg-[linear-gradient(180deg,rgba(18,24,36,0.98),rgba(36,31,52,0.94))] p-6 text-white shadow-[0_32px_90px_rgba(15,23,42,0.28)] md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(110,231,183,0.16),transparent_28%),radial-gradient(circle_at_left_center,rgba(251,191,36,0.14),transparent_22%),radial-gradient(circle_at_bottom,rgba(96,165,250,0.15),transparent_26%)]" />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.32em] text-white/50">{t({ zh: "复习", en: "Review" })}</p>
            <h1 className="mt-3 font-serif text-3xl text-white md:text-4xl">{t({ zh: "专注复习模式", en: "Focused review mode" })}</h1>
            <p className="mt-3 text-sm leading-6 text-white/70 md:text-base">{t({ zh: "在更沉浸的界面里翻面、朗读、评分，让系统自动安排下一次最合适的出现时间。", en: "Flip, listen, and grade inside a more focused interface while the system schedules the next best appearance." })}</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs text-white/80 backdrop-blur">{t({ zh: `重复队列：${repeatCount}`, en: `Repeat queue: ${repeatCount}` })}</div>
            <button onClick={() => void loadNext()} className="rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/15">{t({ zh: "换一张卡片", en: "Skip to another card" })}</button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <ProgressStat label={t({ zh: "今日进度", en: "Today" })} left={String(stats.reviewedToday)} right={String(todayTotal)} progress={todayProgress} color="bg-emerald-400" />
          <ProgressStat label={t({ zh: "本轮进度", en: "Session" })} left={String(sessionReviewed)} right={String(sessionTotal)} progress={sessionProgress} color="bg-amber-300" />
          <NumberStat label={t({ zh: "新卡片", en: "New cards" })} value={String(stats.newCards)} note={t({ zh: "仍在建立第一层记忆", en: "Still building the first memory layer" })} />
          <NumberStat label={t({ zh: "掌握率", en: "Mastery" })} value={`${stats.completionRate}%`} note={t({ zh: "已脱离待复习队列的比例", en: "Share of cards out of the due queue" })} />
        </div>

        {message ? <Banner tone="amber" message={message} /> : null}
        {repeatNotice ? <Banner tone="emerald" message={repeatNotice} /> : null}
        {lastReviewSummary ? <Banner tone="sky" message={lastReviewSummary} /> : null}

        <div className="mt-6">
          {loading ? (
            <div className="rounded-[32px] border border-white/10 bg-white/6 px-6 py-16 text-center text-sm text-white/55">{t({ zh: "正在为你加载下一张复习卡片...", en: "Loading the next review card..." })}</div>
          ) : !card ? (
            <div className="rounded-[32px] border border-dashed border-white/15 bg-white/6 px-6 py-16 text-center">
              <p className="text-xl font-medium text-white">{t({ zh: "今天暂时没有待复习卡片", en: "No due cards right now" })}</p>
              <p className="mt-3 text-sm text-white/60">{hasRepeat ? t({ zh: "你仍然可以继续处理重复队列中的内容。", en: "You can still keep going through the repeat queue." }) : t({ zh: "状态不错，稍后再回来看看新的到期卡片。", en: "Nice work. Come back later for newly due cards." })}</p>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <InfoStat label={t({ zh: "当前间隔", en: "Current interval" })} value={currentIntervalLabel} />
                  <InfoStat label={t({ zh: "累计复习", en: "Review count" })} value={t({ zh: `${card.reviewCount ?? 0} 次`, en: `${card.reviewCount ?? 0} times` })} />
                  <InfoStat label={t({ zh: "学习中卡片", en: "Learning cards" })} value={t({ zh: `${stats.learningCards} 张`, en: `${stats.learningCards} cards` })} />
                </div>
                <div className="rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">Front</p>
                  <p className="mt-5 text-2xl leading-10 text-white md:text-3xl md:leading-[3.4rem]">{card.sourceText}</p>
                </div>
                {showAnswer ? (
                  <div className="rounded-[32px] border border-emerald-200/16 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(255,255,255,0.06))] p-6 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/70">Back</p>
                    <p className="mt-5 text-xl leading-9 text-white md:text-2xl">{card.targetText}</p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-5">
                <div className="rounded-[32px] border border-white/12 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">{t({ zh: "操作", en: "Session controls" })}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button onClick={() => handleSpeak(card.sourceText, langToVoice(card.sourceLang))} className="rounded-full border border-white/12 bg-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/15">{t({ zh: "朗读原文", en: "Play source" })}</button>
                    {showAnswer ? <button onClick={() => handleSpeak(card.targetText, langToVoice(card.targetLang))} className="rounded-full border border-white/12 bg-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/15">{t({ zh: "朗读译文", en: "Play translation" })}</button> : null}
                    <button onClick={handleRepeat} className="rounded-full border border-white/12 bg-white/10 px-4 py-2.5 text-sm text-white transition hover:bg-white/15">{t({ zh: "加入重复队列", en: "Repeat later" })}</button>
                    <button onClick={() => setShowAnswer((prev) => !prev)} className="rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-950 transition hover:-translate-y-0.5 hover:bg-neutral-100">{showAnswer ? t({ zh: "收起答案", en: "Hide answer" }) : t({ zh: "查看答案", en: "Show answer" })}</button>
                  </div>
                </div>

                {showAnswer ? (
                  <div className="rounded-[32px] border border-white/12 bg-white/10 p-5 backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">{t({ zh: "记忆评分", en: "Rate memory" })}</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {gradeOptions.map((item) => (
                        <button key={item.grade} onClick={() => void handleGrade(item.grade)} disabled={!canGrade} className={`rounded-[26px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${item.tone}`}>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="mt-1 text-xs opacity-75">{item.hint}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[32px] border border-dashed border-white/15 bg-white/6 px-5 py-6 text-sm text-white/60">{t({ zh: "先查看答案，再根据熟练度选择评分。评分越准确，下一次出现时间就越合理。", en: "Reveal the answer first, then choose a rating. Better ratings produce better scheduling." })}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Banner({ tone, message }: { tone: "amber" | "emerald" | "sky"; message: string }) {
  const className = tone === "amber" ? "border-amber-200/30 bg-amber-100/10 text-amber-100" : tone === "emerald" ? "border-emerald-200/20 bg-emerald-400/10 text-emerald-100" : "border-sky-200/20 bg-sky-400/10 text-sky-100";
  return <p className={`mt-4 rounded-2xl px-4 py-3 text-sm ${className}`}>{message}</p>;
}

function ProgressStat({ label, left, right, progress, color }: { label: string; left: string; right: string; progress: number; color: string }) {
  return <div className="rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur"><p className="text-xs uppercase tracking-[0.22em] text-white/45">{label}</p><div className="mt-3 flex items-center justify-between text-sm text-white/80"><span>{left}</span><span>{right}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-2 rounded-full transition ${color}`} style={{ width: `${progress * 100}%` }} /></div></div>;
}

function NumberStat({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur"><p className="text-xs uppercase tracking-[0.22em] text-white/45">{label}</p><p className="mt-3 text-3xl font-semibold text-white">{value}</p><p className="mt-2 text-sm text-white/60">{note}</p></div>;
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur"><p className="text-xs uppercase tracking-[0.22em] text-white/45">{label}</p><p className="mt-3 text-sm font-medium text-white">{value}</p></div>;
}
