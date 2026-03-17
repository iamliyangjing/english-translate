import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

type GradeBody = {
  cardId?: string;
  grade?: number;
};

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
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
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

  const supabase = getSupabase();
  if (supabase) {
    const { data: existing } = await supabase
      .from("cards")
      .select("id")
      .eq("id", cardId)
      .eq("user_id", userKey)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "卡片不存在。" }, { status: 404 });
    }

    const nextReviewAt = addDays(new Date(), intervalDays[grade]);
    const { error } = await supabase
      .from("cards")
      .update({
        next_review_at: nextReviewAt.toISOString(),
        last_grade: grade,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cardId)
      .eq("user_id", userKey);

    if (error) {
      return NextResponse.json(
        { error: "评分失败。", details: error.message },
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

  const existing = db
    .prepare(
      "SELECT id FROM cards WHERE id = ? AND user_id = ? LIMIT 1",
    )
    .get(cardId, userKey) as { id: string } | undefined;

  if (!existing) {
    return NextResponse.json({ error: "卡片不存在。" }, { status: 404 });
  }

  const nextReviewAt = addDays(new Date(), intervalDays[grade]);

  db.prepare(
    `UPDATE cards
     SET next_review_at = ?, last_grade = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
  ).run(
    nextReviewAt.toISOString(),
    grade,
    new Date().toISOString(),
    cardId,
    userKey,
  );

  const card = {
    id: cardId,
    nextReviewAt,
    lastGrade: grade,
  };

  return NextResponse.json({ card });
}
