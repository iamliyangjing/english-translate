import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { getSqlite } from "@/lib/db";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

type ModelConfigRow = {
  id: string;
  user_id: string;
  name: string;
  model: string;
  api_endpoint: string | null;
  api_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CreateModelConfigBody = {
  name?: string;
  model?: string;
  apiEndpoint?: string;
  apiKey?: string;
  setActive?: boolean;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    }

    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from<ModelConfigRow>("model_configs")
        .select("id, name, model, api_endpoint, is_active, created_at, updated_at")
        .eq("user_id", userKey)
        .order("created_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "获取模型配置失败。", details: error.message },
          { status: 500 },
        );
      }

      const configs = (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        model: row.model,
        apiEndpoint: row.api_endpoint ?? "",
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return NextResponse.json({ configs });
    }

    const configs = getSqlite()
      .prepare(
        `SELECT id, name, model,
                api_endpoint as apiEndpoint,
                is_active as isActive,
                created_at as createdAt,
                updated_at as updatedAt
         FROM model_configs
         WHERE user_id = ?
         ORDER BY datetime(created_at) DESC`,
      )
      .all(userKey)
      .map((row: any) => ({
        ...row,
        isActive: Boolean(row.isActive),
        apiEndpoint: row.apiEndpoint ?? "",
      }));

    return NextResponse.json({ configs });
  } catch (error) {
    return NextResponse.json(
      { error: "获取模型配置失败。", details: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    }

    const body = (await request.json()) as CreateModelConfigBody;
    const name = body.name?.trim();
    const model = body.model?.trim();
    const apiEndpoint = body.apiEndpoint?.trim() || null;
    const apiKey = body.apiKey?.trim();
    const setActive = Boolean(body.setActive);

    if (!name || !model || !apiKey) {
      return NextResponse.json(
        { error: "请填写名称、模型和 API Key。" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const id = randomUUID();

    const supabase = getSupabase();
    if (supabase) {
      if (setActive) {
        await supabase
          .from<ModelConfigRow>("model_configs")
          .update({ is_active: false, updated_at: now })
          .eq("user_id", userKey);
      }

      const { data, error } = await supabase
        .from<ModelConfigRow>("model_configs")
        .insert({
          id,
          user_id: userKey,
          name,
          model,
          api_endpoint: apiEndpoint,
          api_key: apiKey,
          is_active: setActive,
          created_at: now,
          updated_at: now,
        })
        .select("id, name, model, api_endpoint, is_active, created_at, updated_at")
        .single();

      if (error) {
        return NextResponse.json(
          { error: "保存模型配置失败。", details: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        config: {
          id: data.id,
          name: data.name,
          model: data.model,
          apiEndpoint: data.api_endpoint ?? "",
          isActive: data.is_active,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
      });
    }

    const sqlite = getSqlite();
    const tx = sqlite.transaction(() => {
      if (setActive) {
        sqlite
          .prepare(
            "UPDATE model_configs SET is_active = 0, updated_at = ? WHERE user_id = ?",
          )
          .run(now, userKey);
      }
      sqlite
        .prepare(
          `INSERT INTO model_configs (
             id, user_id, name, model, api_endpoint, api_key,
             is_active, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          userKey,
          name,
          model,
          apiEndpoint,
          apiKey,
          setActive ? 1 : 0,
          now,
          now,
        );
    });
    tx();

    return NextResponse.json({
      config: {
        id,
        name,
        model,
        apiEndpoint: apiEndpoint ?? "",
        isActive: setActive,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "保存模型配置失败。", details: String(error) },
      { status: 500 },
    );
  }
}
