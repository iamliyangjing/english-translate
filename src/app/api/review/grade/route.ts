import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Database } from "@/lib/database.types";
import { authOptions } from "@/lib/auth";
import { getSqlite } from "@/lib/db";
import { getReviewSchedule, isReviewGrade } from "@/lib/review";
import { isMissingColumnError } from "@/lib/supabase-errors";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

type GradeBody = {
  cardId?: string;
  grade?: number;
};

type ReviewCardRow = Pick<
  Database["public"]["Tables"]["cards"]["Row"],
  | "id"
  | "review_count"
  | "lapse_count"
  | "ease_factor"
  | "interval_days"
  | "source_text"
>;

type CardUpdate = Database["public"]["Tables"]["cards"]["Update"];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userKey = session?.user?.id || session?.user?.email;
  if (!userKey) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const body = (await request.json()) as GradeBody;
  const cardId = body.cardId?.trim();
  const grade = body.grade;

  if (!cardId || grade === undefined || !isReviewGrade(grade)) {
    return NextResponse.json({ error: "评分参数无效。" }, { status: 400 });
  }

  const now = new Date();
  const supabase = getSupabase();

  if (supabase) {
    const enhancedExisting = await supabase
      .from("cards")
      .select("id, source_text, review_count, lapse_count, ease_factor, interval_days")
      .eq("id", cardId)
      .eq("user_id", userKey)
      .maybeSingle<ReviewCardRow>();

    if (enhancedExisting.error && !isMissingColumnError(enhancedExisting.error.message)) {
      return NextResponse.json(
        { error: "加载卡片失败。", details: enhancedExisting.error.message },
        { status: 500 },
      );
    }

    if (enhancedExisting.error && isMissingColumnError(enhancedExisting.error.message)) {
      const legacyExisting = await supabase
        .from("cards")
        .select("id, source_text")
        .eq("id", cardId)
        .eq("user_id", userKey)
        .maybeSingle();

      if (legacyExisting.error) {
        return NextResponse.json(
          { error: "加载卡片失败。", details: legacyExisting.error.message },
          { status: 500 },
        );
      }

      if (!legacyExisting.data) {
        return NextResponse.json({ error: "卡片不存在。" }, { status: 404 });
      }

      const schedule = getReviewSchedule({}, grade, now);
      const legacyUpdate = await supabase
        .from("cards")
        .update({
          next_review_at: schedule.nextReviewAt.toISOString(),
          last_grade: grade,
          updated_at: now.toISOString(),
        })
        .eq("id", cardId)
        .eq("user_id", userKey);

      if (legacyUpdate.error) {
        return NextResponse.json(
          { error: "提交评分失败。", details: legacyUpdate.error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        card: {
          id: cardId,
          sourceText: legacyExisting.data.source_text,
          lastGrade: grade,
          nextReviewAt: schedule.nextReviewAt.toISOString(),
          intervalDays: schedule.intervalDays,
          easeFactor: schedule.easeFactor,
          reviewCount: schedule.reviewCount,
          lapseCount: schedule.lapseCount,
          nextReviewLabel: schedule.label,
        },
      });
    }

    if (!enhancedExisting.data) {
      return NextResponse.json({ error: "卡片不存在。" }, { status: 404 });
    }

    const schedule = getReviewSchedule(
      {
        reviewCount: enhancedExisting.data.review_count,
        lapseCount: enhancedExisting.data.lapse_count,
        easeFactor: enhancedExisting.data.ease_factor,
        intervalDays: enhancedExisting.data.interval_days,
      },
      grade,
      now,
    );
    const updatePayload: CardUpdate = {
      next_review_at: schedule.nextReviewAt.toISOString(),
      last_grade: grade,
      review_count: schedule.reviewCount,
      lapse_count: schedule.lapseCount,
      ease_factor: schedule.easeFactor,
      interval_days: schedule.intervalDays,
      last_reviewed_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const { error } = await supabase
      .from("cards")
      .update(updatePayload)
      .eq("id", cardId)
      .eq("user_id", userKey);

    if (error) {
      return NextResponse.json(
        { error: "提交评分失败。", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      card: {
        id: cardId,
        sourceText: enhancedExisting.data.source_text,
        lastGrade: grade,
        nextReviewAt: schedule.nextReviewAt.toISOString(),
        intervalDays: schedule.intervalDays,
        easeFactor: schedule.easeFactor,
        reviewCount: schedule.reviewCount,
        lapseCount: schedule.lapseCount,
        nextReviewLabel: schedule.label,
      },
    });
  }

  const sqlite = getSqlite();
  const existing = sqlite
    .prepare<
      [string, string],
      {
        id: string;
        source_text: string;
        review_count: number | null;
        lapse_count: number | null;
        ease_factor: number | null;
        interval_days: number | null;
      }
    >(
      `SELECT id, source_text, review_count, lapse_count, ease_factor, interval_days
       FROM cards
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
    )
    .get(cardId, userKey);

  if (!existing) {
    return NextResponse.json({ error: "卡片不存在。" }, { status: 404 });
  }

  const schedule = getReviewSchedule(
    {
      reviewCount: existing.review_count,
      lapseCount: existing.lapse_count,
      easeFactor: existing.ease_factor,
      intervalDays: existing.interval_days,
    },
    grade,
    now,
  );
  const updatedAt = now.toISOString();

  sqlite
    .prepare<
      [string, number, number, number, number, number, string, string, string, string]
    >(
      `UPDATE cards
       SET next_review_at = ?,
           last_grade = ?,
           review_count = ?,
           lapse_count = ?,
           ease_factor = ?,
           interval_days = ?,
           last_reviewed_at = ?,
           updated_at = ?
       WHERE id = ? AND user_id = ?`,
    )
    .run(
      schedule.nextReviewAt.toISOString(),
      grade,
      schedule.reviewCount,
      schedule.lapseCount,
      schedule.easeFactor,
      schedule.intervalDays,
      now.toISOString(),
      updatedAt,
      cardId,
      userKey,
    );

  return NextResponse.json({
    card: {
      id: cardId,
      sourceText: existing.source_text,
      lastGrade: grade,
      nextReviewAt: schedule.nextReviewAt.toISOString(),
      intervalDays: schedule.intervalDays,
      easeFactor: schedule.easeFactor,
      reviewCount: schedule.reviewCount,
      lapseCount: schedule.lapseCount,
      nextReviewLabel: schedule.label,
    },
  });
}
