import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserPoints } from "@/lib/server/current-user";
import { isSameOrigin } from "@/lib/server/security";

const AVATARS = ["🌸", "💄", "✨", "🫧", "🌿", "☀️", "🎀", "💎"];

async function currentUser() {
  const token = (await cookies()).get("sb-access-token")?.value;
  if (!token) return null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const profile = await admin.from("profiles").select("username").eq("id", user.id).maybeSingle();
  return NextResponse.json({
    username: profile.data?.username || "",
    displayName: typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : (profile.data?.username || "ユーザー"),
    avatar: AVATARS.includes(user.user_metadata?.avatar) ? user.user_metadata.avatar : "✨",
    avatarUrl: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "",
    ...(await getUserPoints(user.id)),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const body = await request.json() as { displayName?: string; avatar?: string };
  const displayName = body.displayName?.trim() || "";
  if (displayName.length < 1 || displayName.length > 24) return NextResponse.json({ error: "HNは1～24文字で入力してください" }, { status: 400 });
  if (!AVATARS.includes(body.avatar || "")) return NextResponse.json({ error: "アイコンを選択してください" }, { status: 400 });
  const admin = createSupabaseAdminClient();
  const updated = await admin.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, display_name: displayName, avatar: body.avatar, avatar_url: "" } });
  if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, displayName, avatar: body.avatar });
}
