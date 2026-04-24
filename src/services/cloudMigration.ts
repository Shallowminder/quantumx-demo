import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabaseClient";
import type { QuantumXDataSnapshot, Thought, Topic } from "../types";

export interface CloudMigrationResult {
  thoughts: number;
  topics: number;
  links: number;
  drafts: number;
  captureDraft: boolean;
}

interface ClientMappedRow {
  id: string;
  client_id: string;
}

function mapRows(rows: ClientMappedRow[]) {
  return new Map(rows.map((row) => [row.client_id, row.id]));
}

function uniqueLinks(thoughts: Thought[], topics: Topic[]) {
  const pairs = new Map<string, { thoughtClientId: string; topicClientId: string }>();

  thoughts.forEach((thought) => {
    thought.topicIds.forEach((topicId) => {
      pairs.set(`${thought.id}:${topicId}`, {
        thoughtClientId: thought.id,
        topicClientId: topicId,
      });
    });
  });

  topics.forEach((topic) => {
    topic.thoughtIds.forEach((thoughtId) => {
      pairs.set(`${thoughtId}:${topic.id}`, {
        thoughtClientId: thoughtId,
        topicClientId: topic.id,
      });
    });
  });

  return Array.from(pairs.values());
}

async function upsertTopics(
  supabase: SupabaseClient,
  userId: string,
  snapshot: QuantumXDataSnapshot,
) {
  if (snapshot.topics.length === 0) return new Map<string, string>();

  const rows = snapshot.topics.map((topic) => ({
    user_id: userId,
    client_id: topic.id,
    name: topic.name,
    summary: topic.summary,
    description: topic.description,
    accent: topic.accent,
    signals: topic.signals,
    distill: topic.distill,
    updated_at: topic.updatedAt,
  }));

  const { data, error } = await supabase
    .from("topics")
    .upsert(rows, { onConflict: "user_id,client_id" })
    .select("id, client_id");

  if (error) throw error;
  return mapRows((data ?? []) as ClientMappedRow[]);
}

async function upsertThoughts(
  supabase: SupabaseClient,
  userId: string,
  snapshot: QuantumXDataSnapshot,
) {
  if (snapshot.thoughts.length === 0) return new Map<string, string>();

  const rows = snapshot.thoughts.map((thought) => ({
    user_id: userId,
    client_id: thought.id,
    content: thought.content,
    source: thought.source,
    summary: thought.summary,
    status: thought.status,
    questions: thought.questions,
    created_at: thought.createdAt,
    archived_at: thought.status === "archived" ? thought.createdAt : null,
  }));

  const { data, error } = await supabase
    .from("thoughts")
    .upsert(rows, { onConflict: "user_id,client_id" })
    .select("id, client_id");

  if (error) throw error;
  return mapRows((data ?? []) as ClientMappedRow[]);
}

async function updateRelatedThoughts(
  supabase: SupabaseClient,
  thoughts: Thought[],
  thoughtIdMap: Map<string, string>,
) {
  const updates = thoughts
    .map((thought) => {
      const cloudThoughtId = thoughtIdMap.get(thought.id);
      if (!cloudThoughtId) return null;
      const relatedThoughtIds = thought.relatedIds
        .map((relatedId) => thoughtIdMap.get(relatedId))
        .filter((id): id is string => Boolean(id));
      return { cloudThoughtId, relatedThoughtIds };
    })
    .filter((item): item is { cloudThoughtId: string; relatedThoughtIds: string[] } =>
      Boolean(item),
    );

  for (const update of updates) {
    const { error } = await supabase
      .from("thoughts")
      .update({ related_thought_ids: update.relatedThoughtIds })
      .eq("id", update.cloudThoughtId);
    if (error) throw error;
  }
}

async function upsertThoughtTopicLinks(
  supabase: SupabaseClient,
  userId: string,
  snapshot: QuantumXDataSnapshot,
  thoughtIdMap: Map<string, string>,
  topicIdMap: Map<string, string>,
) {
  const rows = uniqueLinks(snapshot.thoughts, snapshot.topics)
    .map((link) => {
      const thoughtId = thoughtIdMap.get(link.thoughtClientId);
      const topicId = topicIdMap.get(link.topicClientId);
      if (!thoughtId || !topicId) return null;
      return {
        user_id: userId,
        thought_id: thoughtId,
        topic_id: topicId,
      };
    })
    .filter((row): row is { user_id: string; thought_id: string; topic_id: string } =>
      Boolean(row),
    );

  if (rows.length === 0) return 0;

  const { error } = await supabase
    .from("thought_topics")
    .upsert(rows, { onConflict: "thought_id,topic_id" });

  if (error) throw error;
  return rows.length;
}

async function upsertDistillDrafts(
  supabase: SupabaseClient,
  userId: string,
  snapshot: QuantumXDataSnapshot,
  thoughtIdMap: Map<string, string>,
  topicIdMap: Map<string, string>,
) {
  if (snapshot.savedDistills.length === 0) return 0;

  const rows = snapshot.savedDistills.map((draft) => ({
    user_id: userId,
    client_id: draft.id,
    topic_id: topicIdMap.get(draft.topicId) ?? null,
    title: draft.title,
    output_type: draft.outputType,
    content: draft.content,
    source_thought_ids: draft.sourceThoughtIds
      .map((thoughtId) => thoughtIdMap.get(thoughtId))
      .filter((id): id is string => Boolean(id)),
    created_at: draft.createdAt,
    updated_at: draft.updatedAt ?? draft.createdAt,
  }));

  const { error } = await supabase
    .from("distill_drafts")
    .upsert(rows, { onConflict: "user_id,client_id" });

  if (error) throw error;
  return rows.length;
}

async function upsertCaptureDraft(
  supabase: SupabaseClient,
  userId: string,
  snapshot: QuantumXDataSnapshot,
) {
  const { error } = await supabase.from("capture_drafts").upsert({
    user_id: userId,
    content: snapshot.captureDraft,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
  return snapshot.captureDraft.trim().length > 0;
}

export async function migrateLocalSnapshotToSupabase(
  snapshot: QuantumXDataSnapshot,
): Promise<CloudMigrationResult> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user.id;
  if (!userId) {
    throw new Error("You need to sign in before syncing.");
  }

  await supabase.from("profiles").upsert({
    id: userId,
    display_name: sessionData.session?.user.email ?? "QuantumX 用户",
  });

  const topicIdMap = await upsertTopics(supabase, userId, snapshot);
  const thoughtIdMap = await upsertThoughts(supabase, userId, snapshot);
  await updateRelatedThoughts(supabase, snapshot.thoughts, thoughtIdMap);
  const links = await upsertThoughtTopicLinks(
    supabase,
    userId,
    snapshot,
    thoughtIdMap,
    topicIdMap,
  );
  const drafts = await upsertDistillDrafts(
    supabase,
    userId,
    snapshot,
    thoughtIdMap,
    topicIdMap,
  );
  const captureDraft = await upsertCaptureDraft(supabase, userId, snapshot);

  return {
    thoughts: thoughtIdMap.size,
    topics: topicIdMap.size,
    links,
    drafts,
    captureDraft,
  };
}
