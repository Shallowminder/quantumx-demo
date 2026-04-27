import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { embedTexts, hashText } from "../_shared/embeddings.ts";

type ThoughtRow = {
  id: string;
  client_id: string;
  content: string;
  summary: string;
  source: string;
  created_at: string;
};

type EmbeddingRow = {
  thought_id: string;
  content_hash: string;
};

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

    const body = await request.json().catch(() => ({}));
    const requestedClientIds = Array.isArray(body?.thoughtClientIds)
      ? body.thoughtClientIds.filter((value: unknown): value is string => typeof value === "string")
      : [];
    const limit = Math.max(1, Math.min(40, Number(body?.limit ?? 12)));

    const thoughtsQuery = supabase
      .from("thoughts")
      .select("id, client_id, content, summary, source, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    const [{ data: thoughts, error: thoughtsError }, { data: embeddings, error: embeddingsError }] =
      await Promise.all([
        requestedClientIds.length > 0
          ? thoughtsQuery.in("client_id", requestedClientIds)
          : thoughtsQuery,
        supabase.from("thought_embeddings").select("thought_id, content_hash"),
      ]);

    if (thoughtsError) throw thoughtsError;
    if (embeddingsError) throw embeddingsError;

    const thoughtRows = (thoughts ?? []) as ThoughtRow[];
    const embeddingRows = new Map(
      ((embeddings ?? []) as EmbeddingRow[]).map((row) => [row.thought_id, row.content_hash]),
    );

    const staleThoughts = thoughtRows.filter((thought) => {
      const nextHash = hashText(`${thought.content}\n${thought.summary}\n${thought.source}`);
      return embeddingRows.get(thought.id) !== nextHash;
    });

    if (staleThoughts.length === 0) {
      return new Response(
        JSON.stringify({
          embedded: 0,
          skipped: thoughtRows.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const embedded = await embedTexts(
      staleThoughts.map((thought) => `${thought.content}\n${thought.summary}\n${thought.source}`),
    );

    if (!embedded) {
      return new Response(
        JSON.stringify({
          embedded: 0,
          skipped: thoughtRows.length,
          reason: "Embedding provider is not configured.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const rows = staleThoughts.map((thought, index) => ({
      thought_id: thought.id,
      user_id: user.id,
      provider: embedded.provider,
      model: embedded.model,
      content_hash: hashText(`${thought.content}\n${thought.summary}\n${thought.source}`),
      embedding: embedded.embeddings[index] ?? [],
    }));

    const { error: upsertError } = await supabase
      .from("thought_embeddings")
      .upsert(rows, { onConflict: "thought_id" });
    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({
        embedded: rows.length,
        skipped: thoughtRows.length - rows.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
