import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { clientAddress, consumeRateLimit, isAuthenticatedAdmin, isSameOrigin } from "@/lib/server/security";

const ALLOWED = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
const MAX_SIZE = 1024 * 1024;
const BUCKET = "railway-line-symbols";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "不正なリクエストです" }, { status: 403 });
  if (!(await isAuthenticatedAdmin())) return NextResponse.json({ error: "管理者認証が必要です" }, { status: 401 });
  const rate = await consumeRateLimit(`railway-line-image:${clientAddress(request)}`, 30, 60 * 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "画像更新が多すぎます。時間をおいて再試行してください" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });

  const form = await request.formData();
  const file = form.get("symbol");
  if (!(file instanceof File)) return NextResponse.json({ error: "画像を選択してください" }, { status: 400 });
  const extension = ALLOWED.get(file.type);
  if (!extension) return NextResponse.json({ error: "PNG、JPEG、WebP画像を選択してください" }, { status: 400 });
  if (file.size === 0 || file.size > MAX_SIZE) return NextResponse.json({ error: "画像は1MB以下にしてください" }, { status: 400 });
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const signatureOk = file.type === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : file.type === "image/png" ? bytes.slice(0, 8).every((value, index) => value === [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a][index])
    : file.type === "image/webp" ? String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" : false;
  if (!signatureOk) return NextResponse.json({ error: "画像ファイルの内容を確認できませんでした" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const buckets = await admin.storage.listBuckets();
  if (buckets.error) return NextResponse.json({ error: buckets.error.message }, { status: 500 });
  if (!buckets.data.some((bucket) => bucket.id === BUCKET)) {
    const created = await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_SIZE, allowedMimeTypes: [...ALLOWED.keys()] });
    if (created.error) return NextResponse.json({ error: created.error.message }, { status: 500 });
  }
  const path = `symbols/${crypto.randomUUID()}.${extension}`;
  const uploaded = await admin.storage.from(BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (uploaded.error) return NextResponse.json({ error: uploaded.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, imageUrl: admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
}
