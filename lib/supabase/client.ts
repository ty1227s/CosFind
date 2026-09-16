import {createBrowserClient} from "@supabase/ssr";
export function isSupabaseConfigured(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)}
export function createSupabaseBrowserClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new Error("Supabase環境変数が設定されていません。");return createBrowserClient(url,key)}
