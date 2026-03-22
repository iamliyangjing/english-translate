import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "node:crypto";
import type { Database } from "@/lib/database.types";
import { authOptions } from "@/lib/auth";
import { getSqlite } from "@/lib/db";
import { isMissingColumnError } from "@/lib/supabase-errors";
import { getSupabase } from "@/lib/supabase";

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

type CardRow = Database["public"]["Tables"]["cards"]["Row"];
type CardInsert = Database["public"]["Tables"]["cards"]["Insert"];
type CardUpdate = Database["public"]["Tables"]["cards"]["Update"];

type CardListItem = Pick<
  CardRow,
  "id" | "source_text" | "target_text" | "pronunciation" | "tags" | "created_at"
>;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const tag = searchParams.get("tag")?.trim();

    const supabase = getSupabase();
    if (supabase) {
      let builder = supabase
        .from("cards")
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
          { error: "加载卡片失败。", details: error.message },
          { status: 500 },
        );
      }

      const cards = (data ?? []).map((row: CardListItem) => ({
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
    const values: string[] = [userKey];

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

    const cards = getSqlite()
      .prepare<
        string[],
        {
          id: string;
          sourceText: string;
          targetText: string;
          pronunciation: string | null;
          tags: string | null;
          createdAt: string;
        }
      >(sql)
      .all(...values);

    return NextResponse.json({ cards });
  } catch (error) {
    return NextResponse.json(
      { error: "加载卡片失败。", details: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    }

    const body = (await request.json()) as CreateCardBody;
    const sourceText = body.sourceText?.trim();
    const targetText = body.targetText?.trim();

    if (!sourceText || !targetText) {
      return NextResponse.json(
        { error: "请填写原文和译文。" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const id = randomUUID();
    const payload: CardInsert = {
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
      next_review_at: now,
      last_grade: null,
      review_count: 0,
      lapse_count: 0,
      ease_factor: 2.5,
      interval_days: 0,
      last_reviewed_at: null,
    };

    const supabase = getSupabase();
    if (supabase) {
      const enhancedInsert = await supabase
        .from("cards")
        .insert(payload)
        .select("id, source_text, target_text")
        .single();

      if (enhancedInsert.error && isMissingColumnError(enhancedInsert.error.message)) {
        const legacyInsert = await supabase
          .from("cards")
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
            next_review_at: now,
            last_grade: null,
          })
          .select("id, source_text, target_text")
          .single();

        if (legacyInsert.error) {
          return NextResponse.json(
            { error: "保存卡片失败。", details: legacyInsert.error.message },
            { status: 500 },
          );
        }

        return NextResponse.json({
          card: {
            id: legacyInsert.data.id,
            sourceText: legacyInsert.data.source_text,
            targetText: legacyInsert.data.target_text,
          },
        });
      }

      if (enhancedInsert.error) {
        return NextResponse.json(
          { error: "保存卡片失败。", details: enhancedInsert.error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        card: {
          id: enhancedInsert.data.id,
          sourceText: enhancedInsert.data.source_text,
          targetText: enhancedInsert.data.target_text,
        },
      });
    }

    getSqlite()
      .prepare<
        [
          string,
          string,
          string | null,
          string,
          string,
          string,
          string,
          string | null,
          string | null,
          string,
          string,
          string,
          number | null,
          number,
          number,
          number,
          number,
          string | null,
        ]
      >(
        `INSERT INTO cards (
          id, user_id, user_email, source_text, target_text, source_lang, target_lang,
          pronunciation, tags, created_at, updated_at, next_review_at, last_grade,
          review_count, lapse_count, ease_factor, interval_days, last_reviewed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
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
        now,
        null,
        0,
        0,
        2.5,
        0,
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
      return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    }

    const body = (await request.json()) as UpdateCardBody;
    const id = body.id?.trim();
    const sourceText = body.sourceText?.trim();
    const targetText = body.targetText?.trim();

    if (!id) {
      return NextResponse.json({ error: "缺少卡片 ID。" }, { status: 400 });
    }

    if (!sourceText || !targetText) {
      return NextResponse.json(
        { error: "请填写原文和译文。" },
        { status: 400 },
      );
    }

    const payload: CardUpdate = {
      source_text: sourceText,
      target_text: targetText,
      pronunciation: body.pronunciation?.trim() || null,
      tags: body.tags?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabase();
    if (supabase) {
      const { data: existing, error: existingError } = await supabase
        .from("cards")
        .select("id")
        .eq("id", id)
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
        .update(payload)
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

    const sqlite = getSqlite();
    const existing = sqlite
      .prepare<[string, string], { id: string }>(
        "SELECT id FROM cards WHERE id = ? AND user_id = ? LIMIT 1",
      )
      .get(id, userKey);

    if (!existing) {
      return NextResponse.json({ error: "卡片不存在。" }, { status: 404 });
    }

    sqlite
      .prepare<[string, string, string | null, string | null, string, string, string]>(
        `UPDATE cards
         SET source_text = ?, target_text = ?, pronunciation = ?, tags = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`,
      )
      .run(
        sourceText,
        targetText,
        body.pronunciation?.trim() || null,
        body.tags?.trim() || null,
        payload.updated_at ?? new Date().toISOString(),
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
      return NextResponse.json({ error: "请先登录。" }, { status: 401 });
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

    getSqlite()
      .prepare<[string, string]>("DELETE FROM cards WHERE id = ? AND user_id = ?")
      .run(id, userKey);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "删除卡片失败。", details: String(error) },
      { status: 500 },
    );
  }
}
