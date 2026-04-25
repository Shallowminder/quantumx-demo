import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabaseWeChatProvider = import.meta.env
  .VITE_SUPABASE_WECHAT_PROVIDER as string | undefined;
const supabaseAuthRedirectPath = import.meta.env
  .VITE_SUPABASE_AUTH_REDIRECT_PATH as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const weChatProviderId = supabaseWeChatProvider?.trim() ?? "";
export const isWeChatConfigured = weChatProviderId.length > 0;
export const authRedirectPath = (() => {
  const cleanPath = supabaseAuthRedirectPath?.trim();
  if (!cleanPath) return "/auth/callback";
  return cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
})();

let cachedClient: SupabaseClient | null = null;

export async function getSupabaseClient() {
  if (!isSupabaseConfigured) return null;
  if (cachedClient) return cachedClient;

  const { createClient } = await import("@supabase/supabase-js");
  cachedClient = createClient(supabaseUrl as string, supabaseAnonKey as string);
  return cachedClient;
}
