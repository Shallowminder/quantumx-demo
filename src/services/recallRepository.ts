import { findRelatedMemoryMatches } from "../lib/memory";
import { getSupabaseClient } from "./supabaseClient";
import type { MemoryMatch, MemoryMatchKind, Thought, Topic } from "../types";

export type RecallStrategy = "local" | "lexical" | "semantic" | "empty";
export type RecallSource = "local" | "cloud";

export interface RelatedMemoryResult {
  matches: MemoryMatch[];
  source: RecallSource;
  strategy: RecallStrategy;
}

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

function normalizeRecallStrategy(strategy: unknown): RecallStrategy {
  if (strategy === "semantic" || strategy === "lexical" || strategy === "empty") {
    return strategy;
  }
  return "local";
}

export async function fetchRelatedMemoryResult(
  input: string | Thought,
  thoughts: Thought[],
  topics: Topic[],
  limit = 5,
): Promise<RelatedMemoryResult> {
  const localMatches = fallbackMatches(input, thoughts, topics, limit);
  const query = typeof input === "string" ? input.trim() : input.content.trim();
  const localResult: RelatedMemoryResult = {
    matches: localMatches,
    source: "local",
    strategy: "local",
  };

  if (query.length < 2 || thoughts.length === 0) {
    return localResult;
  }

  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return localResult;

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) return localResult;

    const { data, error } = await supabase.functions.invoke<RecallResponse>("recall", {
      body: {
        query,
        thoughtId: typeof input === "string" ? undefined : input.id,
        limit,
      },
    });

    if (error) return localResult;

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

    if (cloudMatches.length === 0) {
      return localMatches.length > 0
        ? localResult
        : {
            matches: [],
            source: "cloud",
            strategy: normalizeRecallStrategy(data?.strategy),
          };
    }

    return {
      matches: cloudMatches,
      source: "cloud",
      strategy: normalizeRecallStrategy(data?.strategy),
    };
  } catch {
    return localResult;
  }
}

export async function fetchRelatedMemoryMatches(
  input: string | Thought,
  thoughts: Thought[],
  topics: Topic[],
  limit = 5,
): Promise<MemoryMatch[]> {
  const result = await fetchRelatedMemoryResult(input, thoughts, topics, limit);
  return result.matches;
}
