import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { getSqlite } from "@/lib/db";

export const runtime = "nodejs";

type ModelConfigRow = {
  id: string;
  user_id: string;
  is_active: boolean;
};

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    }

    const pathSegments = new URL(_request.url).pathname
      .split("/")
      .filter(Boolean);
    const fallbackId =
      pathSegments[pathSegments.length - 1] === "activate"
        ? pathSegments[pathSegments.length - 2]
        : pathSegments[pathSegments.length - 1];
    const id = params?.id || fallbackId || "";
    if (!id) {
      return NextResponse.json({ error: "缺少配置 ID。" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const supabase = getSupabase();
    if (supabase) {
      const { data: existing } = await supabase
        .from<ModelConfigRow>("model_configs")
        .select("id")
        .eq("id", id)
        .eq("user_id", userKey)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json({ error: "配置不存在。" }, { status: 404 });
      }

      await supabase
        .from<ModelConfigRow>("model_configs")
        .update({ is_active: false, updated_at: now })
        .eq("user_id", userKey);

      const { error } = await supabase
        .from<ModelConfigRow>("model_configs")
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
        .prepare(
          "SELECT id FROM model_configs WHERE id = ? AND user_id = ? LIMIT 1",
        )
        .get(id, userKey) as { id: string } | undefined;
      if (!existing) {
        throw new Error("NOT_FOUND");
      }
      sqlite
        .prepare(
          "UPDATE model_configs SET is_active = 0, updated_at = ? WHERE user_id = ?",
        )
        .run(now, userKey);
      sqlite
        .prepare(
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
