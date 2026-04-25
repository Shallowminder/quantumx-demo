import type { Session } from "@supabase/supabase-js";
import {
  authRedirectPath,
  getSupabaseClient,
  isSupabaseConfigured,
  isWeChatConfigured,
  weChatProviderId,
} from "./supabaseClient";

export interface AuthState {
  configured: boolean;
  session: Session | null;
}

export interface AuthRepository {
  getState(): Promise<AuthState>;
  sendMagicLink(email: string): Promise<void>;
  getWeChatOAuthUrl(): Promise<string>;
  signInWithWeChat(): Promise<void>;
  signOut(): Promise<void>;
  onAuthChange(callback: (session: Session | null) => void): () => void;
}

export function getAuthRedirectUrl() {
  if (typeof window === "undefined") {
    return authRedirectPath;
  }
  return new URL(authRedirectPath, window.location.origin).toString();
}

export function isAuthCallbackPath(pathname: string) {
  return pathname === authRedirectPath;
}

export function createSupabaseAuthRepository(): AuthRepository {
  return {
    async getState() {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        return { configured: false, session: null };
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { configured: true, session: data.session };
    },

    async sendMagicLink(email) {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) throw error;
    },

    async getWeChatOAuthUrl() {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }
      if (!isWeChatConfigured || !weChatProviderId) {
        throw new Error("WeChat OAuth provider is not configured.");
      }

      const provider = weChatProviderId as Parameters<
        typeof supabase.auth.signInWithOAuth
      >[0]["provider"];

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthRedirectUrl(),
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (!data.url) {
        throw new Error("WeChat OAuth url is empty.");
      }
      return data.url;
    },

    async signInWithWeChat() {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        throw new Error("Supabase is not configured.");
      }
      if (!isWeChatConfigured || !weChatProviderId) {
        throw new Error("WeChat OAuth provider is not configured.");
      }

      const provider = weChatProviderId as Parameters<
        typeof supabase.auth.signInWithOAuth
      >[0]["provider"];

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) throw error;
    },

    async signOut() {
      const supabase = await getSupabaseClient();
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },

    onAuthChange(callback) {
      let unsubscribe: () => void = () => {};

      if (isSupabaseConfigured) {
        void getSupabaseClient().then((supabase) => {
          if (!supabase) return;
          const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            callback(session);
          });
          unsubscribe = () => data.subscription.unsubscribe();
        });
      }

      return () => unsubscribe();
    },
  };
}

export const authRepository = createSupabaseAuthRepository();
export {
  authRedirectPath,
  isSupabaseConfigured,
  isWeChatConfigured,
  weChatProviderId,
};
