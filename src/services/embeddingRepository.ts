import { getSupabaseClient } from "./supabaseClient";

interface EmbedThoughtsResult {
  embedded: number;
  skipped: number;
  reason?: string;
}

export async function primeThoughtEmbeddings(
  thoughtClientIds: string[],
): Promise<EmbedThoughtsResult | null> {
  const supabase = await getSupabaseClient();
  if (!supabase || thoughtClientIds.length === 0) return null;

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) return null;

  const { data, error } = await supabase.functions.invoke<EmbedThoughtsResult>(
    "embed-thoughts",
    {
      body: {
        thoughtClientIds,
        limit: Math.min(20, thoughtClientIds.length),
      },
    },
  );

  if (error) throw error;
  return data ?? null;
}
