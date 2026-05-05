import type { MemoryMatch, SavedDistill, Thought } from "../types";

type SuggestedNextAction = "review_draft" | "organize" | "distill" | "continue";

function getCreatedTime(thought: Thought) {
  const timestamp = Date.parse(thought.createdAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortThoughtsByNewest(thoughts: Thought[]) {
  return [...thoughts].sort((first, second) => getCreatedTime(second) - getCreatedTime(first));
}

export function getInboxThoughts(thoughts: Thought[], limit: number) {
  return sortThoughtsByNewest(thoughts)
    .filter((thought) => thought.status === "inbox")
    .slice(0, limit);
}

export function getRecentThoughts(thoughts: Thought[], limit: number) {
  return sortThoughtsByNewest(thoughts).slice(0, limit);
}

export function getRecalledThoughts(
  matches: MemoryMatch[],
  fallbackThoughts: Thought[],
  limit: number,
) {
  const sourceThoughts =
    matches.length > 0 ? matches.map((match) => match.thought) : fallbackThoughts;
  const seenThoughtIds = new Set<string>();

  return sourceThoughts
    .filter((thought) => {
      if (seenThoughtIds.has(thought.id)) {
        return false;
      }
      seenThoughtIds.add(thought.id);
      return true;
    })
    .slice(0, limit);
}

export function getSuggestedNextAction(
  thought: Thought | null | undefined,
  savedDistills: SavedDistill[],
): SuggestedNextAction | null {
  if (!thought) {
    return null;
  }

  const isReferencedByDraft = savedDistills.some((draft) =>
    draft.sourceThoughtIds?.includes(thought.id),
  );

  if (isReferencedByDraft) {
    return "review_draft";
  }

  if (thought.topicIds.length === 0) {
    return "organize";
  }

  if (thought.status !== "distilled") {
    return "distill";
  }

  return "continue";
}
