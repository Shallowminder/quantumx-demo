/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_WECHAT_PROVIDER?: string;
  readonly VITE_SUPABASE_AUTH_REDIRECT_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface WeChatQrLoginOptions {
  id: string;
  appid: string;
  scope: string;
  redirect_uri: string;
  state: string;
  style?: "black" | "white";
  href?: string;
  self_redirect?: boolean;
}

interface Window {
  WxLogin?: new (options: WeChatQrLoginOptions) => unknown;
}
