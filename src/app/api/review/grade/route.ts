import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Database } from "@/lib/database.types";
import { authOptions } from "@/lib/auth";
import { getSqlite } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

type GradeBody = {
  cardId?: string;
  grade?: number;
};

type CardUpdate = Database["public"]["Tables"]["cards"]["Update"];

const intervalDays: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userKey = session?.user?.id || session?.user?.email;
  if (!userKey) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const body = (await request.json()) as GradeBody;
  const cardId = body.cardId;
  const grade = body.grade;

  if (!cardId || !grade || !intervalDays[grade]) {
    return NextResponse.json(
      { error: "评分参数无效。" },
      { status: 400 },
    );
  }

  const nextReviewAt = addDays(new Date(), intervalDays[grade]);
  const updatePayload: CardUpdate = {
    next_review_at: nextReviewAt.toISOString(),
    last_grade: grade,
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data: existing, error: existingError } = await supabase
      .from("cards")
      .select("id")
      .eq("id", cardId)
      .eq("user_id", userKey)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: "加载卡片失败。", details: existingError.message },
        { status: 500 },
      );
    }

    if (!existing) {
      return NextResponse.json({ error: "卡片不存在。" }, { status: 404 });
    }

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
        nextReviewAt,
        lastGrade: grade,
      },
    });
  }

  const sqlite = getSqlite();
  const existing = sqlite
    .prepare<[string, string], { id: string }>(
      "SELECT id FROM cards WHERE id = ? AND user_id = ? LIMIT 1",
    )
    .get(cardId, userKey);

  if (!existing) {
    return NextResponse.json({ error: "卡片不存在。" }, { status: 404 });
  }

  sqlite
    .prepare<[string, number, string, string, string]>(
      `UPDATE cards
       SET next_review_at = ?, last_grade = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
    )
    .run(
      nextReviewAt.toISOString(),
      grade,
      updatePayload.updated_at ?? new Date().toISOString(),
      cardId,
      userKey,
    );

  return NextResponse.json({
    card: {
      id: cardId,
      nextReviewAt,
      lastGrade: grade,
    },
  });
}
