import "server-only";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
const PAGE_SIZE=20;
export async function loadPage({searchParams}:{searchParams:Promise<{page?:string}>}){
  const params=await searchParams;const requested=Number.parseInt(params.page||"1",10);const page=Number.isFinite(requested)&&requested>0?requested:1;const from=(page-1)*PAGE_SIZE;
  const result=await createSupabaseAdminClient().from("announcements").select("id,title,body,published_at",{count:"exact"}).eq("is_published",true).lte("published_at",new Date().toISOString()).order("published_at",{ascending:false}).range(from,from+PAGE_SIZE-1);
  const total=result.count??0;const pageCount=Math.max(1,Math.ceil(total/PAGE_SIZE));const items=result.data??[];const loadError=Boolean(result.error);
  return {page,pageCount,items,loadError};
}
