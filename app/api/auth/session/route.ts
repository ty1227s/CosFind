import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserPoints } from "@/lib/server/current-user";
import { getAuthenticatedUser } from "@/lib/server/security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
    const profile = await createSupabaseAdminClient().from("profiles").select("username,is_admin,status").eq("id", user.id).maybeSingle();
    if (profile.error || profile.data?.status !== "active") return NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ authenticated: true, isAdmin: profile.data.is_admin === true, handle: profile.data.username || "", username: user.user_metadata?.display_name || profile.data.username || "ユーザー", avatar: user.user_metadata?.avatar || "✨", avatarUrl: user.user_metadata?.avatar_url || "", ...(await getUserPoints(user.id)) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
