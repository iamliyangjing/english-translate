import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { getSqlite } from "@/lib/db";

export const runtime = "nodejs";

type TranslateBody = {
  text?: string;
  sourceLang?: string;
  targetLang?: string;
  model?: string;
  apiEndpoint?: string;
  apiKey?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TranslateBody;
    const text = body.text?.trim();
    const sourceLang = body.sourceLang?.trim() || "English";
    const targetLang = body.targetLang?.trim() || "Chinese";

    if (!text) {
      return NextResponse.json({ error: "请输入要翻译的内容。" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userKey = session?.user?.id || session?.user?.email;

    let storedConfig: {
      model?: string;
      apiEndpoint?: string | null;
      apiKey?: string;
    } | null = null;

    if (userKey) {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from("model_configs")
          .select("model, api_endpoint, api_key")
          .eq("user_id", userKey)
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          return NextResponse.json(
            { error: "加载模型配置失败。", details: error.message },
            { status: 500 },
          );
        }

        if (data) {
          storedConfig = {
            model: data.model,
            apiEndpoint: data.api_endpoint,
            apiKey: data.api_key,
          };
        }
      } else {
        const row = getSqlite()
          .prepare<[string], { model: string; apiEndpoint: string | null; apiKey: string }>(
            `SELECT model, api_endpoint as apiEndpoint, api_key as apiKey
             FROM model_configs
             WHERE user_id = ? AND is_active = 1
             ORDER BY datetime(updated_at) DESC
             LIMIT 1`,
          )
          .get(userKey);
        if (row) {
          storedConfig = {
            model: row.model,
            apiEndpoint: row.apiEndpoint,
            apiKey: row.apiKey,
          };
        }
      }
    }

    let apiKey =
      body.apiKey?.trim() ||
      storedConfig?.apiKey ||
      process.env.OPENAI_API_KEY;
    if (apiKey?.startsWith("Bearer ")) {
      apiKey = apiKey.replace(/^Bearer\s+/i, "").trim();
    }
    if (!apiKey) {
      return NextResponse.json(
        { error: "没有可用的 API Key。" },
        { status: 500 },
      );
    }

    const requestedModel = body.model?.trim() || storedConfig?.model;
    const model =
      requestedModel && requestedModel.length <= 80
        ? requestedModel
        : process.env.OPENAI_MODEL ?? "gpt-4o-mini";

    const rawEndpoint =
      body.apiEndpoint?.trim() ||
      storedConfig?.apiEndpoint?.trim() ||
      "https://api.openai.com/v1/chat/completions";
    if (!rawEndpoint.startsWith("http")) {
      return NextResponse.json(
        { error: "API Endpoint 无效。" },
        { status: 400 },
      );
    }

    const isMiniMax = rawEndpoint.includes("minimaxi.com");
    const apiEndpoint = isMiniMax
      ? rawEndpoint.includes("chatcompletion_v2")
        ? rawEndpoint
        : rawEndpoint.replace(/\/+$/, "") + "/text/chatcompletion_v2"
      : rawEndpoint;
    const prompt = `You are a translation engine. Translate from ${sourceLang} to ${targetLang}. Return only the translated text.`;

    const payload = isMiniMax
      ? {
          model,
          messages: [
            { role: "system", name: "MiniMax AI", content: prompt },
            { role: "user", name: "用户", content: text },
          ],
        }
      : {
          model,
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: text },
          ],
          temperature: 0.2,
        };

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "翻译请求失败。",
          details: errorText || `上游返回状态 ${response.status}`,
          status: response.status,
        },
        { status: 500 },
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      reply?: string;
      output_text?: string;
      result?: { output?: string };
      base_resp?: { status_code?: number; status_msg?: string };
    };
    if (data.base_resp?.status_code && data.base_resp.status_code !== 0) {
      return NextResponse.json(
        {
          error: "翻译服务返回错误。",
          details:
            data.base_resp.status_msg?.includes("login fail")
              ? "API Key 无效或未配置，请检查个人页中的模型配置。"
              : data.base_resp.status_msg ?? "未知错误",
          status: data.base_resp.status_code,
        },
        { status: 500 },
      );
    }
    const translation =
      data.choices?.[0]?.message?.content?.trim() ||
      data.reply?.trim() ||
      data.output_text?.trim() ||
      data.result?.output?.trim();

    if (!translation) {
      return NextResponse.json(
        { error: "翻译结果为空。" },
        { status: 500 },
      );
    }

    return NextResponse.json({ translation });
  } catch (error) {
    return NextResponse.json(
      { error: "翻译服务异常。", details: String(error) },
      { status: 500 },
    );
  }
}
