import "server-only";
import {notFound} from "next/navigation";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
import {UUID_PATTERN} from "@/lib/server/validation";
export async function loadPage({ params }: { params: Promise<{ id: string }> }){
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const result = await createSupabaseAdminClient()
    .from("announcements")
    .select("id,title,body,published_at")
    .eq("id", id)
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (result.error || !result.data) notFound();

  const item = result.data;
  return {item};
}
