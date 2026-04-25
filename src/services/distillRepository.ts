import { getSupabaseClient } from "./supabaseClient";
import type { DistillOutputType, Thought, Topic } from "../types";

export interface CloudDistillResult {
  title: string;
  content: string;
}

interface GenerateCloudDistillParams {
  outputType: DistillOutputType;
  topic: Topic;
  thoughts: Thought[];
}

function compactThought(thought: Thought) {
  return {
    id: thought.id,
    content: thought.content,
    summary: thought.summary,
    source: thought.source,
    createdAt: thought.createdAt,
    questions: thought.questions,
    status: thought.status,
  };
}

export async function generateCloudDistill({
  outputType,
  topic,
  thoughts,
}: GenerateCloudDistillParams): Promise<CloudDistillResult | null> {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  const { data, error } = await supabase.functions.invoke("distill", {
    body: {
      outputType,
      topic: {
        id: topic.id,
        name: topic.name,
        summary: topic.summary,
        description: topic.description,
      },
      thoughts: thoughts.map(compactThought),
    },
  });

  if (error) throw error;

  const result = data as Partial<CloudDistillResult> | null;
  if (!result?.content || !result?.title) {
    throw new Error("Distill function returned an invalid result.");
  }

  return {
    title: result.title,
    content: result.content,
  };
}
