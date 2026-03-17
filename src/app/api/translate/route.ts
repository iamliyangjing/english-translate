import { NextResponse } from "next/server";

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

    const apiKey = body.apiKey?.trim() || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "缺少 OPENAI_API_KEY 配置。" },
        { status: 500 },
      );
    }

    const requestedModel = body.model?.trim();
    const model =
      requestedModel && requestedModel.length <= 80
        ? requestedModel
        : process.env.OPENAI_MODEL ?? "gpt-4o-mini";

    const rawEndpoint =
      body.apiEndpoint?.trim() || "https://api.openai.com/v1/chat/completions";
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
        { error: "翻译服务暂时不可用。", details: errorText },
        { status: 500 },
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      reply?: string;
      output_text?: string;
      result?: { output?: string };
    };
    const translation =
      data.choices?.[0]?.message?.content?.trim() ||
      data.reply?.trim() ||
      data.output_text?.trim() ||
      data.result?.output?.trim();

    if (!translation) {
      return NextResponse.json(
        { error: "未能解析翻译结果。" },
        { status: 500 },
      );
    }

    return NextResponse.json({ translation });
  } catch (error) {
    return NextResponse.json(
      { error: "翻译请求失败。", details: String(error) },
      { status: 500 },
    );
  }
}
