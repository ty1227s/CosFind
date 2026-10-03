import Link from "next/link";
import {SiteHeader} from "@/components/site-header";
import {formatAnnouncementDateTime} from "@/lib/format-announcement-date";
import type {loadPage} from "@/lib/server/mobile-pages/announcement";
type Model = Awaited<ReturnType<typeof loadPage>>;
export function AnnouncementView({model}:{model:Model}){
const {item}=model;
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
