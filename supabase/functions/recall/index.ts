import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { embedTexts, hashText } from "../_shared/embeddings.ts";

type RecallKind = "direct" | "similar" | "counterpoint";

type ThoughtRow = {
  id: string;
  client_id: string;
  content: string;
  summary: string;
  source: string;
  created_at: string;
};

type TopicRow = {
  id: string;
  client_id: string;
  name: string;
};

type ThoughtTopicRow = {
  thought_id: string;
  topic_id: string;
};

type EmbeddingRow = {
  thought_id: string;
  content_hash: string;
  embedding: number[];
};

type RecallMatch = {
  clientId: string;
  kind: RecallKind;
  reason: string;
  score: number;
  matchedKeywords: string[];
  topicNames: string[];
  daysAgo?: number;
};

const queryKeywordBank = [
  "ai",
  "工具",
  "工作流",
  "自动",
  "召回",
  "主题",
  "写",
  "文章",
  "提纲",
  "复盘",
  "学习",
  "问题",
  "判断",
  "长期",
  "成长",
];

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    aNorm += a[index] * a[index];
    bNorm += b[index] * b[index];
  }

  if (aNorm === 0 || bNorm === 0) return 0;
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

function matchedKeywords(query: string, text: string) {
  const normalizedQuery = normalize(query);
  const normalizedText = normalize(text);

  return queryKeywordBank.filter((keyword) => {
    const normalizedKeyword = keyword.toLowerCase();
    return (
      normalizedQuery.includes(normalizedKeyword) &&
      normalizedText.includes(normalizedKeyword)
    );
  });
}

function classifyKind(
  query: string,
  text: string,
  keywordMatches: string[],
  overlappingTopicNames: string[],
): RecallKind {
  const normalizedQuery = normalize(query);
  const normalizedText = normalize(text);
  const queryPushesAutomation =
    normalizedQuery.includes("自动") ||
    normalizedQuery.includes("系统") ||
    normalizedQuery.includes("应该");
  const oldThoughtPushesBack =
    normalizedText.includes("不喜欢") ||
    normalizedText.includes("不要") ||
    normalizedText.includes("失去") ||
    normalizedText.includes("担心");

  if (queryPushesAutomation && oldThoughtPushesBack) return "counterpoint";
  if (keywordMatches.length > 0) return "direct";
  if (overlappingTopicNames.length > 0) return "similar";
  return "similar";
}

function buildReason(
  kind: RecallKind,
  keywordMatches: string[],
  topicNames: string[],
  daysAgo?: number,
) {
  const timeLabel =
    typeof daysAgo === "number"
      ? daysAgo === 0
        ? "今天也提到过"
        : `${daysAgo} 天前也写过`
      : "之前也写过";

  if (kind === "counterpoint") {
    return `${timeLabel}，而且它站在一个不同角度，提醒你以前也担心过这类判断。`;
  }

  if (keywordMatches.length > 0) {
    return `${timeLabel}，同样提到「${keywordMatches[0]}」。`;
  }

  if (topicNames.length > 0) {
    return `${timeLabel}，和「${topicNames[0]}」主题里的记录接近。`;
  }

  return `${timeLabel}，像是同一个问题的另一种表达。`;
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = request.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const query = String(body?.query ?? "").trim();
    const thoughtClientId = typeof body?.thoughtId === "string" ? body.thoughtId : "";
    const limit = Math.max(1, Math.min(8, Number(body?.limit ?? 5)));

    if (query.length < 2) {
      return new Response(JSON.stringify({ matches: [], strategy: "empty" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [thoughtsResponse, topicsResponse, linksResponse, embeddingsResponse] =
      await Promise.all([
        supabase
          .from("thoughts")
          .select("id, client_id, content, summary, source, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("topics").select("id, client_id, name"),
        supabase.from("thought_topics").select("thought_id, topic_id"),
        supabase
          .from("thought_embeddings")
          .select("thought_id, content_hash, embedding"),
      ]);

    if (thoughtsResponse.error) throw thoughtsResponse.error;
    if (topicsResponse.error) throw topicsResponse.error;
    if (linksResponse.error) throw linksResponse.error;
    if (embeddingsResponse.error) throw embeddingsResponse.error;

    const thoughts = (thoughtsResponse.data ?? []) as ThoughtRow[];
    const topics = (topicsResponse.data ?? []) as TopicRow[];
    const links = (linksResponse.data ?? []) as ThoughtTopicRow[];
    const embeddingRows = (embeddingsResponse.data ?? []) as EmbeddingRow[];

    if (thoughts.length === 0) {
      return new Response(JSON.stringify({ matches: [], strategy: "empty" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const topicNameById = new Map(topics.map((topic) => [topic.id, topic.name]));
    const topicNamesByThoughtId = new Map<string, string[]>();
    links.forEach((link) => {
      const topicName = topicNameById.get(link.topic_id);
      if (!topicName) return;
      const existing = topicNamesByThoughtId.get(link.thought_id) ?? [];
      topicNamesByThoughtId.set(link.thought_id, [...existing, topicName]);
    });

    const thoughtsToSearch = thoughts.filter(
      (thought) => thought.client_id !== thoughtClientId,
    );

    const textByThoughtId = new Map(
      thoughtsToSearch.map((thought) => [
        thought.id,
        `${thought.content}\n${thought.summary}\n${thought.source}`,
      ]),
    );
    const existingEmbeddings = new Map(
      embeddingRows.map((row) => [row.thought_id, row]),
    );

    let strategy = "lexical";
    let queryEmbedding: number[] | null = null;
    const generatedEmbeddings = new Map<string, number[]>();

    try {
      const thoughtsNeedingEmbeddings = thoughtsToSearch.filter((thought) => {
        const text = textByThoughtId.get(thought.id) ?? "";
        const nextHash = hashText(text);
        return existingEmbeddings.get(thought.id)?.content_hash !== nextHash;
      });

      const queryAndThoughtEmbeddings = await embedTexts([
        query,
        ...thoughtsNeedingEmbeddings.map(
          (thought) => textByThoughtId.get(thought.id) ?? "",
        ),
      ]);

      if (queryAndThoughtEmbeddings) {
        strategy = "semantic";
        queryEmbedding = queryAndThoughtEmbeddings.embeddings[0] ?? null;

        if (thoughtsNeedingEmbeddings.length > 0) {
          const rows = thoughtsNeedingEmbeddings.map((thought, index) => ({
            thought_id: thought.id,
            user_id: user.id,
            provider: queryAndThoughtEmbeddings.provider,
            model: queryAndThoughtEmbeddings.model,
            content_hash: hashText(textByThoughtId.get(thought.id) ?? ""),
            embedding:
              queryAndThoughtEmbeddings.embeddings[index + 1] ?? [],
          }));

          rows.forEach((row) => {
            generatedEmbeddings.set(row.thought_id, row.embedding as number[]);
          });

          const { error: upsertError } = await supabase
            .from("thought_embeddings")
            .upsert(rows, { onConflict: "thought_id" });
          if (upsertError) throw upsertError;
        }
      }
    } catch (_error) {
      strategy = "lexical";
    }

    const normalizedQuery = normalize(query);
    const matches = thoughtsToSearch
      .map((thought) => {
        const topicNames = topicNamesByThoughtId.get(thought.id) ?? [];
        const thoughtText = `${thought.content}\n${thought.summary}\n${thought.source}`;
        const keywordMatches = matchedKeywords(query, thoughtText);
        const embedding =
          generatedEmbeddings.get(thought.id) ??
          existingEmbeddings.get(thought.id)?.embedding ??
          [];
        const semanticScore =
          queryEmbedding && Array.isArray(embedding)
            ? cosineSimilarity(queryEmbedding, embedding)
            : 0;
        const lexicalScore =
          keywordMatches.length * 0.22 +
          (normalize(thought.summary).includes(normalizedQuery) ? 0.15 : 0) +
          (normalize(thought.content).includes(normalizedQuery) ? 0.15 : 0) +
          (topicNames.some((name) => normalizedQuery.includes(normalize(name))) ? 0.12 : 0);

        const score =
          strategy === "semantic"
            ? semanticScore + lexicalScore
            : lexicalScore;

        const kind = classifyKind(query, thoughtText, keywordMatches, topicNames);
        const daysAgo = Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(thought.created_at).getTime()) / (1000 * 60 * 60 * 24),
          ),
        );

        return {
          clientId: thought.client_id,
          kind,
          reason: buildReason(kind, keywordMatches, topicNames, daysAgo),
          score,
          matchedKeywords: keywordMatches,
          topicNames,
          daysAgo,
        } satisfies RecallMatch;
      })
      .filter((match) => match.score > 0.08)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return new Response(JSON.stringify({ matches, strategy }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
