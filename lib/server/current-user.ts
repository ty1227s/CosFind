import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUser } from "@/lib/server/security";
export const getCurrentUser = getAuthenticatedUser;
export async function getUserPoints(userId:string){const db=createSupabaseAdminClient();const[r,p,s,b]=await Promise.all([db.from("stock_reports").select("id",{count:"exact",head:true}).eq("user_id",userId),db.from("product_requests").select("id",{count:"exact",head:true}).eq("user_id",userId),db.from("store_requests").select("id",{count:"exact",head:true}).eq("user_id",userId).neq("status","metadata"),db.from("store_requests").select("id",{count:"exact",head:true}).eq("user_id",userId).eq("status","metadata").eq("payload->>metadataType","store_brand_report")]);const pointEligibleStoreReports=(s.count??0)+(b.count??0);return{points:(r.count??0)+(p.count??0)*3+pointEligibleStoreReports*3,stockReports:r.count??0,productRequests:p.count??0,storeRequests:s.count??0}}
