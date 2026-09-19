import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const result = await createSupabaseAdminClient()
      .from("brands")
      .select("id,name,name_kana")
      .order("name");
    if (result.error) throw result.error;
    return NextResponse.json(
      { brands: result.data ?? [] },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json({ error: "ブランド情報を取得できませんでした" }, { status: 500 });
  }
}
