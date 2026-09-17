import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientAddress, consumeRateLimit, isSameOrigin, isSupabaseMode } from "@/lib/server/security";

function redirect(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  const rate = await consumeRateLimit(`password-reset:${clientAddress(request)}`, 5, 60 * 60_000);
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return redirect(request, "/forgot-password?error=invalid");
  }
  if (!isSupabaseMode()) return redirect(request, "/forgot-password?error=unavailable");

  // 未登録・送信制限・プロバイダー側エラーの違いを画面へ返さず、アカウント列挙を防ぐ。
  if (rate.allowed) {
    const auth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    await auth.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(request.url).origin}/reset-password`,
    });
  }

  return redirect(request, "/forgot-password?sent=1");
}
