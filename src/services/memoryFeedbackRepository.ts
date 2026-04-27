import { getSupabaseClient } from "./supabaseClient";
import type { MemoryFeedbackType } from "../types";

interface RecordMemoryFeedbackParams {
  feedbackType: MemoryFeedbackType;
  targetThoughtId: string;
  sourceThoughtId?: string;
  context?: string;
}

export async function recordMemoryFeedback({
  feedbackType,
  targetThoughtId,
  sourceThoughtId,
  context,
}: RecordMemoryFeedbackParams): Promise<boolean> {
  const supabase = await getSupabaseClient();
  if (!supabase) return false;

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) return false;

  const { error } = await supabase.from("memory_feedback").insert({
    user_id: session.user.id,
    source_thought_id: sourceThoughtId ?? null,
    target_thought_id: targetThoughtId,
    feedback_type: feedbackType,
    context: context?.trim() ? context.trim().slice(0, 2000) : null,
  });

  if (error) throw error;
  return true;
}
