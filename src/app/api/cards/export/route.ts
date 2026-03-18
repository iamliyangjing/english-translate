import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSqlite } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

const escapeCsv = (value: string) =>
  `"${value.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

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
      .select("source_text, target_text, pronunciation")
      .eq("user_id", userKey)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "导出失败。", details: error.message },
        { status: 500 },
      );
    }

    const rows = (
      (data ?? []) as Array<{
        source_text: string;
        target_text: string;
        pronunciation: string | null;
      }>
    ).map((card) => [
      escapeCsv(card.source_text),
      escapeCsv(card.target_text),
      escapeCsv(card.pronunciation ?? ""),
    ]);

    const csv = rows.map((row) => row.join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=anki-cards.csv",
      },
    });
  }

  const cards = getSqlite()
    .prepare(
      `SELECT source_text as sourceText, target_text as targetText, pronunciation
       FROM cards WHERE user_id = ? ORDER BY datetime(created_at) DESC`,
    )
    .all(userKey) as {
    sourceText: string;
    targetText: string;
    pronunciation: string | null;
  }[];

  const rows = cards.map((card) => [
    escapeCsv(card.sourceText),
    escapeCsv(card.targetText),
    escapeCsv(card.pronunciation ?? ""),
  ]);

  const csv = rows.map((row) => row.join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=anki-cards.csv",
    },
  });
}
