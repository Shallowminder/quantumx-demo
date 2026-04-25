import { findRelatedMemoryMatches } from "../lib/memory";
import { getSupabaseClient } from "./supabaseClient";
import type { MemoryMatch, MemoryMatchKind, Thought, Topic } from "../types";

interface RecallResponseMatch {
  clientId: string;
  kind: MemoryMatchKind;
  reason: string;
  score: number;
}

interface RecallResponse {
  matches?: RecallResponseMatch[];
  strategy?: string;
}

function fallbackMatches(
  input: string | Thought,
  thoughts: Thought[],
  topics: Topic[],
  limit: number,
) {
  return findRelatedMemoryMatches(input, thoughts, topics, limit);
}

export async function fetchRelatedMemoryMatches(
  input: string | Thought,
  thoughts: Thought[],
  topics: Topic[],
  limit = 5,
): Promise<MemoryMatch[]> {
  const localMatches = fallbackMatches(input, thoughts, topics, limit);
  const query = typeof input === "string" ? input.trim() : input.content.trim();

  if (query.length < 2 || thoughts.length === 0) {
    return localMatches;
  }

  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return localMatches;

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) return localMatches;

    const { data, error } = await supabase.functions.invoke<RecallResponse>("recall", {
      body: {
        query,
        thoughtId: typeof input === "string" ? undefined : input.id,
        limit,
      },
    });

    if (error) return localMatches;

    const thoughtById = new Map(thoughts.map((thought) => [thought.id, thought]));
    const cloudMatches = (data?.matches ?? [])
      .map((match) => {
        const thought = thoughtById.get(match.clientId);
        if (!thought) return null;
        return {
          thought,
          kind: match.kind,
          reason: match.reason,
          score: match.score,
        } satisfies MemoryMatch;
      })
      .filter((match): match is MemoryMatch => Boolean(match));

    return cloudMatches.length > 0 ? cloudMatches : localMatches;
  } catch {
    return localMatches;
  }
}
