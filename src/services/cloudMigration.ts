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

export interface CloudRestoreResult {
  snapshot: QuantumXDataSnapshot;
  thoughts: number;
  topics: number;
  drafts: number;
  captureDraft: boolean;
}

interface ClientMappedRow {
  id: string;
  client_id: string;
}

interface TopicRow {
  id: string;
  client_id: string;
  name: string;
  summary: string;
  description: string;
  accent: Topic["accent"];
  signals: string[] | null;
  distill: Topic["distill"] | null;
  updated_at: string;
}

interface ThoughtRow {
  id: string;
  client_id: string;
  content: string;
  source: string;
  summary: string;
  status: Thought["status"];
  questions: string[] | null;
  related_thought_ids: string[] | null;
  created_at: string;
}

interface ThoughtTopicRow {
  thought_id: string;
  topic_id: string;
}

interface DraftRow {
  client_id: string;
  topic_id: string | null;
  title: string;
  output_type: "文章提纲" | "复盘框架" | "观点卡片";
  content: string;
  source_thought_ids: string[] | null;
  created_at: string;
  updated_at: string;
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

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: sessionData.session?.user.email ?? "QuantumX 用户",
  });
  if (profileError) throw profileError;

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

export async function restoreSnapshotFromSupabase(): Promise<CloudRestoreResult> {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user.id;
  if (!userId) {
    throw new Error("You need to sign in before restoring.");
  }

  const [
    topicsResponse,
    thoughtsResponse,
    linksResponse,
    draftsResponse,
    captureDraftResponse,
  ] = await Promise.all([
    supabase
      .from("topics")
      .select("id, client_id, name, summary, description, accent, signals, distill, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("thoughts")
      .select("id, client_id, content, source, summary, status, questions, related_thought_ids, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("thought_topics")
      .select("thought_id, topic_id")
      .eq("user_id", userId),
    supabase
      .from("distill_drafts")
      .select("client_id, topic_id, title, output_type, content, source_thought_ids, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("capture_drafts")
      .select("content")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (topicsResponse.error) throw topicsResponse.error;
  if (thoughtsResponse.error) throw thoughtsResponse.error;
  if (linksResponse.error) throw linksResponse.error;
  if (draftsResponse.error) throw draftsResponse.error;
  if (captureDraftResponse.error) throw captureDraftResponse.error;

  const topicRows = (topicsResponse.data ?? []) as TopicRow[];
  const thoughtRows = (thoughtsResponse.data ?? []) as ThoughtRow[];
  const linkRows = (linksResponse.data ?? []) as ThoughtTopicRow[];
  const draftRows = (draftsResponse.data ?? []) as DraftRow[];

  const topicIdToClientId = new Map(topicRows.map((row) => [row.id, row.client_id]));
  const thoughtIdToClientId = new Map(
    thoughtRows.map((row) => [row.id, row.client_id]),
  );
  const topicThoughtIds = new Map<string, string[]>();

  linkRows.forEach((row) => {
    const topicClientId = topicIdToClientId.get(row.topic_id);
    const thoughtClientId = thoughtIdToClientId.get(row.thought_id);
    if (!topicClientId || !thoughtClientId) return;
    const current = topicThoughtIds.get(topicClientId) ?? [];
    topicThoughtIds.set(topicClientId, [...current, thoughtClientId]);
  });

  const topics: Topic[] = topicRows.map((row) => ({
    id: row.client_id,
    name: row.name,
    summary: row.summary,
    description: row.description,
    updatedAt: row.updated_at,
    accent: row.accent ?? "stone",
    thoughtIds: topicThoughtIds.get(row.client_id) ?? [],
    signals: Array.isArray(row.signals) ? row.signals : [],
    distill:
      row.distill ?? {
        title: `${row.name} 的整理草稿`,
        format: "文章提纲",
        basedOn: "基于云端记录恢复",
        outline: [],
        cards: [],
      },
  }));

  const thoughts: Thought[] = thoughtRows.map((row) => {
    const topicIds = linkRows
      .filter((link) => link.thought_id === row.id)
      .map((link) => topicIdToClientId.get(link.topic_id))
      .filter((id): id is string => Boolean(id));

    const relatedIds = (row.related_thought_ids ?? [])
      .map((cloudThoughtId) => thoughtIdToClientId.get(cloudThoughtId))
      .filter((id): id is string => Boolean(id));

    return {
      id: row.client_id,
      content: row.content,
      createdAt: row.created_at,
      source: row.source,
      summary: row.summary,
      topicIds,
      relatedIds,
      questions: Array.isArray(row.questions) ? row.questions : [],
      status: row.status,
    };
  });

  const savedDistills = draftRows.map((row) => ({
    id: row.client_id,
    topicId: row.topic_id ? topicIdToClientId.get(row.topic_id) ?? "" : "",
    title: row.title,
    outputType: row.output_type,
    content: row.content,
    sourceThoughtIds: (row.source_thought_ids ?? [])
      .map((cloudThoughtId) => thoughtIdToClientId.get(cloudThoughtId))
      .filter((id): id is string => Boolean(id)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const snapshot: QuantumXDataSnapshot = {
    thoughts,
    topics,
    savedDistills,
    captureDraft: captureDraftResponse.data?.content ?? "",
  };

  return {
    snapshot,
    thoughts: thoughts.length,
    topics: topics.length,
    drafts: savedDistills.length,
    captureDraft: snapshot.captureDraft.trim().length > 0,
  };
}
