import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "app.db");
export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
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
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    next_review_at TEXT NOT NULL,
    last_grade INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
  CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards(next_review_at);
`);

const columns = db.prepare("PRAGMA table_info(cards)").all() as {
  name: string;
}[];

const hasUserId = columns.some((col) => col.name === "user_id");
if (!hasUserId) {
  db.exec("ALTER TABLE cards ADD COLUMN user_id TEXT");
  db.exec("UPDATE cards SET user_id = user_email WHERE user_id IS NULL");
  db.exec("CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id)");
}
