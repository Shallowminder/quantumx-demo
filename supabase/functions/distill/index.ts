type DistillOutputType = "文章提纲" | "复盘框架" | "观点卡片";

interface DistillThought {
  id: string;
  content: string;
  summary: string;
  source: string;
  createdAt: string;
  questions?: string[];
  status?: string;
}

interface DistillTopic {
  id: string;
  name: string;
  summary: string;
  description: string;
}

interface DistillRequestBody {
  outputType?: DistillOutputType;
  topic?: DistillTopic;
  thoughts?: DistillThought[];
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function buildPrompt(outputType: DistillOutputType, topic: DistillTopic, thoughts: DistillThought[]) {
  const sources = thoughts
    .map((thought, index) => {
      return [
        `来源 ${index + 1}`,
        `摘要：${thought.summary}`,
        `原文：${thought.content}`,
        thought.questions?.length ? `问题：${thought.questions.join("；")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return `你是 QuantumX 的个人思考蒸馏助手。请只基于用户提供的历史记录生成内容，不要编造来源之外的信息。

主题：${topic.name}
主题摘要：${topic.summary}
主题说明：${topic.description}
输出类型：${outputType}

来源记录：
${sources}

要求：
1. 使用中文。
2. 输出 Markdown。
3. 保留个人思考语气，不要写成营销文。
4. 内容要具体、可编辑、有结构。
5. 如果是文章提纲，输出标题、核心观点、3-5 个章节和可继续追问的问题。
6. 如果是复盘框架，输出事实、感受、模式、下一步动作。
7. 如果是观点卡片，输出 3-5 张观点卡片，每张包含观点、依据和可延展方向。`;
}

async function generateWithCompatibleChatApi(prompt: string) {
  const apiKey = Deno.env.get("AI_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
  const baseUrl = normalizeBaseUrl(
    Deno.env.get("AI_BASE_URL") ?? Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1",
  );
  const model =
    Deno.env.get("AI_MODEL") ??
    Deno.env.get("OPENAI_DISTILL_MODEL") ??
    "gpt-4.1-mini";
  const provider = Deno.env.get("AI_PROVIDER") ?? "openai-compatible";

  if (!apiKey) {
    throw new Error("AI_API_KEY is not configured.");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是一个谨慎、具体、尊重来源材料的中文个人知识管理助手。输出必须是 Markdown。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${provider} request failed: ${response.status} ${detail}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error(`${provider} response did not include message content.`);
  }

  return content.trim();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await request.json()) as DistillRequestBody;
    const outputType = body.outputType;
    const topic = body.topic;
    const thoughts = body.thoughts ?? [];

    if (!outputType || !topic || thoughts.length === 0) {
      return jsonResponse({ error: "Missing outputType, topic, or thoughts." }, 400);
    }

    const prompt = buildPrompt(outputType, topic, thoughts);
    const content = await generateWithCompatibleChatApi(prompt);

    return jsonResponse({
      title: `${topic.name} · ${outputType}`,
      content,
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unknown distill error",
      },
      500,
    );
  }
});
