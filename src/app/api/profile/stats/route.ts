import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Database } from "@/lib/database.types";
import { authOptions } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { getSqlite } from "@/lib/db";
import { isMissingColumnError } from "@/lib/supabase-errors";

export const runtime = "nodejs";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type StatsCardRow = {
  id: Database["public"]["Tables"]["cards"]["Row"]["id"];
  next_review_at: Database["public"]["Tables"]["cards"]["Row"]["next_review_at"];
  review_count: number | null;
  last_reviewed_at: string | null;
  interval_days: number | null;
};

type LegacyStatsCardRow = Pick<
  Database["public"]["Tables"]["cards"]["Row"],
  "id" | "next_review_at"
>;

const getDayStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const toTime = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const buildStats = (cards: StatsCardRow[]) => {
  const now = Date.now();
  const dayStart = getDayStart().getTime();
  const weekStart = dayStart - 6 * DAY_IN_MS;

  const total = cards.length;
  const due = cards.filter((card) => {
    const nextReviewAt = toTime(card.next_review_at);
    return nextReviewAt !== null && nextReviewAt <= now;
  }).length;
  const newCards = cards.filter((card) => (card.review_count ?? 0) === 0).length;
  const reviewedToday = cards.filter((card) => {
    const reviewedAt = toTime(card.last_reviewed_at);
    return reviewedAt !== null && reviewedAt >= dayStart;
  }).length;
  const reviewedThisWeek = cards.filter((card) => {
    const reviewedAt = toTime(card.last_reviewed_at);
    return reviewedAt !== null && reviewedAt >= weekStart;
  }).length;
  const mastered = cards.filter((card) => Number(card.interval_days ?? 0) >= 21).length;
  const learningCards = cards.filter((card) => (card.review_count ?? 0) > 0).length;

  return {
    total,
    due,
    newCards,
    reviewedToday,
    reviewedThisWeek,
    mastered,
    learningCards,
    completionRate: total > 0 ? Math.round(((total - due) / total) * 100) : 0,
    schemaUpgraded: true,
  };
};

const buildLegacyStats = (cards: LegacyStatsCardRow[]) => {
  const now = Date.now();
  const total = cards.length;
  const due = cards.filter((card) => {
    const nextReviewAt = toTime(card.next_review_at);
    return nextReviewAt !== null && nextReviewAt <= now;
  }).length;

  return {
    total,
    due,
    newCards: 0,
    reviewedToday: 0,
    reviewedThisWeek: 0,
    mastered: 0,
    learningCards: Math.max(total - due, 0),
    completionRate: total > 0 ? Math.round(((total - due) / total) * 100) : 0,
    schemaUpgraded: false,
  };
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    }

    const supabase = getSupabase();
    if (supabase) {
      const enhancedResponse = await supabase
        .from("cards")
        .select("id, next_review_at, review_count, last_reviewed_at, interval_days")
        .eq("user_id", userKey);

      if (enhancedResponse.error && !isMissingColumnError(enhancedResponse.error.message)) {
        return NextResponse.json(
          { error: "获取学习统计失败。", details: enhancedResponse.error.message },
          { status: 500 },
        );
      }

      if (enhancedResponse.error && isMissingColumnError(enhancedResponse.error.message)) {
        const legacyResponse = await supabase
          .from("cards")
          .select("id, next_review_at")
          .eq("user_id", userKey);

        if (legacyResponse.error) {
          return NextResponse.json(
            { error: "获取学习统计失败。", details: legacyResponse.error.message },
            { status: 500 },
          );
        }

        return NextResponse.json(buildLegacyStats(legacyResponse.data ?? []));
      }

      return NextResponse.json(buildStats(enhancedResponse.data ?? []));
    }

    const sqlite = getSqlite();
    const rows = sqlite
      .prepare<
        [string],
        {
          id: string;
          next_review_at: string;
          review_count: number | null;
          last_reviewed_at: string | null;
          interval_days: number | null;
        }
      >(
        `SELECT id, next_review_at, review_count, last_reviewed_at, interval_days
         FROM cards
         WHERE user_id = ?`,
      )
      .all(userKey);

    return NextResponse.json(buildStats(rows));
  } catch (error) {
    return NextResponse.json(
      { error: "获取学习统计失败。", details: String(error) },
      { status: 500 },
    );
  }
}
