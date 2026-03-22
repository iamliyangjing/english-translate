import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Database } from "@/lib/database.types";
import { authOptions } from "@/lib/auth";
import { getSqlite } from "@/lib/db";
import { isMissingColumnError } from "@/lib/supabase-errors";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

type ReviewCardRow = Pick<
  Database["public"]["Tables"]["cards"]["Row"],
  | "id"
  | "source_text"
  | "target_text"
  | "source_lang"
  | "target_lang"
  | "next_review_at"
  | "review_count"
  | "interval_days"
  | "ease_factor"
  | "last_grade"
>;

export async function GET() {
  const session = await getServerSession(authOptions);
  const userKey = session?.user?.id || session?.user?.email;
  if (!userKey) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const supabase = getSupabase();
  if (supabase) {
    const enhancedResponse = await supabase
      .from("cards")
      .select(
        "id, source_text, target_text, source_lang, target_lang, next_review_at, review_count, interval_days, ease_factor, last_grade",
      )
      .eq("user_id", userKey)
      .lte("next_review_at", new Date().toISOString())
      .order("next_review_at", { ascending: true })
      .limit(1)
      .maybeSingle<ReviewCardRow>();

    if (enhancedResponse.error && !isMissingColumnError(enhancedResponse.error.message)) {
      return NextResponse.json(
        { error: "加载待复习卡片失败。", details: enhancedResponse.error.message },
        { status: 500 },
      );
    }

    if (enhancedResponse.error && isMissingColumnError(enhancedResponse.error.message)) {
      const legacyResponse = await supabase
        .from("cards")
        .select("id, source_text, target_text, source_lang, target_lang, next_review_at")
        .eq("user_id", userKey)
        .lte("next_review_at", new Date().toISOString())
        .order("next_review_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (legacyResponse.error) {
        return NextResponse.json(
          { error: "加载待复习卡片失败。", details: legacyResponse.error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        card: legacyResponse.data
          ? {
              id: legacyResponse.data.id,
              sourceText: legacyResponse.data.source_text,
              targetText: legacyResponse.data.target_text,
              sourceLang: legacyResponse.data.source_lang,
              targetLang: legacyResponse.data.target_lang,
              nextReviewAt: legacyResponse.data.next_review_at,
              reviewCount: 0,
              intervalDays: 0,
              easeFactor: 2.5,
              lastGrade: null,
            }
          : null,
      });
    }

    return NextResponse.json({
      card: enhancedResponse.data
        ? {
            id: enhancedResponse.data.id,
            sourceText: enhancedResponse.data.source_text,
            targetText: enhancedResponse.data.target_text,
            sourceLang: enhancedResponse.data.source_lang,
            targetLang: enhancedResponse.data.target_lang,
            nextReviewAt: enhancedResponse.data.next_review_at,
            reviewCount: enhancedResponse.data.review_count,
            intervalDays: enhancedResponse.data.interval_days,
            easeFactor: enhancedResponse.data.ease_factor,
            lastGrade: enhancedResponse.data.last_grade,
          }
        : null,
    });
  }

  const card = getSqlite()
    .prepare<
      [string],
      {
        id: string;
        sourceText: string;
        targetText: string;
        sourceLang: string;
        targetLang: string;
        nextReviewAt: string;
        reviewCount: number;
        intervalDays: number;
        easeFactor: number;
        lastGrade: number | null;
      }
    >(
      `SELECT id,
              source_text as sourceText,
              target_text as targetText,
              source_lang as sourceLang,
              target_lang as targetLang,
              next_review_at as nextReviewAt,
              review_count as reviewCount,
              interval_days as intervalDays,
              ease_factor as easeFactor,
              last_grade as lastGrade
       FROM cards
       WHERE user_id = ?
         AND datetime(next_review_at) <= datetime('now')
       ORDER BY datetime(next_review_at) ASC
       LIMIT 1`,
    )
    .get(userKey);

  return NextResponse.json({ card: card ?? null });
}
