import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { getSqlite } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    }

    const supabase = getSupabase();
    if (supabase) {
      const totalReq = supabase
        .from("cards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userKey);
      const dueReq = supabase
        .from("cards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userKey)
        .lte("next_review_at", new Date().toISOString());

      const [
        { count: totalCount, error: totalError },
        { count: dueCount, error: dueError },
      ] = await Promise.all([totalReq, dueReq]);

      if (totalError || dueError) {
        return NextResponse.json(
          {
            error: "获取统计失败。",
            details: totalError?.message || dueError?.message,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        total: totalCount ?? 0,
        due: dueCount ?? 0,
      });
    }

    const sqlite = getSqlite();
    const totalRow = sqlite
      .prepare<[string], { count: number }>(
        "SELECT COUNT(1) as count FROM cards WHERE user_id = ?",
      )
      .get(userKey);
    const dueRow = sqlite
      .prepare<[string], { count: number }>(
        "SELECT COUNT(1) as count FROM cards WHERE user_id = ? AND datetime(next_review_at) <= datetime('now')",
      )
      .get(userKey);

    return NextResponse.json({
      total: totalRow?.count ?? 0,
      due: dueRow?.count ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "获取统计失败。", details: String(error) },
      { status: 500 },
    );
  }
}
