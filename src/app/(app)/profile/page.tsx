"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import LoginPrompt from "@/components/LoginPrompt";

type Stats = {
  total: number;
  due: number;
  newCards: number;
  reviewedToday: number;
  reviewedThisWeek: number;
  mastered: number;
  learningCards: number;
  completionRate: number;
};

type ModelConfig = {
  id: string;
  name: string;
  model: string;
  apiEndpoint: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const emptyStats: Stats = {
  total: 0,
  due: 0,
  newCards: 0,
  reviewedToday: 0,
  reviewedThisWeek: 0,
  mastered: 0,
  learningCards: 0,
  completionRate: 0,
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
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

  const canSave = useMemo(() => {
    if (editingId) {
      return Boolean(name.trim() && model.trim());
    }

    return Boolean(name.trim() && model.trim() && apiKey.trim());
  }, [apiKey, editingId, model, name]);

  const loadStats = useCallback(async () => {
    if (!user) {
      return;
    }

    setStatsError(null);

    try {
      const response = await fetch("/api/profile/stats");
      const data = (await response.json()) as Partial<Stats> & { error?: string };

      if (!response.ok) {
        setStatsError(data.error ?? "获取学习统计失败。");
        return;
      }

      setStats({
        total: Number(data.total ?? 0),
        due: Number(data.due ?? 0),
        newCards: Number(data.newCards ?? 0),
        reviewedToday: Number(data.reviewedToday ?? 0),
        reviewedThisWeek: Number(data.reviewedThisWeek ?? 0),
        mastered: Number(data.mastered ?? 0),
        learningCards: Number(data.learningCards ?? 0),
        completionRate: Number(data.completionRate ?? 0),
      });
    } catch {
      setStatsError("获取学习统计失败。");
    }
  }, [user]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const loadConfigs = useCallback(async () => {
    if (!user) {
      return;
    }

    setConfigsLoading(true);
    setConfigsError(null);

    try {
      const response = await fetch("/api/profile/model-configs");
      const data = (await response.json()) as {
        configs?: ModelConfig[];
        error?: string;
      };

      if (!response.ok) {
        setConfigsError(data.error ?? "获取模型配置失败。");
        return;
      }

      setConfigs(data.configs ?? []);
    } catch {
      setConfigsError("获取模型配置失败。");
    } finally {
      setConfigsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadConfigs();
  }, [loadConfigs]);

  const resetForm = () => {
    setName("");
    setModel("");
    setApiEndpoint("");
    setApiKey("");
    setSetActive(true);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    setConfigMessage(null);

    try {
      const payload: {
        name: string;
        model: string;
        apiEndpoint: string;
        apiKey?: string;
        setActive?: boolean;
      } = {
        name,
        model,
        apiEndpoint,
      };

      if (apiKey.trim()) {
        payload.apiKey = apiKey;
      }

      if (!editingId) {
        payload.setActive = setActive;
      }

      const response = await fetch(
        editingId
          ? `/api/profile/model-configs/${editingId}`
          : "/api/profile/model-configs",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setConfigMessage(
          data.error ??
            (editingId ? "更新模型配置失败。" : "保存模型配置失败。"),
        );
        return;
      }

      resetForm();
      setConfigMessage(editingId ? "模型配置已更新。" : "模型配置已保存。");
      await loadConfigs();
    } catch {
      setConfigMessage(editingId ? "更新模型配置失败。" : "保存模型配置失败。");
    }
  };

  const handleActivate = async (id: string) => {
    setConfigMessage(null);

    try {
      const response = await fetch(`/api/profile/model-configs/${id}/activate`, {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setConfigMessage(data.error ?? "切换配置失败。");
        return;
      }

      setConfigMessage("当前模型配置已切换。");
      await loadConfigs();
    } catch {
      setConfigMessage("切换配置失败。");
    }
  };

  const handleDelete = async (id: string) => {
    setConfigMessage(null);

    try {
      const response = await fetch(`/api/profile/model-configs/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setConfigMessage(data.error ?? "删除配置失败。");
        return;
      }

      setConfigMessage("模型配置已删除。");
      await loadConfigs();
    } catch {
      setConfigMessage("删除配置失败。");
    }
  };

  const handleEdit = (config: ModelConfig) => {
    setEditingId(config.id);
    setName(config.name);
    setModel(config.model);
    setApiEndpoint(config.apiEndpoint ?? "");
    setApiKey("");
    setSetActive(false);
    setConfigMessage(null);
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <p className="text-sm text-neutral-500">正在加载个人信息...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <LoginPrompt
          title="登录后查看个人中心"
          description="登录后可查看学习统计、管理模型配置，并同步你的复习节奏。"
          actionLabel="使用 GitHub 登录"
        />
      </main>
    );
  }

  const provider = user.id?.includes("github") ? "GitHub" : "OAuth";
  const statCards = [
    { label: "卡片总数", value: stats.total, note: "累计加入学习空间" },
    { label: "今日待复习", value: stats.due, note: "现在应该处理的卡片" },
    { label: "新卡片", value: stats.newCards, note: "仍在建立第一层记忆" },
    { label: "今日已复习", value: stats.reviewedToday, note: "今天触达过的卡片" },
    { label: "本周活跃", value: stats.reviewedThisWeek, note: "最近 7 天触达过的卡片" },
    { label: "已掌握", value: stats.mastered, note: "复习间隔已拉长到 21 天以上" },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className="rounded-3xl border border-black/10 bg-white/90 p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {user.image ? (
              <Image
                src={user.image}
                alt="avatar"
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/10 text-xl font-semibold text-neutral-700">
                {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
              </div>
            )}

            <div>
              <h1 className="font-serif text-2xl text-neutral-900">
                {user.name ?? "未命名用户"}
              </h1>
              <p className="text-sm text-neutral-500">{user.email}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            登录方式：{provider}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
              用户 ID
            </p>
            <p className="mt-2 text-sm text-neutral-700">{user.id}</p>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
              邮箱
            </p>
            <p className="mt-2 text-sm text-neutral-700">
              {user.email ?? "未提供"}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-neutral-50 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                学习统计
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                这些指标会随着复习评分实时更新，帮助你判断记忆是否在稳定扩张。
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-neutral-700">
              当前掌握率：{stats.completionRate}%
            </div>
          </div>

          {statsError ? (
            <p className="mt-3 text-sm text-neutral-500">{statsError}</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {statCards.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-black/10 bg-white p-4"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-neutral-900">
                    {item.value}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">{item.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            模型配置
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            API Key 会保存在服务端。编辑已有配置时，留空 API Key 表示沿用原值。
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-neutral-500">配置名称</label>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
                placeholder="例如：MiniMax 主力"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-neutral-500">模型</label>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
                placeholder="例如：MiniMax-M2.5"
                value={model}
                onChange={(event) => setModel(event.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-neutral-500">
                API Endpoint（可选）
              </label>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
                placeholder="https://api.minimaxi.com/v1"
                value={apiEndpoint}
                onChange={(event) => setApiEndpoint(event.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-neutral-500">API Key</label>
              <input
                type="password"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-black/30"
                placeholder={editingId ? "留空表示不修改" : "sk-..."}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!editingId ? (
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  checked={setActive}
                  onChange={(event) => setSetActive(event.target.checked)}
                />
                保存后设为当前配置
              </label>
            ) : null}

            <button
              onClick={() => void handleSave()}
              disabled={!canSave}
              className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              {editingId ? "更新配置" : "保存配置"}
            </button>

            {editingId ? (
              <button
                onClick={resetForm}
                className="rounded-full border border-black/10 px-4 py-2 text-sm text-neutral-600 transition hover:bg-black/5"
              >
                取消编辑
              </button>
            ) : null}
          </div>

          {configMessage ? (
            <p className="mt-4 rounded-2xl bg-black/5 px-4 py-3 text-sm text-neutral-700">
              {configMessage}
            </p>
          ) : null}

          <div className="mt-5 rounded-2xl border border-black/10 bg-neutral-50 p-4">
            {configsLoading ? (
              <p className="text-sm text-neutral-500">正在加载模型配置...</p>
            ) : configsError ? (
              <p className="text-sm text-neutral-500">{configsError}</p>
            ) : configs.length === 0 ? (
              <p className="text-sm text-neutral-500">还没有可用的模型配置。</p>
            ) : (
              <div className="grid gap-3">
                {configs.map((config) => (
                  <div
                    key={config.id}
                    className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {config.name}
                        {config.isActive ? (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                            当前使用
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        模型：{config.model}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Endpoint：{config.apiEndpoint || "默认地址"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleEdit(config)}
                        className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-neutral-700 transition hover:bg-black/5"
                      >
                        编辑
                      </button>

                      {!config.isActive ? (
                        <button
                          onClick={() => void handleActivate(config.id)}
                          className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-neutral-700 transition hover:bg-black/5"
                        >
                          设为当前
                        </button>
                      ) : null}

                      <button
                        onClick={() => void handleDelete(config.id)}
                        className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-neutral-500 transition hover:bg-black/5"
                      >
                        删除
                      </button>
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
