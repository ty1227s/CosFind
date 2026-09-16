import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 20;
const kinds = new Set(["reports", "products", "stores"]);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") || "reports";
  if (!kinds.has(kind)) return NextResponse.json({ error: "履歴の種類が不正です" }, { status: 400 });

  const requestedPage = Number.parseInt(params.get("page") || "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const db = createSupabaseAdminClient();

  if (kind === "reports") {
    const result = await db
      .from("stock_reports")
      .select("id,status,confirmation_method,comment,reported_at,products(id,name,brands(name)),product_variants(variant_name,color_code),stores(id,name,chain_name)", { count: "exact" })
      .eq("user_id", user.id)
      .order("reported_at", { ascending: false })
      .range(from, to);
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    return historyResponse(result.data, result.count, page);
  }

  const table = kind === "products" ? "product_requests" : "store_requests";
  let query = db
    .from(table)
    .select("id,status,payload,created_at", { count: "exact" })
    .eq("user_id", user.id);
  if (kind === "stores") query = query.neq("status", "metadata");
  const result = await query.order("created_at", { ascending: false }).range(from, to);
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
  return historyResponse(result.data, result.count, page);
}

function historyResponse(items: unknown[] | null, count: number | null, page: number) {
  const total = count ?? 0;
  return NextResponse.json({
    items: items ?? [],
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }, { headers: { "Cache-Control": "no-store" } });
}
