import {createClient} from "@supabase/supabase-js";
const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
export function createSupabaseBrowserClient(){return client;}
