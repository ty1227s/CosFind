import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isPointEligibleStoreRequest } from "@/lib/server/point-eligibility";
import { getAuthenticatedUser } from "@/lib/server/security";
export const getCurrentUser = getAuthenticatedUser;
export async function getUserPoints(userId:string){const db=createSupabaseAdminClient();const[r,p,s]=await Promise.all([db.from("stock_reports").select("id",{count:"exact",head:true}).eq("user_id",userId),db.from("product_requests").select("id",{count:"exact",head:true}).eq("user_id",userId),db.from("store_requests").select("status,payload").eq("user_id",userId)]);const rows=s.data??[];const pointEligibleStoreReports=rows.filter(isPointEligibleStoreRequest).length;const storeRequests=rows.filter(row=>row.status!=="metadata").length;return{points:(r.count??0)+(p.count??0)*3+pointEligibleStoreReports*3,stockReports:r.count??0,productRequests:p.count??0,storeRequests}}
