import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isPointEligibleStoreRequest } from "@/lib/server/point-eligibility";
import { isAuthenticatedAdmin } from "@/lib/server/security";

export const dynamic = "force-dynamic";

async function authorized() {
  return isAuthenticatedAdmin();
}

function countByUser(rows: { user_id: string }[] | null) {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  return counts;
}

function metadataIds(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").length : 0;
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "管理者認証が必要です" }, { status: 401 });
  try {
    const db = createSupabaseAdminClient();
    const [profiles, authUsers, reports, productRequests, storeRequests] = await Promise.all([
      db.from("profiles").select("id,username,created_at,status,posting_suspended,is_admin").order("created_at", { ascending: false }),
      db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      db.from("stock_reports").select("user_id"),
      db.from("product_requests").select("user_id"),
      db.from("store_requests").select("user_id,status,payload"),
    ]);
    const error = profiles.error || authUsers.error || reports.error || productRequests.error || storeRequests.error;
    if (error) throw error;
    const authById = new Map(authUsers.data.users.map((user) => [user.id, user]));
    const reportCounts = countByUser(reports.data);
    const productRequestCounts = countByUser(productRequests.data);
    const storeRequestCounts = countByUser((storeRequests.data ?? []).filter(isPointEligibleStoreRequest));
    const users = (profiles.data ?? []).map((profile) => {
      const auth = authById.get(profile.id);
      const stockReports = reportCounts.get(profile.id) ?? 0;
      const productRequestCount = productRequestCounts.get(profile.id) ?? 0;
      const storeRequestCount = storeRequestCounts.get(profile.id) ?? 0;
      return {
        id: profile.id,
        username: profile.username ?? "",
        displayName: typeof auth?.user_metadata?.display_name === "string" ? auth.user_metadata.display_name : (profile.username ?? "ユーザー"),
        email: auth?.email ?? "",
        avatar: typeof auth?.user_metadata?.avatar === "string" ? auth.user_metadata.avatar : "✨",
        avatarUrl: typeof auth?.user_metadata?.avatar_url === "string" ? auth.user_metadata.avatar_url : "",
        status: profile.status,
        postingSuspended: profile.posting_suspended,
        isAdmin: profile.is_admin,
        createdAt: profile.created_at,
        lastSignInAt: auth?.last_sign_in_at ?? null,
        stockReports,
        productRequests: productRequestCount,
        storeRequests: storeRequestCount,
        points: stockReports + productRequestCount * 3 + storeRequestCount * 3,
        favoriteProducts: metadataIds(auth?.user_metadata?.favorite_product_ids),
        favoriteStores: metadataIds(auth?.user_metadata?.favorite_store_ids),
      };
    });
    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ユーザー一覧を取得できませんでした" }, { status: 500 });
  }
}
