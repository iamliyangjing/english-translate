import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSqlite } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

type CreateCardBody = {
  sourceText?: string;
  targetText?: string;
  sourceLang?: string;
  targetLang?: string;
  pronunciation?: string;
  tags?: string;
};

type UpdateCardBody = {
  id?: string;
  sourceText?: string;
  targetText?: string;
  pronunciation?: string;
  tags?: string;
};

type CardRow = {
  id: string;
  user_id: string;
  user_email: string | null;
  source_text: string;
  target_text: string;
  source_lang: string;
  target_lang: string;
  pronunciation: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
  next_review_at: string;
  last_grade: number | null;
};

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "未登录。" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const tag = searchParams.get("tag")?.trim();

    const supabase = getSupabase();
    if (supabase) {
      let builder = supabase
        .from<CardRow>("cards")
        .select("id, source_text, target_text, pronunciation, tags, created_at")
        .eq("user_id", userKey)
        .order("created_at", { ascending: false })
        .limit(200);

      if (query) {
        builder = builder.or(
          `source_text.ilike.%${query}%,target_text.ilike.%${query}%`,
        );
      }
      if (tag) {
        builder = builder.ilike("tags", `%${tag}%`);
      }

      const { data, error } = await builder;
      if (error) {
        return NextResponse.json(
          { error: "卡片加载失败。", details: error.message },
          { status: 500 },
        );
      }

      const cards = (data ?? []).map((row) => ({
        id: row.id,
        sourceText: row.source_text,
        targetText: row.target_text,
        pronunciation: row.pronunciation,
        tags: row.tags,
        createdAt: row.created_at,
      }));

      return NextResponse.json({ cards });
    }

    const filters: string[] = ["user_id = ?"];
    const values: (string | number)[] = [userKey];

    if (query) {
      filters.push("(source_text LIKE ? OR target_text LIKE ?)");
      values.push(`%${query}%`, `%${query}%`);
    }

    if (tag) {
      filters.push("tags LIKE ?");
      values.push(`%${tag}%`);
    }

    const sql = `
      SELECT id, source_text as sourceText, target_text as targetText,
             pronunciation, tags, created_at as createdAt
      FROM cards
      WHERE ${filters.join(" AND ")}
      ORDER BY datetime(created_at) DESC
      LIMIT 200
    `;

    const cards = getSqlite().prepare(sql).all(...values);

    return NextResponse.json({ cards });
  } catch (error) {
    return NextResponse.json(
      { error: "卡片加载失败。", details: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "未登录。" }, { status: 401 });
    }

    const body = (await request.json()) as CreateCardBody;
    const sourceText = body.sourceText?.trim();
    const targetText = body.targetText?.trim();

    if (!sourceText || !targetText) {
      return NextResponse.json(
        { error: "需要原文与译文。" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const nextReviewAt = now;
    const id = randomUUID();

    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from<CardRow>("cards")
        .insert({
          id,
          user_id: userKey,
          user_email: session?.user?.email ?? null,
          source_text: sourceText,
          target_text: targetText,
          source_lang: body.sourceLang?.trim() || "English",
          target_lang: body.targetLang?.trim() || "Chinese",
          pronunciation: body.pronunciation?.trim() || null,
          tags: body.tags?.trim() || null,
          created_at: now,
          updated_at: now,
          next_review_at: nextReviewAt,
          last_grade: null,
        })
        .select("id, source_text, target_text")
        .single();

      if (error) {
        return NextResponse.json(
          { error: "保存卡片失败。", details: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        card: {
          id: data.id,
          sourceText: data.source_text,
          targetText: data.target_text,
        },
      });
    }

    getSqlite().prepare(
      `INSERT INTO cards (
        id, user_id, user_email, source_text, target_text, source_lang, target_lang,
        pronunciation, tags, created_at, updated_at, next_review_at, last_grade
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      userKey,
      session?.user?.email ?? null,
      sourceText,
      targetText,
      body.sourceLang?.trim() || "English",
      body.targetLang?.trim() || "Chinese",
      body.pronunciation?.trim() || null,
      body.tags?.trim() || null,
      now,
      now,
      nextReviewAt,
      null,
    );

    return NextResponse.json({
      card: {
        id,
        sourceText,
        targetText,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "保存卡片失败。", details: String(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "未登录。" }, { status: 401 });
    }

    const body = (await request.json()) as UpdateCardBody;
    const id = body.id?.trim();
    if (!id) {
      return NextResponse.json({ error: "缺少卡片 ID。" }, { status: 400 });
    }

    const existing = getSqlite()
      .prepare("SELECT id FROM cards WHERE id = ? AND user_id = ? LIMIT 1")
      .get(id, userKey) as { id: string } | undefined;

    if (!existing) {
      return NextResponse.json({ error: "卡片不存在。" }, { status: 404 });
    }

    const sourceText = body.sourceText?.trim();
    const targetText = body.targetText?.trim();

    if (!sourceText || !targetText) {
      return NextResponse.json(
        { error: "需要原文与译文。" },
        { status: 400 },
      );
    }

    const supabase = getSupabase();
    if (supabase) {
      const { data: existing } = await supabase
        .from("cards")
        .select("id")
        .eq("id", id)
        .eq("user_id", userKey)
        .maybeSingle();

      if (!existing) {
        return NextResponse.json({ error: "卡片不存在。" }, { status: 404 });
      }

      const { error } = await supabase
        .from("cards")
        .update({
          source_text: sourceText,
          target_text: targetText,
          pronunciation: body.pronunciation?.trim() || null,
          tags: body.tags?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userKey);

      if (error) {
        return NextResponse.json(
          { error: "更新卡片失败。", details: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true });
    }

    getSqlite().prepare(
      `UPDATE cards
       SET source_text = ?, target_text = ?, pronunciation = ?, tags = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
    ).run(
      sourceText,
      targetText,
      body.pronunciation?.trim() || null,
      body.tags?.trim() || null,
      new Date().toISOString(),
      id,
      userKey,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "更新卡片失败。", details: String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "未登录。" }, { status: 401 });
    }

    const body = (await request.json()) as { id?: string };
    const id = body.id?.trim();
    if (!id) {
      return NextResponse.json({ error: "缺少卡片 ID。" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from("cards")
        .delete()
        .eq("id", id)
        .eq("user_id", userKey);

      if (error) {
        return NextResponse.json(
          { error: "删除卡片失败。", details: error.message },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    getSqlite().prepare("DELETE FROM cards WHERE id = ? AND user_id = ?").run(
      id,
      userKey,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "删除卡片失败。", details: String(error) },
      { status: 500 },
    );
  }
}
