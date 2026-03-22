import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSqlite } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

type BulkDeleteBody = {
  ids?: string[];
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userKey = session?.user?.id || session?.user?.email;
  if (!userKey) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  const body = (await request.json()) as BulkDeleteBody;
  const ids = body.ids?.filter(Boolean) ?? [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "请选择要删除的卡片。" },
      { status: 400 },
    );
  }

  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase
      .from("cards")
      .delete()
      .in("id", ids)
      .eq("user_id", userKey);

    if (error) {
      return NextResponse.json(
        { error: "批量删除失败。", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, count: ids.length });
  }

  const sqlite = getSqlite();
  const deleteStmt = sqlite.prepare<[string, string]>(
    "DELETE FROM cards WHERE id = ? AND user_id = ?",
  );
  const transaction = sqlite.transaction((cardIds: string[]) => {
    for (const id of cardIds) {
      deleteStmt.run(id, userKey);
    }
  });

  transaction(ids);

  return NextResponse.json({ ok: true, count: ids.length });
}
