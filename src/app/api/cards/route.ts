import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_DECK_NAME } from "@/lib/card-import";
import type { Database } from "@/lib/database.types";
import { getSqlite } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

type CreateCardBody = {
  sourceText?: string;
  targetText?: string;
  sourceLang?: string;
  targetLang?: string;
  pronunciation?: string;
  tags?: string;
  deckName?: string;
  notes?: string;
  exampleSentence?: string;
  sourceContext?: string;
  isFavorite?: boolean;
};

type UpdateCardBody = CreateCardBody & {
  id?: string;
  archivedAt?: string | null;
};

type CardRow = Database["public"]["Tables"]["cards"]["Row"];
type CardInsert = Database["public"]["Tables"]["cards"]["Insert"];
type CardUpdate = Database["public"]["Tables"]["cards"]["Update"];

type CardListItem = Pick<
  CardRow,
  | "id"
  | "source_text"
  | "target_text"
  | "pronunciation"
  | "tags"
  | "deck_name"
  | "notes"
  | "example_sentence"
  | "source_context"
  | "is_favorite"
  | "archived_at"
  | "created_at"
>;

const clean = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeDeckName = (value?: string | null) =>
  clean(value) ?? DEFAULT_DECK_NAME;

const mapCard = (row: CardListItem) => ({
  id: row.id,
  sourceText: row.source_text,
  targetText: row.target_text,
  pronunciation: row.pronunciation,
  tags: row.tags,
  deckName: row.deck_name,
  notes: row.notes,
  exampleSentence: row.example_sentence,
  sourceContext: row.source_context,
  isFavorite: row.is_favorite,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const tag = searchParams.get("tag")?.trim();
    const deck = searchParams.get("deck")?.trim();
    const view = searchParams.get("view")?.trim() ?? "active";

    const supabase = getSupabase();
    if (supabase) {
      let builder = supabase
        .from("cards")
        .select(
          "id, source_text, target_text, pronunciation, tags, deck_name, notes, example_sentence, source_context, is_favorite, archived_at, created_at",
        )
        .eq("user_id", userKey)
        .order("created_at", { ascending: false })
        .limit(300);

      if (view === "archived") {
        builder = builder.not("archived_at", "is", null);
      } else if (view === "favorites") {
        builder = builder.is("archived_at", null).eq("is_favorite", true);
      } else if (view !== "all") {
        builder = builder.is("archived_at", null);
      }

      if (query) {
        builder = builder.or(
          `source_text.ilike.%${query}%,target_text.ilike.%${query}%,notes.ilike.%${query}%,example_sentence.ilike.%${query}%,source_context.ilike.%${query}%`,
        );
      }

      if (tag) {
        builder = builder.ilike("tags", `%${tag}%`);
      }

      if (deck) {
        builder = builder.eq("deck_name", deck);
      }

      const { data, error } = await builder;
      if (error) {
        return NextResponse.json(
          { error: "Failed to load cards.", details: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        cards: (data ?? []).map((row) => mapCard(row as CardListItem)),
      });
    }

    const filters: string[] = ["user_id = ?"];
    const values: Array<string | number> = [userKey];

    if (view === "archived") {
      filters.push("archived_at IS NOT NULL");
    } else if (view === "favorites") {
      filters.push("archived_at IS NULL");
      filters.push("is_favorite = 1");
    } else if (view !== "all") {
      filters.push("archived_at IS NULL");
    }

    if (query) {
      filters.push(
        "(source_text LIKE ? OR target_text LIKE ? OR IFNULL(notes, '') LIKE ? OR IFNULL(example_sentence, '') LIKE ? OR IFNULL(source_context, '') LIKE ?)",
      );
      values.push(
        `%${query}%`,
        `%${query}%`,
        `%${query}%`,
        `%${query}%`,
        `%${query}%`,
      );
    }

    if (tag) {
      filters.push("IFNULL(tags, '') LIKE ?");
      values.push(`%${tag}%`);
    }

    if (deck) {
      filters.push("deck_name = ?");
      values.push(deck);
    }

    const sql = `
      SELECT id,
             source_text as sourceText,
             target_text as targetText,
             pronunciation,
             tags,
             deck_name as deckName,
             notes,
             example_sentence as exampleSentence,
             source_context as sourceContext,
             is_favorite as isFavorite,
             archived_at as archivedAt,
             created_at as createdAt
      FROM cards
      WHERE ${filters.join(" AND ")}
      ORDER BY datetime(created_at) DESC
      LIMIT 300
    `;

    const cards = getSqlite()
      .prepare<
        Array<string | number>,
        {
          id: string;
          sourceText: string;
          targetText: string;
          pronunciation: string | null;
          tags: string | null;
          deckName: string;
          notes: string | null;
          exampleSentence: string | null;
          sourceContext: string | null;
          isFavorite: number;
          archivedAt: string | null;
          createdAt: string;
        }
      >(sql)
      .all(...values);

    return NextResponse.json({
      cards: cards.map((card) => ({
        ...card,
        isFavorite: Boolean(card.isFavorite),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load cards.", details: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = (await request.json()) as CreateCardBody;
    const sourceText = clean(body.sourceText);
    const targetText = clean(body.targetText);

    if (!sourceText || !targetText) {
      return NextResponse.json(
        { error: "Source text and translation are required." },
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
      source_lang: clean(body.sourceLang) ?? "English",
      target_lang: clean(body.targetLang) ?? "Chinese",
      pronunciation: clean(body.pronunciation),
      tags: clean(body.tags),
      deck_name: normalizeDeckName(body.deckName),
      notes: clean(body.notes),
      example_sentence: clean(body.exampleSentence),
      source_context: clean(body.sourceContext),
      is_favorite: Boolean(body.isFavorite),
      archived_at: null,
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
      const { data, error } = await supabase
        .from("cards")
        .insert(payload)
        .select(
          "id, source_text, target_text, pronunciation, tags, deck_name, notes, example_sentence, source_context, is_favorite, archived_at, created_at",
        )
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Failed to save card.", details: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({ card: mapCard(data as CardListItem) });
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
          string | null,
          string | null,
          string | null,
          number,
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
          pronunciation, tags, deck_name, notes, example_sentence, source_context,
          is_favorite, archived_at, created_at, updated_at, next_review_at, last_grade,
          review_count, lapse_count, ease_factor, interval_days, last_reviewed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        userKey,
        session?.user?.email ?? null,
        payload.source_text,
        payload.target_text,
        payload.source_lang,
        payload.target_lang,
        payload.pronunciation ?? null,
        payload.tags ?? null,
        payload.deck_name ?? DEFAULT_DECK_NAME,
        payload.notes ?? null,
        payload.example_sentence ?? null,
        payload.source_context ?? null,
        payload.is_favorite ? 1 : 0,
        null,
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
        sourceText: payload.source_text,
        targetText: payload.target_text,
        pronunciation: payload.pronunciation ?? null,
        tags: payload.tags ?? null,
        deckName: payload.deck_name,
        notes: payload.notes ?? null,
        exampleSentence: payload.example_sentence ?? null,
        sourceContext: payload.source_context ?? null,
        isFavorite: payload.is_favorite ?? false,
        archivedAt: null,
        createdAt: now,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save card.", details: String(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = (await request.json()) as UpdateCardBody;
    const id = clean(body.id);

    if (!id) {
      return NextResponse.json({ error: "Missing card ID." }, { status: 400 });
    }

    const payload: CardUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (body.sourceText !== undefined) {
      const sourceText = clean(body.sourceText);
      if (!sourceText) {
        return NextResponse.json(
          { error: "Source text cannot be empty." },
          { status: 400 },
        );
      }
      payload.source_text = sourceText;
    }

    if (body.targetText !== undefined) {
      const targetText = clean(body.targetText);
      if (!targetText) {
        return NextResponse.json(
          { error: "Translation cannot be empty." },
          { status: 400 },
        );
      }
      payload.target_text = targetText;
    }

    if (body.pronunciation !== undefined) {
      payload.pronunciation = clean(body.pronunciation);
    }
    if (body.tags !== undefined) {
      payload.tags = clean(body.tags);
    }
    if (body.deckName !== undefined) {
      payload.deck_name = normalizeDeckName(body.deckName);
    }
    if (body.notes !== undefined) {
      payload.notes = clean(body.notes);
    }
    if (body.exampleSentence !== undefined) {
      payload.example_sentence = clean(body.exampleSentence);
    }
    if (body.sourceContext !== undefined) {
      payload.source_context = clean(body.sourceContext);
    }
    if (body.isFavorite !== undefined) {
      payload.is_favorite = Boolean(body.isFavorite);
    }
    if ("archivedAt" in body) {
      payload.archived_at = body.archivedAt ?? null;
    }

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
          { error: "Failed to load card.", details: existingError.message },
          { status: 500 },
        );
      }

      if (!existing) {
        return NextResponse.json({ error: "Card not found." }, { status: 404 });
      }

      const { error } = await supabase
        .from("cards")
        .update(payload)
        .eq("id", id)
        .eq("user_id", userKey);

      if (error) {
        return NextResponse.json(
          { error: "Failed to update card.", details: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true });
    }

    const sqlite = getSqlite();
    const existing = sqlite
      .prepare<
        [string, string],
        {
          id: string;
          source_text: string;
          target_text: string;
          pronunciation: string | null;
          tags: string | null;
          deck_name: string;
          notes: string | null;
          example_sentence: string | null;
          source_context: string | null;
          is_favorite: number;
          archived_at: string | null;
        }
      >(
        `SELECT id, source_text, target_text, pronunciation, tags, deck_name, notes,
                example_sentence, source_context, is_favorite, archived_at
         FROM cards
         WHERE id = ? AND user_id = ?
         LIMIT 1`,
      )
      .get(id, userKey);

    if (!existing) {
      return NextResponse.json({ error: "Card not found." }, { status: 404 });
    }

    sqlite
      .prepare<
        [
          string,
          string,
          string | null,
          string | null,
          string,
          string | null,
          string | null,
          string | null,
          number,
          string | null,
          string,
          string,
          string,
        ]
      >(
        `UPDATE cards
         SET source_text = ?,
             target_text = ?,
             pronunciation = ?,
             tags = ?,
             deck_name = ?,
             notes = ?,
             example_sentence = ?,
             source_context = ?,
             is_favorite = ?,
             archived_at = ?,
             updated_at = ?
         WHERE id = ? AND user_id = ?`,
      )
      .run(
        payload.source_text ?? existing.source_text,
        payload.target_text ?? existing.target_text,
        payload.pronunciation === undefined
          ? existing.pronunciation
          : payload.pronunciation ?? null,
        payload.tags === undefined ? existing.tags : payload.tags ?? null,
        payload.deck_name ?? existing.deck_name ?? DEFAULT_DECK_NAME,
        payload.notes === undefined ? existing.notes : payload.notes ?? null,
        payload.example_sentence === undefined
          ? existing.example_sentence
          : payload.example_sentence ?? null,
        payload.source_context === undefined
          ? existing.source_context
          : payload.source_context ?? null,
        payload.is_favorite === undefined
          ? existing.is_favorite
          : payload.is_favorite
            ? 1
            : 0,
        payload.archived_at === undefined
          ? existing.archived_at
          : payload.archived_at ?? null,
        payload.updated_at ?? new Date().toISOString(),
        id,
        userKey,
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update card.", details: String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = (await request.json()) as { id?: string };
    const id = clean(body.id);
    if (!id) {
      return NextResponse.json({ error: "Missing card ID." }, { status: 400 });
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
          { error: "Failed to delete card.", details: error.message },
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
      { error: "Failed to delete card.", details: String(error) },
      { status: 500 },
    );
  }
}
