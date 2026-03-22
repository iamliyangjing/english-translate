"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import LoginPrompt from "@/components/LoginPrompt";
import { useI18n } from "@/components/LocaleProvider";

type Stats = {
  total: number; due: number; newCards: number; reviewedToday: number; reviewedThisWeek: number;
  mastered: number; learningCards: number; completionRate: number;
};
type ModelConfig = {
  id: string; name: string; model: string; apiEndpoint: string; isActive: boolean; createdAt: string; updatedAt: string;
};

const emptyStats: Stats = { total: 0, due: 0, newCards: 0, reviewedToday: 0, reviewedThisWeek: 0, mastered: 0, learningCards: 0, completionRate: 0 };

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const loading = status === "loading";
  const user = session?.user;

  const [stats, setStats] = useState<Stats>(emptyStats);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [configsLoading, setConfigsLoading] = useState(false);
  const [configsError, setConfigsError] = useState<string | null>(null);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [setActive, setSetActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const canSave = useMemo(() => editingId ? Boolean(name.trim() && model.trim()) : Boolean(name.trim() && model.trim() && apiKey.trim()), [apiKey, editingId, model, name]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    setStatsError(null);
    try {
      const response = await fetch("/api/profile/stats");
      const data = (await response.json()) as Partial<Stats> & { error?: string };
      if (!response.ok) {
        setStatsError(data.error ?? t({ zh: "获取学习统计失败。", en: "Failed to load study stats." }));
        return;
      }
      setStats({
        total: Number(data.total ?? 0), due: Number(data.due ?? 0), newCards: Number(data.newCards ?? 0),
        reviewedToday: Number(data.reviewedToday ?? 0), reviewedThisWeek: Number(data.reviewedThisWeek ?? 0),
        mastered: Number(data.mastered ?? 0), learningCards: Number(data.learningCards ?? 0), completionRate: Number(data.completionRate ?? 0),
      });
    } catch {
      setStatsError(t({ zh: "获取学习统计失败。", en: "Failed to load study stats." }));
    }
  }, [t, user]);

  useEffect(() => { void loadStats(); }, [loadStats]);

  const loadConfigs = useCallback(async () => {
    if (!user) return;
    setConfigsLoading(true); setConfigsError(null);
    try {
      const response = await fetch("/api/profile/model-configs");
      const data = (await response.json()) as { configs?: ModelConfig[]; error?: string };
      if (!response.ok) {
        setConfigsError(data.error ?? t({ zh: "获取模型配置失败。", en: "Failed to load model configs." }));
        return;
      }
      setConfigs(data.configs ?? []);
    } catch {
      setConfigsError(t({ zh: "获取模型配置失败。", en: "Failed to load model configs." }));
    } finally {
      setConfigsLoading(false);
    }
  }, [t, user]);

  useEffect(() => { void loadConfigs(); }, [loadConfigs]);

  const resetForm = () => { setName(""); setModel(""); setApiEndpoint(""); setApiKey(""); setSetActive(true); setEditingId(null); };

  const handleSave = async () => {
    if (!canSave) return;
    setConfigMessage(null);
    try {
      const payload: { name: string; model: string; apiEndpoint: string; apiKey?: string; setActive?: boolean } = { name, model, apiEndpoint };
      if (apiKey.trim()) payload.apiKey = apiKey;
      if (!editingId) payload.setActive = setActive;
      const response = await fetch(editingId ? `/api/profile/model-configs/${editingId}` : "/api/profile/model-configs", {
        method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setConfigMessage(data.error ?? (editingId ? t({ zh: "更新模型配置失败。", en: "Failed to update model config." }) : t({ zh: "保存模型配置失败。", en: "Failed to save model config." })));
        return;
      }
      const wasEditing = Boolean(editingId);
      resetForm();
      setConfigMessage(wasEditing ? t({ zh: "模型配置已更新。", en: "Model config updated." }) : t({ zh: "模型配置已保存。", en: "Model config saved." }));
      await loadConfigs();
    } catch {
      setConfigMessage(editingId ? t({ zh: "更新模型配置失败。", en: "Failed to update model config." }) : t({ zh: "保存模型配置失败。", en: "Failed to save model config." }));
    }
  };

  const handleActivate = async (id: string) => {
    setConfigMessage(null);
    try {
      const response = await fetch(`/api/profile/model-configs/${id}/activate`, { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setConfigMessage(data.error ?? t({ zh: "切换配置失败。", en: "Failed to activate config." }));
        return;
      }
      setConfigMessage(t({ zh: "当前模型配置已切换。", en: "Active model config switched." }));
      await loadConfigs();
    } catch {
      setConfigMessage(t({ zh: "切换配置失败。", en: "Failed to activate config." }));
    }
  };

  const handleDelete = async (id: string) => {
    setConfigMessage(null);
    try {
      const response = await fetch(`/api/profile/model-configs/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" } });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setConfigMessage(data.error ?? t({ zh: "删除配置失败。", en: "Failed to delete config." }));
        return;
      }
      setConfigMessage(t({ zh: "模型配置已删除。", en: "Model config deleted." }));
      await loadConfigs();
    } catch {
      setConfigMessage(t({ zh: "删除配置失败。", en: "Failed to delete config." }));
    }
  };

  const handleEdit = (config: ModelConfig) => {
    setEditingId(config.id); setName(config.name); setModel(config.model); setApiEndpoint(config.apiEndpoint ?? ""); setApiKey(""); setSetActive(false); setConfigMessage(null);
  };

  if (loading) {
    return <main className="mx-auto w-full max-w-5xl px-6 py-10"><p className="text-sm text-neutral-500">{t({ zh: "正在加载个人信息...", en: "Loading profile..." })}</p></main>;
  }

  if (!user) {
    return <main className="mx-auto w-full max-w-5xl px-6 py-10"><LoginPrompt title={t({ zh: "登录后查看个人中心", en: "Sign in to open your profile" })} description={t({ zh: "登录后可查看学习统计、管理模型配置，并同步你的复习节奏。", en: "Sign in to view study stats, manage model configs, and sync your review rhythm." })} actionLabel={t({ zh: "使用 GitHub 登录", en: "Continue with GitHub" })} /></main>;
  }

  const provider = user.id?.includes("github") ? "GitHub" : "OAuth";
  const statCards = [
    { label: t({ zh: "卡片总数", en: "Total cards" }), value: stats.total, note: t({ zh: "累计加入学习空间", en: "Captured in your library" }) },
    { label: t({ zh: "今日待复习", en: "Due today" }), value: stats.due, note: t({ zh: "现在应该处理的卡片", en: "Cards waiting right now" }) },
    { label: t({ zh: "新卡片", en: "New cards" }), value: stats.newCards, note: t({ zh: "仍在建立第一层记忆", en: "Still building the first memory layer" }) },
    { label: t({ zh: "今日已复习", en: "Reviewed today" }), value: stats.reviewedToday, note: t({ zh: "今天已经触达过的卡片", en: "Cards you touched today" }) },
    { label: t({ zh: "本周活跃", en: "Reviewed this week" }), value: stats.reviewedThisWeek, note: t({ zh: "最近 7 天的活跃量", en: "Your last 7 days of activity" }) },
    { label: t({ zh: "已掌握", en: "Mastered" }), value: stats.mastered, note: t({ zh: "复习间隔已明显拉长", en: "Cards with meaningfully longer intervals" }) },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className="rounded-3xl border border-black/10 bg-white/90 p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {user.image ? (
              <Image src={user.image} alt="avatar" width={64} height={64} className="h-16 w-16 rounded-full object-cover" unoptimized />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/10 text-xl font-semibold text-neutral-700">{(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}</div>
            )}
            <div>
              <h1 className="font-serif text-2xl text-neutral-900">{user.name ?? t({ zh: "未命名用户", en: "Unnamed user" })}</h1>
              <p className="text-sm text-neutral-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">{t({ zh: "登录方式", en: "Provider" })}: {provider}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <InfoCard label={t({ zh: "用户 ID", en: "User ID" })} value={user.id ?? ""} />
          <InfoCard label={t({ zh: "邮箱", en: "Email" })} value={user.email ?? t({ zh: "未提供", en: "Not provided" })} />
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-neutral-50 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">{t({ zh: "学习统计", en: "Study stats" })}</p>
              <p className="mt-2 text-sm text-neutral-500">{t({ zh: "这些指标会随着复习评分实时更新，帮助你判断记忆是否在稳定扩张。", en: "These metrics update with each review grade and help you see whether memory is stabilizing." })}</p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-neutral-700">{t({ zh: "当前掌握率", en: "Current mastery" })}: {stats.completionRate}%</div>
          </div>
          {statsError ? <p className="mt-3 text-sm text-neutral-500">{statsError}</p> : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {statCards.map((item) => <div key={item.label} className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-xs uppercase tracking-[0.2em] text-neutral-400">{item.label}</p><p className="mt-2 text-2xl font-semibold text-neutral-900">{item.value}</p><p className="mt-1 text-sm text-neutral-500">{item.note}</p></div>)}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">{t({ zh: "模型配置", en: "Model configs" })}</p>
          <p className="mt-2 text-sm text-neutral-500">{t({ zh: "API Key 保存在服务端。编辑已有配置时，留空 API Key 表示沿用原值。", en: "API keys stay on the server. When editing an existing config, leaving the key blank keeps the current value." })}</p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label={t({ zh: "配置名称", en: "Config name" })}><input className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30" placeholder={t({ zh: "例如：MiniMax 主力", en: "For example: Main MiniMax" })} value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field label={t({ zh: "模型", en: "Model" })}><input className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30" placeholder="MiniMax-M2.5" value={model} onChange={(event) => setModel(event.target.value)} /></Field>
            <Field label={t({ zh: "API 地址（可选）", en: "API endpoint (optional)" })}><input className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30" placeholder="https://api.minimaxi.com/v1" value={apiEndpoint} onChange={(event) => setApiEndpoint(event.target.value)} /></Field>
            <Field label="API Key"><input type="password" className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30" placeholder={editingId ? t({ zh: "留空表示不修改", en: "Leave blank to keep current value" }) : "sk-..."} value={apiKey} onChange={(event) => setApiKey(event.target.value)} /></Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!editingId ? <label className="flex items-center gap-2 text-sm text-neutral-600"><input type="checkbox" checked={setActive} onChange={(event) => setSetActive(event.target.checked)} />{t({ zh: "保存后设为当前配置", en: "Make active after saving" })}</label> : null}
            <button onClick={() => void handleSave()} disabled={!canSave} className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400">{editingId ? t({ zh: "更新配置", en: "Update config" }) : t({ zh: "保存配置", en: "Save config" })}</button>
            {editingId ? <button onClick={resetForm} className="rounded-full border border-black/10 px-4 py-2 text-sm text-neutral-600 transition hover:bg-black/5">{t({ zh: "取消编辑", en: "Cancel" })}</button> : null}
          </div>

          {configMessage ? <p className="mt-4 rounded-2xl bg-black/5 px-4 py-3 text-sm text-neutral-700">{configMessage}</p> : null}

          <div className="mt-5 rounded-2xl border border-black/10 bg-neutral-50 p-4">
            {configsLoading ? <p className="text-sm text-neutral-500">{t({ zh: "正在加载模型配置...", en: "Loading model configs..." })}</p> : configsError ? (
              <p className="text-sm text-neutral-500">{configsError}</p>
            ) : configs.length === 0 ? (
              <p className="text-sm text-neutral-500">{t({ zh: "还没有可用的模型配置。", en: "No model configs yet." })}</p>
            ) : (
              <div className="grid gap-3">
                {configs.map((config) => (
                  <div key={config.id} className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {config.name}
                        {config.isActive ? <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{t({ zh: "当前使用", en: "Active" })}</span> : null}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">Model: {config.model}</p>
                      <p className="mt-1 text-xs text-neutral-500">Endpoint: {config.apiEndpoint || t({ zh: "默认地址", en: "Default endpoint" })}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => handleEdit(config)} className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-neutral-700 transition hover:bg-black/5">{t({ zh: "编辑", en: "Edit" })}</button>
                      {!config.isActive ? <button onClick={() => void handleActivate(config.id)} className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-neutral-700 transition hover:bg-black/5">{t({ zh: "设为当前", en: "Make active" })}</button> : null}
                      <button onClick={() => void handleDelete(config.id)} className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-neutral-500 transition hover:bg-black/5">{t({ zh: "删除", en: "Delete" })}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-sm text-neutral-500">{label}</label>{children}</div>;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-black/10 bg-white p-4"><p className="text-xs uppercase tracking-[0.2em] text-neutral-400">{label}</p><p className="mt-2 text-sm text-neutral-700">{value}</p></div>;
}
