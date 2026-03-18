"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import LoginPrompt from "@/components/LoginPrompt";

type Stats = { total: number; due: number };

type ModelConfig = {
  id: string;
  name: string;
  model: string;
  apiEndpoint: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const user = session?.user;

  const [stats, setStats] = useState<Stats | null>(null);
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
  }, [name, model, apiKey, editingId]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await fetch("/api/profile/stats");
        const data = await res.json();
        if (!res.ok) {
          setStatsError(data.error ?? "获取学习统计失败。");
          return;
        }
        setStats({ total: data.total ?? 0, due: data.due ?? 0 });
      } catch {
        setStatsError("获取学习统计失败。");
      }
    };
    load();
  }, [user]);

  const loadConfigs = async () => {
    if (!user) return;
    setConfigsLoading(true);
    setConfigsError(null);
    try {
      const res = await fetch("/api/profile/model-configs");
      const data = await res.json();
      if (!res.ok) {
        setConfigsError(data.error ?? "获取模型配置失败。");
        return;
      }
      setConfigs(data.configs ?? []);
    } catch {
      setConfigsError("获取模型配置失败。");
    } finally {
      setConfigsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, [user]);

  const resetForm = () => {
    setName("");
    setModel("");
    setApiEndpoint("");
    setApiKey("");
    setSetActive(true);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!canSave) return;
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

      const res = await fetch(
        editingId
          ? `/api/profile/model-configs/${editingId}`
          : "/api/profile/model-configs",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setConfigMessage(
          data.error ??
            (editingId ? "更新模型配置失败。" : "保存模型配置失败。"),
        );
        return;
      }
      resetForm();
      setConfigMessage(editingId ? "已更新模型配置。" : "已保存模型配置。");
      await loadConfigs();
    } catch {
      setConfigMessage(editingId ? "更新模型配置失败。" : "保存模型配置失败。");
    }
  };

  const handleActivate = async (id: string) => {
    setConfigMessage(null);
    try {
      const res = await fetch(`/api/profile/model-configs/${id}/activate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setConfigMessage(data.error ?? "切换配置失败。");
        return;
      }
      setConfigMessage("已切换到该配置。");
      await loadConfigs();
    } catch {
      setConfigMessage("切换配置失败。");
    }
  };

  const handleDelete = async (id: string) => {
    setConfigMessage(null);
    try {
      const res = await fetch(`/api/profile/model-configs/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        setConfigMessage(data.error ?? "删除配置失败。");
        return;
      }
      setConfigMessage("已删除配置。");
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
        <p className="text-sm text-neutral-500">加载中...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <LoginPrompt
          title="登录后查看个人信息"
          description="请先登录再进入个人页。登录后可查看个人信息和学习统计。"
          actionLabel="使用 GitHub 登录"
        />
      </main>
    );
  }

  const provider = user.id?.includes("github") ? "GitHub" : "OAuth";

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className="rounded-3xl border border-black/10 bg-white/90 p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt="avatar"
                className="h-16 w-16 rounded-full object-cover"
                referrerPolicy="no-referrer"
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
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            学习统计
          </p>
          {statsError ? (
            <p className="mt-3 text-sm text-neutral-500">{statsError}</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                  卡片总数
                </p>
                <p className="mt-2 text-2xl font-semibold text-neutral-900">
                  {stats ? stats.total : "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                  待复习数
                </p>
                <p className="mt-2 text-2xl font-semibold text-neutral-900">
                  {stats ? stats.due : "--"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            模型配置
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            API Key 会安全存储在服务端，不会在页面回显。
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
              <label className="text-sm text-neutral-500">API Endpoint（可选）</label>
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
              onClick={handleSave}
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
              <p className="text-sm text-neutral-500">正在加载配置...</p>
            ) : configsError ? (
              <p className="text-sm text-neutral-500">{configsError}</p>
            ) : configs.length === 0 ? (
              <p className="text-sm text-neutral-500">暂无模型配置。</p>
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
                            当前
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        模型：{config.model}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Endpoint：{config.apiEndpoint || "默认"}
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
                          onClick={() => handleActivate(config.id)}
                          className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-neutral-700 transition hover:bg-black/5"
                        >
                          设为当前
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDelete(config.id)}
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
