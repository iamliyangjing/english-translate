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
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const header = [
    "sourceText",
    "targetText",
    "sourceLang",
    "targetLang",
    "deckName",
    "tags",
    "pronunciation",
    "notes",
    "exampleSentence",
    "sourceContext",
    "isFavorite",
  ];

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("cards")
      .select(
        "source_text, target_text, source_lang, target_lang, deck_name, tags, pronunciation, notes, example_sentence, source_context, is_favorite",
      )
      .eq("user_id", userKey)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to export cards.", details: error.message },
        { status: 500 },
      );
    }

    const rows = (data ?? []).map((card) => [
      escapeCsv(card.source_text),
      escapeCsv(card.target_text),
      escapeCsv(card.source_lang),
      escapeCsv(card.target_lang),
      escapeCsv(card.deck_name),
      escapeCsv(card.tags ?? ""),
      escapeCsv(card.pronunciation ?? ""),
      escapeCsv(card.notes ?? ""),
      escapeCsv(card.example_sentence ?? ""),
      escapeCsv(card.source_context ?? ""),
      escapeCsv(card.is_favorite ? "true" : "false"),
    ]);

    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=anki-cards.csv",
      },
    });
  }

  const cards = getSqlite()
    .prepare<
      [string],
      {
        sourceText: string;
        targetText: string;
        sourceLang: string;
        targetLang: string;
        deckName: string;
        tags: string | null;
        pronunciation: string | null;
        notes: string | null;
        exampleSentence: string | null;
        sourceContext: string | null;
        isFavorite: number;
      }
    >(
      `SELECT source_text as sourceText,
              target_text as targetText,
              source_lang as sourceLang,
              target_lang as targetLang,
              deck_name as deckName,
              tags,
              pronunciation,
              notes,
              example_sentence as exampleSentence,
              source_context as sourceContext,
              is_favorite as isFavorite
       FROM cards
       WHERE user_id = ?
       ORDER BY datetime(created_at) DESC`,
    )
    .all(userKey);

  const rows = cards.map((card) => [
    escapeCsv(card.sourceText),
    escapeCsv(card.targetText),
    escapeCsv(card.sourceLang),
    escapeCsv(card.targetLang),
    escapeCsv(card.deckName),
    escapeCsv(card.tags ?? ""),
    escapeCsv(card.pronunciation ?? ""),
    escapeCsv(card.notes ?? ""),
    escapeCsv(card.exampleSentence ?? ""),
    escapeCsv(card.sourceContext ?? ""),
    escapeCsv(card.isFavorite ? "true" : "false"),
  ]);

  const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=anki-cards.csv",
    },
  });
}
