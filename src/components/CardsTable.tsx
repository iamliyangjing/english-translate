"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import LoginPrompt from "@/components/LoginPrompt";

type Card = {
  id: string;
  sourceText: string;
  targetText: string;
  pronunciation: string | null;
  tags: string | null;
  createdAt: string;
};

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

  const loadCards = async () => {
    setLoading(true);
    setMessage(null);
    setSelected(new Set());
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (tag.trim()) params.set("tag", tag.trim());

    try {
      const res = await fetch(`/api/cards?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "加载失败，请先登录。");
        setCards([]);
        return;
      }
      setCards(data.cards ?? []);
    } catch (error) {
      setMessage("加载失败，请检查网络。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (isAuthed) {
      loadCards();
    } else {
      setLoading(false);
    }
  }, [isAuthed, authLoading]);

  if (!isAuthed && !loading && !authLoading) {
    return (
      <LoginPrompt
        title="登录后管理卡片"
        description="登录后可查看、编辑、批量管理并导出 Anki。"
      />
    );
  }

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
      const res = await fetch("/api/cards", {
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
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "更新失败。");
        return;
      }
      setEditingId(null);
      await loadCards();
    } catch (error) {
      setMessage("更新失败，请稍后再试。");
    }
  };

  const deleteCard = async (id: string) => {
    if (!confirm("确定删除这张卡片吗？")) return;
    try {
      const res = await fetch("/api/cards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "删除失败。");
        return;
      }
      await loadCards();
    } catch (error) {
      setMessage("删除失败，请稍后再试。");
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定删除 ${selected.size} 张卡片吗？`)) return;
    try {
      const res = await fetch("/api/cards/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "批量删除失败。");
        return;
      }
      await loadCards();
    } catch (error) {
      setMessage("批量删除失败，请稍后再试。");
    }
  };

  return (
    <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-neutral-900">卡片库</h1>
          <p className="text-sm text-neutral-500">
            管理你的翻译卡片，并导出到 Anki。
          </p>
        </div>
        <button
          onClick={() => (window.location.href = "/api/cards/export")}
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          导出 CSV
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-[1.1fr_0.9fr_auto]">
        <input
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
          placeholder="搜索原文或译文"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <input
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
          placeholder="标签过滤，如 travel"
          value={tag}
          onChange={(event) => setTag(event.target.value)}
        />
        <button
          onClick={loadCards}
          className="rounded-2xl border border-black/10 px-4 py-3 text-sm transition hover:bg-black/5"
        >
          筛选
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={cards.length > 0 && selected.size === cards.length}
            onChange={toggleSelectAll}
          />
          全选当前列表
        </label>
        <button
          onClick={bulkDelete}
          disabled={selected.size === 0}
          className="rounded-full border border-black/10 px-3 py-2 text-sm transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          批量删除
        </button>
        <span>已选 {selected.size} 张</span>
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl bg-black/5 px-4 py-3 text-sm text-neutral-700">
          {message}
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-sm text-neutral-400">加载中...</p>
        ) : cards.length === 0 ? (
          <p className="text-sm text-neutral-500">暂无卡片。</p>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              className="rounded-2xl border border-black/10 bg-white px-4 py-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(card.id)}
                    onChange={() => toggleSelect(card.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-neutral-400">原文</p>
                    {editingId === card.id ? (
                      <textarea
                        className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                        value={editDraft.sourceText}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            sourceText: event.target.value,
                          }))
                        }
                      />
                    ) : (
                      <p className="text-base text-neutral-900">
                        {card.sourceText}
                      </p>
                    )}
                    <p className="mt-3 text-sm text-neutral-400">译文</p>
                    {editingId === card.id ? (
                      <textarea
                        className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                        value={editDraft.targetText}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            targetText: event.target.value,
                          }))
                        }
                      />
                    ) : (
                      <p className="text-base text-neutral-900">
                        {card.targetText}
                      </p>
                    )}
                  </div>
                </div>
                <div className="min-w-[180px] text-xs text-neutral-500">
                  <p>
                    添加时间：
                    {new Date(card.createdAt).toLocaleDateString()}
                  </p>
                  {editingId === card.id ? (
                    <>
                      <label className="mt-3 block text-[11px] text-neutral-400">
                        发音/备注
                      </label>
                      <input
                        className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                        value={editDraft.pronunciation}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            pronunciation: event.target.value,
                          }))
                        }
                      />
                      <label className="mt-3 block text-[11px] text-neutral-400">
                        标签
                      </label>
                      <input
                        className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                        value={editDraft.tags}
                        onChange={(event) =>
                          setEditDraft((prev) => ({
                            ...prev,
                            tags: event.target.value,
                          }))
                        }
                      />
                    </>
                  ) : (
                    <>
                      {card.pronunciation ? (
                        <p className="mt-2">发音：{card.pronunciation}</p>
                      ) : null}
                      {card.tags ? <p className="mt-2">标签：{card.tags}</p> : null}
                    </>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {editingId === card.id ? (
                  <>
                    <button
                      onClick={() => saveEdit(card.id)}
                      className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-medium text-white"
                    >
                      保存
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded-full border border-black/10 px-4 py-2 text-xs"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(card)}
                      className="rounded-full border border-black/10 px-4 py-2 text-xs"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => deleteCard(card.id)}
                      className="rounded-full border border-black/10 px-4 py-2 text-xs text-red-600"
                    >
                      删除
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
