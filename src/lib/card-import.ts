import { randomUUID } from "node:crypto";

export const DEFAULT_DECK_NAME = "Inbox";

export type ImportFormat = "csv" | "tsv";

export type ParsedImportCard = {
  id: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  pronunciation: string | null;
  tags: string | null;
  deckName: string;
  notes: string | null;
  exampleSentence: string | null;
  sourceContext: string | null;
  isFavorite: boolean;
};

const headerAliases: Record<string, keyof ParsedImportCard | null> = {
  source: "sourceText",
  sourcetext: "sourceText",
  original: "sourceText",
  front: "sourceText",
  target: "targetText",
  targettext: "targetText",
  translation: "targetText",
  back: "targetText",
  sourcelang: "sourceLang",
  targetlang: "targetLang",
  pronunciation: "pronunciation",
  phonetic: "pronunciation",
  tags: "tags",
  deck: "deckName",
  deckname: "deckName",
  notes: "notes",
  note: "notes",
  example: "exampleSentence",
  examplesentence: "exampleSentence",
  context: "sourceContext",
  sourcecontext: "sourceContext",
  favorite: "isFavorite",
  isfavorite: "isFavorite",
  archivedat: null,
};

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const clean = (value: string | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
};

const parseBoolean = (value: string | undefined) => {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const parseDelimited = (content: string, delimiter: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
};

const hasHeaderRow = (row: string[]) => {
  const normalized = row.map(normalizeHeader);
  return normalized.some((item) => item in headerAliases);
};

const mapPositionalRow = (row: string[], defaultDeckName?: string): ParsedImportCard | null => {
  const sourceText = clean(row[0]);
  const targetText = clean(row[1]);

  if (!sourceText || !targetText) {
    return null;
  }

  return {
    id: randomUUID(),
    sourceText,
    targetText,
    sourceLang: clean(row[2]) ?? "English",
    targetLang: clean(row[3]) ?? "Chinese",
    deckName: clean(row[4]) ?? defaultDeckName ?? DEFAULT_DECK_NAME,
    tags: clean(row[5]),
    notes: clean(row[6]),
    exampleSentence: clean(row[7]),
    sourceContext: clean(row[8]),
    pronunciation: clean(row[9]),
    isFavorite: parseBoolean(row[10]),
  };
};

const mapHeaderRow = (
  headers: string[],
  row: string[],
  defaultDeckName?: string,
): ParsedImportCard | null => {
  const record = headers.reduce<Record<string, string>>((accumulator, header, index) => {
    accumulator[header] = row[index] ?? "";
    return accumulator;
  }, {});

  const sourceText = clean(record.sourceText);
  const targetText = clean(record.targetText);

  if (!sourceText || !targetText) {
    return null;
  }

  return {
    id: randomUUID(),
    sourceText,
    targetText,
    sourceLang: clean(record.sourceLang) ?? "English",
    targetLang: clean(record.targetLang) ?? "Chinese",
    pronunciation: clean(record.pronunciation),
    tags: clean(record.tags),
    deckName: clean(record.deckName) ?? defaultDeckName ?? DEFAULT_DECK_NAME,
    notes: clean(record.notes),
    exampleSentence: clean(record.exampleSentence),
    sourceContext: clean(record.sourceContext),
    isFavorite: parseBoolean(record.isFavorite),
  };
};

export const parseImportCards = (
  content: string,
  format: ImportFormat,
  defaultDeckName?: string,
) => {
  const delimiter = format === "tsv" ? "\t" : ",";
  const rows = parseDelimited(content, delimiter);

  if (rows.length === 0) {
    return [];
  }

  if (hasHeaderRow(rows[0])) {
    const headers = rows[0].map((item) => {
      const mapped = headerAliases[normalizeHeader(item)];
      return mapped ?? "";
    });

    return rows
      .slice(1)
      .map((row) => mapHeaderRow(headers, row, defaultDeckName))
      .filter((row): row is ParsedImportCard => row !== null);
  }

  return rows
    .map((row) => mapPositionalRow(row, defaultDeckName))
    .filter((row): row is ParsedImportCard => row !== null);
};
