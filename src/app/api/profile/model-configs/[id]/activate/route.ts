import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { getSqlite } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "缺少配置 ID。" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const supabase = getSupabase();
    if (supabase) {
      const { data: existing, error: existingError } = await supabase
        .from("model_configs")
        .select("id")
        .eq("id", id)
        .eq("user_id", userKey)
        .maybeSingle();

      if (existingError) {
        return NextResponse.json(
          { error: "加载配置失败。", details: existingError.message },
          { status: 500 },
        );
      }

      if (!existing) {
        return NextResponse.json({ error: "配置不存在。" }, { status: 404 });
      }

      await supabase
        .from("model_configs")
        .update({ is_active: false, updated_at: now })
        .eq("user_id", userKey);

      const { error } = await supabase
        .from("model_configs")
        .update({ is_active: true, updated_at: now })
        .eq("id", id)
        .eq("user_id", userKey);

      if (error) {
        return NextResponse.json(
          { error: "切换配置失败。", details: error.message },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    const sqlite = getSqlite();
    const tx = sqlite.transaction(() => {
      const existing = sqlite
        .prepare<[string, string], { id: string }>(
          "SELECT id FROM model_configs WHERE id = ? AND user_id = ? LIMIT 1",
        )
        .get(id, userKey);
      if (!existing) {
        throw new Error("NOT_FOUND");
      }
      sqlite
        .prepare<[string, string]>(
          "UPDATE model_configs SET is_active = 0, updated_at = ? WHERE user_id = ?",
        )
        .run(now, userKey);
      sqlite
        .prepare<[string, string, string]>(
          "UPDATE model_configs SET is_active = 1, updated_at = ? WHERE id = ? AND user_id = ?",
        )
        .run(now, id, userKey);
    });

    try {
      tx();
    } catch (error) {
      if (error instanceof Error && error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "配置不存在。" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "切换配置失败。", details: String(error) },
      { status: 500 },
    );
  }
}
