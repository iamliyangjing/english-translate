import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { getSqlite } from "@/lib/db";

export const runtime = "nodejs";

type UpdateModelConfigBody = {
  name?: string;
  model?: string;
  apiEndpoint?: string;
  apiKey?: string;
};

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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    }

    const id =
      params?.id || new URL(request.url).pathname.split("/").pop() || "";
    if (!id) {
      return NextResponse.json({ error: "缺少配置 ID。" }, { status: 400 });
    }

    const body = (await request.json()) as UpdateModelConfigBody;
    const name = body.name?.trim();
    const model = body.model?.trim();
    const apiEndpoint =
      body.apiEndpoint !== undefined ? body.apiEndpoint.trim() : undefined;
    const apiKey = body.apiKey?.trim();

    if (name === "" || model === "" || apiKey === "") {
      return NextResponse.json(
        { error: "配置字段不能为空。" },
        { status: 400 },
      );
    }

    const payload: Partial<ModelConfigRow> = {};
    if (name) payload.name = name;
    if (model) payload.model = model;
    if (apiEndpoint !== undefined) payload.api_endpoint = apiEndpoint || null;
    if (apiKey) payload.api_key = apiKey;
    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { error: "没有需要更新的字段。" },
        { status: 400 },
      );
    }
    payload.updated_at = new Date().toISOString();

    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from<ModelConfigRow>("model_configs")
        .update(payload)
        .eq("id", id)
        .eq("user_id", userKey)
        .select("id")
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { error: "更新模型配置失败。", details: error.message },
          { status: 500 },
        );
      }
      if (!data) {
        return NextResponse.json({ error: "配置不存在。" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    const sqlite = getSqlite();
    const existing = sqlite
      .prepare("SELECT id FROM model_configs WHERE id = ? AND user_id = ?")
      .get(id, userKey) as { id: string } | undefined;
    if (!existing) {
      return NextResponse.json({ error: "配置不存在。" }, { status: 404 });
    }

    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (payload.name !== undefined) {
      fields.push("name = ?");
      values.push(payload.name);
    }
    if (payload.model !== undefined) {
      fields.push("model = ?");
      values.push(payload.model);
    }
    if (payload.api_endpoint !== undefined) {
      fields.push("api_endpoint = ?");
      values.push(payload.api_endpoint ?? null);
    }
    if (payload.api_key !== undefined) {
      fields.push("api_key = ?");
      values.push(payload.api_key);
    }
    if (payload.updated_at !== undefined) {
      fields.push("updated_at = ?");
      values.push(payload.updated_at);
    }

    sqlite
      .prepare(
        `UPDATE model_configs SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
      )
      .run(...values, id, userKey);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "更新模型配置失败。", details: String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;
    if (!userKey) {
      return NextResponse.json({ error: "请先登录。" }, { status: 401 });
    }

    const id =
      params?.id || new URL(request.url).pathname.split("/").pop() || "";
    if (!id) {
      return NextResponse.json({ error: "缺少配置 ID。" }, { status: 400 });
    }

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase
        .from<ModelConfigRow>("model_configs")
        .delete()
        .eq("id", id)
        .eq("user_id", userKey);

      if (error) {
        return NextResponse.json(
          { error: "删除配置失败。", details: error.message },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    getSqlite()
      .prepare("DELETE FROM model_configs WHERE id = ? AND user_id = ?")
      .run(id, userKey);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "删除配置失败。", details: String(error) },
      { status: 500 },
    );
  }
}
