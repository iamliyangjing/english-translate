"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import LoginPrompt from "@/components/LoginPrompt";
import { useI18n, type Locale } from "@/components/LocaleProvider";
import { DEFAULT_DECK_NAME, type ImportFormat } from "@/lib/card-import";

type CardView = "active" | "favorites" | "archived" | "all";
type Card = {
  id: string; sourceText: string; targetText: string; pronunciation: string | null; tags: string | null;
  deckName: string; notes: string | null; exampleSentence: string | null; sourceContext: string | null;
  isFavorite: boolean; archivedAt: string | null; createdAt: string;
};
type Draft = {
  sourceText: string; targetText: string; pronunciation: string; tags: string; deckName: string;
  notes: string; exampleSentence: string; sourceContext: string; isFavorite: boolean;
};

const fieldClass = "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30 focus:ring-4 focus:ring-black/5";
const viewLabelMap: Record<CardView, { zh: string; en: string }> = {
  active: { zh: "进行中", en: "Active" },
  favorites: { zh: "收藏", en: "Favorites" },
  archived: { zh: "归档", en: "Archived" },
  all: { zh: "全部卡片", en: "All cards" },
};
const formatDate = (value: string, locale: Locale) =>
  new Date(value).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", year: "numeric" });
const splitTags = (value: string | null) => (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);

export default function CardsTable() {
  const [cards, setCards] = useState<Card[]>([]);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [deck, setDeck] = useState("");
  const [view, setView] = useState<CardView>("active");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    sourceText: "", targetText: "", pronunciation: "", tags: "", deckName: DEFAULT_DECK_NAME,
    notes: "", exampleSentence: "", sourceContext: "", isFavorite: false,
  });
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importDeckName, setImportDeckName] = useState(DEFAULT_DECK_NAME);
  const [importFormat, setImportFormat] = useState<ImportFormat>("csv");
  const [importing, setImporting] = useState(false);

  const { status } = useSession();
  const { locale, t } = useI18n();
  const isAuthed = status === "authenticated";
  const authLoading = status === "loading";
  const queryRef = useRef(query);
  const tagRef = useRef(tag);
  const deckRef = useRef(deck);
  const viewRef = useRef(view);

  useEffect(() => { queryRef.current = query; }, [query]);
  useEffect(() => { tagRef.current = tag; }, [tag]);
  useEffect(() => { deckRef.current = deck; }, [deck]);
  useEffect(() => { viewRef.current = view; }, [view]);

  const viewLabels = useMemo(
    () => Object.fromEntries((Object.keys(viewLabelMap) as CardView[]).map((key) => [key, t(viewLabelMap[key])])) as Record<CardView, string>,
    [t],
  );
  const decks = useMemo(() => Array.from(new Set(cards.map((card) => card.deckName))).sort(), [cards]);

  const loadCards = useCallback(async () => {
    setLoading(true); setMessage(null); setSelected(new Set());
    const params = new URLSearchParams();
    if (queryRef.current.trim()) params.set("q", queryRef.current.trim());
    if (tagRef.current.trim()) params.set("tag", tagRef.current.trim());
    if (deckRef.current.trim()) params.set("deck", deckRef.current.trim());
    params.set("view", viewRef.current);
    try {
      const response = await fetch(`/api/cards?${params.toString()}`);
      const data = (await response.json()) as { cards?: Card[]; error?: string };
      if (!response.ok) {
        setMessage(data.error ?? t({ zh: "加载卡片失败。", en: "Failed to load cards." }));
        setCards([]);
        return;
      }
      setCards(data.cards ?? []);
    } catch {
      setMessage(t({ zh: "加载卡片失败。", en: "Failed to load cards." }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthed) { void loadCards(); return; }
    setLoading(false);
  }, [authLoading, isAuthed, loadCards]);

  const patchCard = async (id: string, payload: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/cards", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...payload }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? t({ zh: "更新卡片失败。", en: "Update failed." }));
        return;
      }
      await loadCards();
    } catch {
      setMessage(t({ zh: "更新卡片失败。", en: "Update failed." }));
    }
  };

  const saveEdit = async (id: string) => { await patchCard(id, draft); setEditingId(null); };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(t({ zh: `确认删除这 ${selected.size} 张卡片吗？`, en: `Delete ${selected.size} cards?` }))) return;
    try {
      const response = await fetch("/api/cards/bulk-delete", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(data.error ?? t({ zh: "批量删除失败。", en: "Bulk delete failed." }));
        return;
      }
      await loadCards();
    } catch {
      setMessage(t({ zh: "批量删除失败。", en: "Bulk delete failed." }));
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      setMessage(t({ zh: "请先粘贴 CSV 或 TSV 内容。", en: "Paste some CSV or TSV content first." }));
      return;
    }
    setImporting(true); setMessage(null);
    try {
      const response = await fetch("/api/cards/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: importText, format: importFormat, deckName: importDeckName }),
      });
      const data = (await response.json()) as { imported?: number; deckName?: string; error?: string };
      if (!response.ok) {
        setMessage(data.error ?? t({ zh: "导入失败。", en: "Import failed." }));
        return;
      }
      setMessage(t({
        zh: `已导入 ${data.imported ?? 0} 张卡片到 ${data.deckName ?? importDeckName}。`,
        en: `Imported ${data.imported ?? 0} cards into ${data.deckName ?? importDeckName}.`,
      }));
      setImportText(""); setImportOpen(false); await loadCards();
    } catch {
      setMessage(t({ zh: "导入失败。", en: "Import failed." }));
    } finally {
      setImporting(false);
    }
  };

  if (!isAuthed && !loading && !authLoading) {
    return <LoginPrompt title={t({ zh: "登录后管理卡片", en: "Sign in to manage cards" })} description={t({ zh: "登录后可导入、整理、富化、归档并导出你的学习卡片。", en: "Sign in to import, organize, enrich, archive, and export your study cards." })} />;
  }

  return (
    <section className="relative overflow-hidden rounded-[36px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,243,234,0.92))] p-6 shadow-[0_30px_80px_rgba(39,27,18,0.08)] md:p-8">
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">{t({ zh: "卡片库", en: "Library" })}</p>
            <h1 className="mt-3 font-serif text-3xl text-neutral-950 md:text-4xl">{t({ zh: "卡片库与学习组织", en: "Card library and study organization" })}</h1>
            <p className="mt-3 text-sm leading-6 text-neutral-600 md:text-base">{t({ zh: "批量导入卡片，按卡组组织内容，并通过收藏与归档保持卡片库清晰有序。", en: "Import cards in bulk, group them by deck, and organize the library with favorites and archives." })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setImportOpen((prev) => !prev)} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 transition hover:bg-black/5">{importOpen ? t({ zh: "收起导入器", en: "Hide importer" }) : t({ zh: "导入卡片", en: "Import cards" })}</button>
            <button onClick={() => (window.location.href = "/api/cards/export")} className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800">{t({ zh: "导出 CSV", en: "Export CSV" })}</button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <StatCard label={t({ zh: "卡片", en: "Cards" })} value={String(cards.length)} note={viewLabels[view]} />
          <StatCard label={t({ zh: "卡组", en: "Decks" })} value={String(decks.length)} note={t({ zh: "当前视图中的卡组数量", en: "Deck groups in this view" })} />
          <StatCard label={t({ zh: "收藏", en: "Favorites" })} value={String(cards.filter((card) => card.isFavorite).length)} note={t({ zh: "高价值学习项", en: "High-value study items" })} />
          <StatCard label={t({ zh: "归档", en: "Archived" })} value={String(cards.filter((card) => card.archivedAt).length)} note={t({ zh: "暂时停放的卡片", en: "Temporarily parked cards" })} />
        </div>

        <div className="mt-6 rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {(["active", "favorites", "archived", "all"] as CardView[]).map((item) => (
              <button key={item} onClick={() => { setView(item); viewRef.current = item; void loadCards(); }} className={`rounded-full px-4 py-2 text-sm transition ${view === item ? "bg-neutral-950 text-white" : "border border-black/10 bg-white text-neutral-700 hover:bg-black/5"}`}>{viewLabels[item]}</button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.8fr_0.8fr_auto]">
            <input className={fieldClass} placeholder={t({ zh: "搜索原文、译文、备注、例句或上下文", en: "Search text, notes, example, or context" })} value={query} onChange={(e) => setQuery(e.target.value)} />
            <input className={fieldClass} placeholder={t({ zh: "按标签筛选", en: "Filter by tag" })} value={tag} onChange={(e) => setTag(e.target.value)} />
            <input className={fieldClass} placeholder={t({ zh: "按卡组筛选", en: "Filter by deck" })} value={deck} onChange={(e) => setDeck(e.target.value)} list="deck-options" />
            <button onClick={() => void loadCards()} className="rounded-2xl border border-black/10 bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800">{t({ zh: "应用筛选", en: "Apply" })}</button>
            <datalist id="deck-options">{decks.map((item) => <option key={item} value={item} />)}</datalist>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
            <label className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-2">
              <input type="checkbox" checked={cards.length > 0 && selected.size === cards.length} onChange={() => setSelected((prev) => prev.size === cards.length ? new Set() : new Set(cards.map((card) => card.id)))} />
              {t({ zh: "全选", en: "Select all" })}
            </label>
            <button onClick={() => void bulkDelete()} disabled={selected.size === 0} className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40">{t({ zh: "批量删除", en: "Bulk delete" })}</button>
            <span className="rounded-full bg-black/5 px-3 py-2 text-neutral-500">{t({ zh: `已选 ${selected.size} 项`, en: `${selected.size} selected` })}</span>
          </div>
        </div>

        {importOpen ? (
          <div className="mt-6 rounded-[28px] border border-black/10 bg-[linear-gradient(180deg,rgba(249,246,238,0.95),rgba(255,255,255,0.94))] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">{t({ zh: "导入器", en: "Importer" })}</p>
                <p className="mt-1 text-sm text-neutral-500">{t({ zh: "支持表头：sourceText、targetText、deckName、tags、notes、exampleSentence、sourceContext、pronunciation。", en: "Supported headers: sourceText, targetText, deckName, tags, notes, exampleSentence, sourceContext, pronunciation." })}</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <select value={importFormat} onChange={(e) => setImportFormat(e.target.value as ImportFormat)} className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm"><option value="csv">CSV</option><option value="tsv">TSV</option></select>
                <input value={importDeckName} onChange={(e) => setImportDeckName(e.target.value)} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm" placeholder={DEFAULT_DECK_NAME} />
              </div>
            </div>
            <textarea className="mt-4 min-h-48 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/30" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="sourceText,targetText,deckName,tags,notes,exampleSentence,sourceContext" />
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => void handleImport()} disabled={importing} className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400">{importing ? t({ zh: "导入中...", en: "Importing..." }) : t({ zh: "开始导入", en: "Run import" })}</button>
              <span className="rounded-full bg-white px-3 py-2 text-xs text-neutral-500">{t({ zh: `缺失卡组时会回退到 ${importDeckName || DEFAULT_DECK_NAME}`, en: `Missing deck values fall back to ${importDeckName || DEFAULT_DECK_NAME}` })}</span>
            </div>
          </div>
        ) : null}

        {message ? <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-[28px] border border-dashed border-black/10 bg-white/70 px-6 py-14 text-center text-sm text-neutral-400">{t({ zh: "卡片加载中...", en: "Loading cards..." })}</div>
          ) : cards.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/10 bg-white/70 px-6 py-14 text-center">
              <p className="text-lg font-medium text-neutral-800">{t({ zh: "没有找到卡片", en: "No cards found" })}</p>
              <p className="mt-2 text-sm text-neutral-500">{t({ zh: "试试调整筛选条件，或者先通过导入器批量加入卡片。", en: "Adjust the filters, or use the importer to add a batch of cards." })}</p>
            </div>
          ) : cards.map((card) => {
            const isEditing = editingId === card.id;
            const tags = splitTags(card.tags);
            return (
              <article key={card.id} className="rounded-[28px] border border-white/80 bg-white/82 p-5 shadow-sm">
                <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
                  <div className="flex gap-4">
                    <input type="checkbox" checked={selected.has(card.id)} onChange={() => setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(card.id)) next.delete(card.id); else next.add(card.id);
                      return next;
                    })} className="mt-1 h-4 w-4" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-amber-700">{card.deckName}</span>
                        {card.isFavorite ? <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-medium text-rose-700">{t({ zh: "收藏", en: "Favorite" })}</span> : null}
                        {card.archivedAt ? <span className="rounded-full bg-neutral-200 px-3 py-1 text-[11px] text-neutral-600">{t({ zh: "已归档", en: "Archived" })}</span> : null}
                        <span className="text-xs text-neutral-400">{formatDate(card.createdAt, locale)}</span>
                      </div>
                      {isEditing ? (
                        <div className="mt-3 grid gap-3">
                          <textarea className={`${fieldClass} min-h-24`} value={draft.sourceText} onChange={(e) => setDraft((prev) => ({ ...prev, sourceText: e.target.value }))} />
                          <textarea className={`${fieldClass} min-h-24`} value={draft.targetText} onChange={(e) => setDraft((prev) => ({ ...prev, targetText: e.target.value }))} />
                        </div>
                      ) : (
                        <>
                          <p className="mt-3 text-lg leading-8 text-neutral-950">{card.sourceText}</p>
                          <p className="mt-3 text-base leading-7 text-neutral-700">{card.targetText}</p>
                        </>
                      )}
                      {!isEditing && (card.notes || card.exampleSentence || card.sourceContext) ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          {card.notes ? <MetaBlock label={t({ zh: "备注", en: "Notes" })} value={card.notes} /> : null}
                          {card.exampleSentence ? <MetaBlock label={t({ zh: "例句", en: "Example" })} value={card.exampleSentence} /> : null}
                          {card.sourceContext ? <MetaBlock label={t({ zh: "上下文", en: "Context" })} value={card.sourceContext} /> : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="w-full xl:max-w-sm rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,rgba(250,248,243,0.96),rgba(255,255,255,0.92))] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-neutral-400">{t({ zh: "元信息", en: "Meta" })}</p>
                    {isEditing ? (
                      <div className="mt-4 space-y-3">
                        <input className={fieldClass} placeholder={t({ zh: "卡组", en: "Deck" })} value={draft.deckName} onChange={(e) => setDraft((prev) => ({ ...prev, deckName: e.target.value }))} />
                        <input className={fieldClass} placeholder={t({ zh: "标签", en: "Tags" })} value={draft.tags} onChange={(e) => setDraft((prev) => ({ ...prev, tags: e.target.value }))} />
                        <input className={fieldClass} placeholder={t({ zh: "发音", en: "Pronunciation" })} value={draft.pronunciation} onChange={(e) => setDraft((prev) => ({ ...prev, pronunciation: e.target.value }))} />
                        <textarea className={`${fieldClass} min-h-20`} placeholder={t({ zh: "备注", en: "Notes" })} value={draft.notes} onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))} />
                        <textarea className={`${fieldClass} min-h-20`} placeholder={t({ zh: "例句", en: "Example sentence" })} value={draft.exampleSentence} onChange={(e) => setDraft((prev) => ({ ...prev, exampleSentence: e.target.value }))} />
                        <textarea className={`${fieldClass} min-h-20`} placeholder={t({ zh: "上下文来源", en: "Source context" })} value={draft.sourceContext} onChange={(e) => setDraft((prev) => ({ ...prev, sourceContext: e.target.value }))} />
                        <label className="inline-flex items-center gap-2 text-sm text-neutral-600"><input type="checkbox" checked={draft.isFavorite} onChange={(e) => setDraft((prev) => ({ ...prev, isFavorite: e.target.checked }))} />{t({ zh: "收藏这张卡片", en: "Favorite this card" })}</label>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-4 text-sm text-neutral-600">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">{t({ zh: "发音", en: "Pronunciation" })}</p>
                          <p className="mt-1 rounded-2xl bg-white px-3 py-2.5 text-neutral-700">{card.pronunciation || t({ zh: "空", en: "Empty" })}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">{t({ zh: "标签", en: "Tags" })}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {tags.length > 0 ? tags.map((item) => <span key={`${card.id}-${item}`} className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600">{item}</span>) : <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-500">{t({ zh: "无标签", en: "No tags" })}</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {isEditing ? (
                    <>
                      <button onClick={() => void saveEdit(card.id)} className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800">{t({ zh: "保存修改", en: "Save changes" })}</button>
                      <button onClick={() => setEditingId(null)} className="rounded-full border border-black/10 px-4 py-2 text-sm text-neutral-700 transition hover:bg-black/5">{t({ zh: "取消", en: "Cancel" })}</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => void patchCard(card.id, { isFavorite: !card.isFavorite })} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 transition hover:bg-black/5">{card.isFavorite ? t({ zh: "取消收藏", en: "Unfavorite" }) : t({ zh: "收藏", en: "Favorite" })}</button>
                      <button onClick={() => void patchCard(card.id, { archivedAt: card.archivedAt ? null : new Date().toISOString() })} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 transition hover:bg-black/5">{card.archivedAt ? t({ zh: "恢复", en: "Restore" }) : t({ zh: "归档", en: "Archive" })}</button>
                      <button onClick={() => {
                        setEditingId(card.id);
                        setDraft({
                          sourceText: card.sourceText, targetText: card.targetText, pronunciation: card.pronunciation ?? "", tags: card.tags ?? "", deckName: card.deckName,
                          notes: card.notes ?? "", exampleSentence: card.exampleSentence ?? "", sourceContext: card.sourceContext ?? "", isFavorite: card.isFavorite,
                        });
                      }} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 transition hover:bg-black/5">{t({ zh: "编辑", en: "Edit" })}</button>
                      <button onClick={() => void (async () => {
                        if (!confirm(t({ zh: "确认删除这张卡片吗？", en: "Delete this card?" }))) return;
                        try {
                          const response = await fetch("/api/cards", {
                            method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: card.id }),
                          });
                          const data = (await response.json()) as { error?: string };
                          if (!response.ok) {
                            setMessage(data.error ?? t({ zh: "删除卡片失败。", en: "Delete failed." }));
                            return;
                          }
                          await loadCards();
                        } catch {
                          setMessage(t({ zh: "删除卡片失败。", en: "Delete failed." }));
                        }
                      })()} className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition hover:bg-red-100">{t({ zh: "删除", en: "Delete" })}</button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-3xl border border-white/70 bg-white/75 p-4 shadow-sm"><p className="text-xs uppercase tracking-[0.22em] text-neutral-400">{label}</p><p className="mt-3 text-3xl font-semibold text-neutral-950">{value}</p><p className="mt-2 text-sm text-neutral-500">{note}</p></div>;
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-neutral-50 px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-neutral-400">{label}</p><p className="mt-2 text-sm leading-6 text-neutral-700">{value}</p></div>;
}
