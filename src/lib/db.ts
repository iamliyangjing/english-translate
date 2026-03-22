import fs from "fs";
import path from "path";
import { createRequire } from "module";
import type BetterSqliteDatabase from "better-sqlite3";

const require = createRequire(import.meta.url);

const hasSupabaseConfig = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

let db: BetterSqliteDatabase | null = null;

const initSqlite = () => {
  if (db) {
    return db;
  }

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "app.db");
  const Database = require("better-sqlite3") as typeof BetterSqliteDatabase;
  const sqlite = new Database(dbPath);

  sqlite.pragma("journal_mode = WAL");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      source_text TEXT NOT NULL,
      target_text TEXT NOT NULL,
      source_lang TEXT NOT NULL,
      target_lang TEXT NOT NULL,
      pronunciation TEXT,
      tags TEXT,
      deck_name TEXT NOT NULL DEFAULT 'Inbox',
      notes TEXT,
      example_sentence TEXT,
      source_context TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      next_review_at TEXT NOT NULL,
      last_grade INTEGER,
      review_count INTEGER NOT NULL DEFAULT 0,
      lapse_count INTEGER NOT NULL DEFAULT 0,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval_days REAL NOT NULL DEFAULT 0,
      last_reviewed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
    CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards(next_review_at);

    CREATE TABLE IF NOT EXISTS model_configs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      model TEXT NOT NULL,
      api_endpoint TEXT,
      api_key TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_model_configs_user ON model_configs(user_id);
    CREATE INDEX IF NOT EXISTS idx_model_configs_user_active ON model_configs(user_id, is_active);
  `);

  const columns = sqlite.prepare("PRAGMA table_info(cards)").all() as {
    name: string;
  }[];

  const hasUserId = columns.some((col) => col.name === "user_id");
  if (!hasUserId) {
    sqlite.exec("ALTER TABLE cards ADD COLUMN user_id TEXT");
    sqlite.exec("UPDATE cards SET user_id = user_email WHERE user_id IS NULL");
    sqlite.exec("CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id)");
  }

  const ensureCardsColumn = (name: string, definition: string) => {
    if (!columns.some((col) => col.name === name)) {
      sqlite.exec(`ALTER TABLE cards ADD COLUMN ${name} ${definition}`);
    }
  };

  ensureCardsColumn("review_count", "INTEGER NOT NULL DEFAULT 0");
  ensureCardsColumn("lapse_count", "INTEGER NOT NULL DEFAULT 0");
  ensureCardsColumn("ease_factor", "REAL NOT NULL DEFAULT 2.5");
  ensureCardsColumn("interval_days", "REAL NOT NULL DEFAULT 0");
  ensureCardsColumn("last_reviewed_at", "TEXT");
  ensureCardsColumn("deck_name", "TEXT NOT NULL DEFAULT 'Inbox'");
  ensureCardsColumn("notes", "TEXT");
  ensureCardsColumn("example_sentence", "TEXT");
  ensureCardsColumn("source_context", "TEXT");
  ensureCardsColumn("is_favorite", "INTEGER NOT NULL DEFAULT 0");
  ensureCardsColumn("archived_at", "TEXT");

  db = sqlite;
  return sqlite;
};

export const getSqlite = () => {
  if (hasSupabaseConfig) {
    throw new Error(
      "SQLite disabled because SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.",
    );
  }
  return initSqlite();
};

export const hasSqliteFallback = () => !hasSupabaseConfig;
