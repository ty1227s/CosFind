import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { UUID_PATTERN } from "@/lib/server/validation";
import { formatAnnouncementDateTime } from "@/lib/format-announcement-date";

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();

  const result = await createSupabaseAdminClient()
    .from("announcements")
    .select("id,title,body,published_at")
    .eq("id", id)
    .eq("is_published", true)
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (result.error || !result.data) notFound();

  const item = result.data;
  return (
    <>
      <SiteHeader />
      <main className="announcement-detail">
        <article>
          <Link href="/announcements" className="announcement-back">
            ‹ お知らせ一覧へ
          </Link>
          <time className="announcement-published-date" dateTime={item.published_at}>
            {formatAnnouncementDateTime(item.published_at)}
          </time>
          <h1>{item.title}</h1>
          <div className="announcement-body">{item.body}</div>
        </article>
      </main>
    </>
  );
}
