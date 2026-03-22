import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  DEFAULT_DECK_NAME,
  parseImportCards,
  type ImportFormat,
} from "@/lib/card-import";
import type { Database } from "@/lib/database.types";
import { getSqlite } from "@/lib/db";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

type ImportBody = {
  content?: string;
  format?: ImportFormat;
  deckName?: string;
};

type CardInsert = Database["public"]["Tables"]["cards"]["Insert"];

const clean = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const body = (await request.json()) as ImportBody;
    const content = body.content?.trim();
    const defaultDeckName = clean(body.deckName) ?? DEFAULT_DECK_NAME;

    if (!content) {
      return NextResponse.json(
        { error: "Paste CSV or TSV content before importing." },
        { status: 400 },
      );
    }

    const parsedCards = parseImportCards(
      content,
      body.format === "tsv" ? "tsv" : "csv",
      defaultDeckName,
    ).slice(0, 200);

    if (parsedCards.length === 0) {
      return NextResponse.json(
        { error: "No valid rows were found in the import content." },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const payloads: CardInsert[] = parsedCards.map((card) => ({
      id: card.id,
      user_id: userKey,
      user_email: session?.user?.email ?? null,
      source_text: card.sourceText,
      target_text: card.targetText,
      source_lang: card.sourceLang,
      target_lang: card.targetLang,
      pronunciation: card.pronunciation,
      tags: card.tags,
      deck_name: card.deckName,
      notes: card.notes,
      example_sentence: card.exampleSentence,
      source_context: card.sourceContext,
      is_favorite: card.isFavorite,
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
    }));

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from("cards").insert(payloads);
      if (error) {
        return NextResponse.json(
          { error: "Failed to import cards.", details: error.message },
          { status: 500 },
        );
      }
    } else {
      const sqlite = getSqlite();
      const insert = sqlite.prepare<
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
      );

      const transaction = sqlite.transaction((rows: CardInsert[]) => {
        for (const row of rows) {
          insert.run(
            row.id,
            row.user_id,
            row.user_email ?? null,
            row.source_text,
            row.target_text,
            row.source_lang,
            row.target_lang,
            row.pronunciation ?? null,
            row.tags ?? null,
            row.deck_name ?? DEFAULT_DECK_NAME,
            row.notes ?? null,
            row.example_sentence ?? null,
            row.source_context ?? null,
            row.is_favorite ? 1 : 0,
            null,
            row.created_at ?? now,
            row.updated_at ?? now,
            row.next_review_at ?? now,
            row.last_grade ?? null,
            row.review_count ?? 0,
            row.lapse_count ?? 0,
            row.ease_factor ?? 2.5,
            row.interval_days ?? 0,
            row.last_reviewed_at ?? null,
          );
        }
      });

      transaction(payloads);
    }

    return NextResponse.json({
      imported: payloads.length,
      deckName: defaultDeckName,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to import cards.", details: String(error) },
      { status: 500 },
    );
  }
}
