import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSqlite } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userKey = session?.user?.id || session?.user?.email;
  if (!userKey) {
    return NextResponse.json({ error: "未登录。" }, { status: 401 });
  }

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("cards")
      .select(
        "id, source_text, target_text, source_lang, target_lang, next_review_at",
      )
      .eq("user_id", userKey)
      .lte("next_review_at", new Date().toISOString())
      .order("next_review_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "加载复习卡片失败。", details: error.message },
        { status: 500 },
      );
    }

    const card = data
      ? {
          id: data.id,
          sourceText: data.source_text,
          targetText: data.target_text,
          sourceLang: data.source_lang,
          targetLang: data.target_lang,
        }
      : null;

    return NextResponse.json({ card });
  }

  const card = getSqlite()
    .prepare(
      `SELECT id, source_text as sourceText, target_text as targetText,
              source_lang as sourceLang, target_lang as targetLang
       FROM cards
       WHERE user_id = ?
         AND datetime(next_review_at) <= datetime('now')
       ORDER BY datetime(next_review_at) ASC
       LIMIT 1`,
    )
    .get(userKey) as
    | {
        id: string;
        sourceText: string;
        targetText: string;
        sourceLang: string;
        targetLang: string;
      }
    | undefined;

  return NextResponse.json({ card });
}
