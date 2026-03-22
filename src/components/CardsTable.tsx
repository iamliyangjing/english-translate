"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import LoginPrompt from "@/components/LoginPrompt";

type Card = {
  id: string;
  sourceText: string;
  targetText: string;
  pronunciation: string | null;
  tags: string | null;
  createdAt: string;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const splitTags = (value: string | null) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function CardsTable() {
  const [cards, setCards] = useState<Card[]>([]);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    sourceText: "",
    targetText: "",
    pronunciation: "",
    tags: "",
  });
  const { status } = useSession();
  const isAuthed = status === "authenticated";
  const authLoading = status === "loading";

  const queryRef = useRef(query);
  const tagRef = useRef(tag);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    tagRef.current = tag;
  }, [tag]);

  const loadCards = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    setSelected(new Set());

    const params = new URLSearchParams();
    const currentQuery = queryRef.current.trim();
    const currentTag = tagRef.current.trim();

    if (currentQuery) {
      params.set("q", currentQuery);
    }

    if (currentTag) {
      params.set("tag", currentTag);
    }

    try {
      const response = await fetch(`/api/cards?${params.toString()}`);
      const data = (await response.json()) as { cards?: Card[]; error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "加载卡片失败，请先登录。");
        setCards([]);
        return;
      }

      setCards(data.cards ?? []);
    } catch {
      setMessage("加载卡片失败，请检查网络连接。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (isAuthed) {
      void loadCards();
      return;
    }

    setLoading(false);
  }, [authLoading, isAuthed, loadCards]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (prev.size === cards.length) {
        return new Set();
      }
      return new Set(cards.map((card) => card.id));
    });
  };

  const startEdit = (card: Card) => {
    setEditingId(card.id);
    setEditDraft({
      sourceText: card.sourceText,
      targetText: card.targetText,
      pronunciation: card.pronunciation ?? "",
      tags: card.tags ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    try {
      const response = await fetch("/api/cards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          sourceText: editDraft.sourceText,
          targetText: editDraft.targetText,
          pronunciation: editDraft.pronunciation,
          tags: editDraft.tags,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "更新失败。");
        return;
      }

      setEditingId(null);
      await loadCards();
    } catch {
      setMessage("更新失败，请稍后再试。");
    }
  };

  const deleteCard = async (id: string) => {
    if (!confirm("确定删除这张卡片吗？")) {
      return;
    }

    try {
      const response = await fetch("/api/cards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "删除失败。");
        return;
      }

      await loadCards();
    } catch {
      setMessage("删除失败，请稍后再试。");
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) {
      return;
    }

    if (!confirm(`确定删除 ${selected.size} 张卡片吗？`)) {
      return;
    }

    try {
      const response = await fetch("/api/cards/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "批量删除失败。");
        return;
      }

      await loadCards();
    } catch {
      setMessage("批量删除失败，请稍后再试。");
    }
  };

  if (!isAuthed && !loading && !authLoading) {
    return (
      <LoginPrompt
        title="登录后管理卡片库"
        description="登录后可查看、编辑、批量管理并导出你的翻译卡片。"
      />
    );
  }

  const selectedCount = selected.size;
  const totalTags = new Set(cards.flatMap((card) => splitTags(card.tags))).size;

  return (
    <section className="relative overflow-hidden rounded-[36px] border border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,243,234,0.92))] p-6 shadow-[0_30px_80px_rgba(39,27,18,0.08)] md:p-8">
      <div className="pointer-events-none absolute -right-20 top-0 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(219,167,92,0.22),transparent_70%)]" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(52,120,92,0.14),transparent_72%)]" />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
              Library
            </p>
            <h1 className="mt-3 font-serif text-3xl text-neutral-950 md:text-4xl">
              卡片库
            </h1>
            <p className="mt-3 text-sm leading-6 text-neutral-600 md:text-base">
              把收藏、筛选、编辑和导出放到一个更顺手的工作区里。你可以快速查找近期卡片，也能直接在列表里修订内容。
            </p>
          </div>

          <button
            onClick={() => (window.location.href = "/api/cards/export")}
            className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800"
          >
            导出 CSV
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-neutral-400">
              总卡片
            </p>
            <p className="mt-3 text-3xl font-semibold text-neutral-950">
              {cards.length}
            </p>
            <p className="mt-2 text-sm text-neutral-500">当前查询结果中的卡片数量</p>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-neutral-400">
              已选中
            </p>
            <p className="mt-3 text-3xl font-semibold text-neutral-950">
              {selectedCount}
            </p>
            <p className="mt-2 text-sm text-neutral-500">可直接执行批量删除操作</p>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-neutral-400">
              标签数
            </p>
            <p className="mt-3 text-3xl font-semibold text-neutral-950">
              {totalTags}
            </p>
            <p className="mt-2 text-sm text-neutral-500">帮助你快速切换学习主题</p>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto]">
            <input
              className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30 focus:ring-4 focus:ring-black/5"
              placeholder="搜索原文或译文"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <input
              className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30 focus:ring-4 focus:ring-black/5"
              placeholder="按标签筛选，例如 travel"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
            />
            <button
              onClick={() => void loadCards()}
              className="rounded-2xl border border-black/10 bg-neutral-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              应用筛选
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
            <label className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-2">
              <input
                type="checkbox"
                checked={cards.length > 0 && selected.size === cards.length}
                onChange={toggleSelectAll}
              />
              全选当前列表
            </label>

            <button
              onClick={() => void bulkDelete()}
              disabled={selectedCount === 0}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              批量删除
            </button>

            <span className="rounded-full bg-black/5 px-3 py-2 text-neutral-500">
              已选 {selectedCount} 张
            </span>
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {message}
          </p>
        ) : null}

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-[28px] border border-dashed border-black/10 bg-white/70 px-6 py-14 text-center text-sm text-neutral-400">
              正在整理你的卡片库...
            </div>
          ) : cards.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-black/10 bg-white/70 px-6 py-14 text-center">
              <p className="text-lg font-medium text-neutral-800">还没有匹配到卡片</p>
              <p className="mt-2 text-sm text-neutral-500">
                试试调整关键词，或者回到工作台先添加几张新卡片。
              </p>
            </div>
          ) : (
            cards.map((card) => {
              const tags = splitTags(card.tags);
              const isEditing = editingId === card.id;

              return (
                <article
                  key={card.id}
                  className="group rounded-[30px] border border-white/80 bg-white/82 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(31,24,20,0.08)]"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex gap-4">
                      <label className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white">
                        <input
                          type="checkbox"
                          checked={selected.has(card.id)}
                          onChange={() => toggleSelect(card.id)}
                          className="h-3.5 w-3.5"
                        />
                      </label>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-amber-700">
                            Front
                          </span>
                          <span className="text-xs text-neutral-400">
                            {formatDate(card.createdAt)}
                          </span>
                        </div>

                        {isEditing ? (
                          <textarea
                            className="mt-3 min-h-24 w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-black/30 focus:ring-4 focus:ring-black/5"
                            value={editDraft.sourceText}
                            onChange={(event) =>
                              setEditDraft((prev) => ({
                                ...prev,
                                sourceText: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          <p className="mt-3 text-lg leading-8 text-neutral-950">
                            {card.sourceText}
                          </p>
                        )}

                        <div className="mt-5 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-700">
                            Back
                          </span>
                        </div>

                        {isEditing ? (
                          <textarea
                            className="mt-3 min-h-24 w-full rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-black/30 focus:ring-4 focus:ring-black/5"
                            value={editDraft.targetText}
                            onChange={(event) =>
                              setEditDraft((prev) => ({
                                ...prev,
                                targetText: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          <p className="mt-3 text-base leading-7 text-neutral-700">
                            {card.targetText}
                          </p>
                        )}
                      </div>
                    </div>

                    <aside className="w-full xl:max-w-xs">
                      <div className="rounded-[24px] border border-black/10 bg-[linear-gradient(180deg,rgba(250,248,243,0.96),rgba(255,255,255,0.92))] p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-neutral-400">
                          Card Meta
                        </p>

                        {isEditing ? (
                          <div className="mt-4 space-y-3">
                            <div>
                              <label className="text-xs text-neutral-500">发音 / 备注</label>
                              <input
                                className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black/30"
                                value={editDraft.pronunciation}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    pronunciation: event.target.value,
                                  }))
                                }
                              />
                            </div>

                            <div>
                              <label className="text-xs text-neutral-500">标签</label>
                              <input
                                className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black/30"
                                value={editDraft.tags}
                                onChange={(event) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    tags: event.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 space-y-4 text-sm text-neutral-600">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                                发音
                              </p>
                              <p className="mt-1 rounded-2xl bg-white px-3 py-2.5 text-neutral-700">
                                {card.pronunciation || "未填写"}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                                标签
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {tags.length > 0 ? (
                                  tags.map((item) => (
                                    <span
                                      key={`${card.id}-${item}`}
                                      className="rounded-full bg-white px-3 py-1 text-xs text-neutral-600"
                                    >
                                      {item}
                                    </span>
                                  ))
                                ) : (
                                  <span className="rounded-full bg-white px-3 py-1 text-xs text-neutral-500">
                                    暂无标签
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </aside>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => void saveEdit(card.id)}
                          className="rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
                        >
                          保存修改
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-full border border-black/10 px-4 py-2 text-sm text-neutral-700 transition hover:bg-black/5"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(card)}
                          className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 transition hover:bg-black/5"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => void deleteCard(card.id)}
                          className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition hover:bg-red-100"
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
