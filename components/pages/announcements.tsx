import Link from "next/link";
import {SiteHeader} from "@/components/site-header";
import {formatAnnouncementDateTime} from "@/lib/format-announcement-date";
function excerpt(value:string){const normalized=value.replace(/\s+/g," ").trim();return normalized.length>140?`${normalized.slice(0,140)}…`:normalized;}
import type {loadPage} from "@/lib/server/mobile-pages/announcements";
type Model = Awaited<ReturnType<typeof loadPage>>;
export function AnnouncementsView({model}:{model:Model}){
const {page,pageCount,items,loadError}=model;
return <><SiteHeader/><main className="announcement-page"><section><header className="announcement-page-head"><p className="eyebrow">COSFIND NEWS</p><h1>お知らせ</h1><p>CosFindからの更新情報やご案内を掲載しています。</p></header>{loadError?<div className="announcement-empty">お知らせを読み込めませんでした。</div>:items.length?<div className="announcement-list">{items.map(item=><Link href={`/announcements/${item.id}`} key={item.id}><time dateTime={item.published_at}>{formatAnnouncementDateTime(item.published_at)}</time><h2>{item.title}</h2><p>{excerpt(item.body)}</p><span>続きを読む ›</span></Link>)}</div>:<div className="announcement-empty">お知らせはまだありません。</div>}{pageCount>1&&<nav className="announcement-pagination" aria-label="お知らせのページ切り替え">{page>1?<Link href={`/announcements?page=${page-1}`}>‹ 前へ</Link>:<span/>}<b>{page} / {pageCount}</b>{page<pageCount?<Link href={`/announcements?page=${page+1}`}>次へ ›</Link>:<span/>}</nav>}</section></main></>;
}
