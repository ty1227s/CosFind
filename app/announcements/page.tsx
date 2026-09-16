import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const PAGE_SIZE=20;

export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}){
  const params=await searchParams;const requested=Number.parseInt(params.page||"1",10);const page=Number.isFinite(requested)&&requested>0?requested:1;const from=(page-1)*PAGE_SIZE;
  const result=await createSupabaseAdminClient().from("announcements").select("id,title,body,published_at",{count:"exact"}).eq("is_published",true).lte("published_at",new Date().toISOString()).order("published_at",{ascending:false}).range(from,from+PAGE_SIZE-1);
  const total=result.count??0;const pageCount=Math.max(1,Math.ceil(total/PAGE_SIZE));const items=result.data??[];
  return <><SiteHeader/><main className="announcement-page"><section><header className="announcement-page-head"><p className="eyebrow">COSFIND NEWS</p><h1>お知らせ</h1><p>CosFindからの更新情報やご案内を掲載しています。</p></header>{result.error?<div className="announcement-empty">お知らせを読み込めませんでした。</div>:items.length?<div className="announcement-list">{items.map(item=><Link href={`/announcements/${item.id}`} key={item.id}><time dateTime={item.published_at}>{formatDate(item.published_at)}</time><h2>{item.title}</h2><p>{excerpt(item.body)}</p><span>続きを読む ›</span></Link>)}</div>:<div className="announcement-empty">お知らせはまだありません。</div>}{pageCount>1&&<nav className="announcement-pagination" aria-label="お知らせのページ切り替え">{page>1?<Link href={`/announcements?page=${page-1}`}>‹ 前へ</Link>:<span/>}<b>{page} / {pageCount}</b>{page<pageCount?<Link href={`/announcements?page=${page+1}`}>次へ ›</Link>:<span/>}</nav>}</section></main></>;
}
function formatDate(value:string){return new Date(value).toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric"});}
function excerpt(value:string){const normalized=value.replace(/\s+/g," ").trim();return normalized.length>140?`${normalized.slice(0,140)}…`:normalized;}
