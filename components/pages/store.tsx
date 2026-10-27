import Link from "next/link";
import {SiteHeader} from "@/components/site-header";
import {StoreDetailMap} from "@/components/store-detail-map";
import {FavoriteButton} from "@/components/favorite-button";
import {StoreProductList} from "@/components/store-product-list";
import {AuthenticatedOnly} from "@/components/authenticated-only";
import {StoreBrandReportForm} from "@/components/store-brand-report-form";
import {formatStoreBusinessDay,formatStoreHoursRange} from "@/lib/store-hours";
import {getStoreTypeCode} from "@/lib/store-type-code";
import {stationHref} from "@/lib/area-links";
import {AdminDirectEditButton} from "@/components/admin-direct-edit-button";
import {StickyStoreTitle} from "@/components/sticky-store-title";
import {BackToTopButton} from "@/components/back-to-top-button";
import type {loadPage} from "@/lib/server/mobile-pages/store";
type Model = Awaited<ReturnType<typeof loadPage>>;
export function StoreView({model}:{model:Model}){
if(model.loadError){const {id}=model;return <><SiteHeader/><main className="detail"><p className="eyebrow">STORE</p><h1>店舗情報を読み込めませんでした</h1><p className="lead">通信が一時的に不安定な可能性があります。少し待ってから、もう一度お試しください。</p><div className="detail-primary-actions"><Link className="detail-report-button" href={`/stores/${encodeURIComponent(id)}`}>再読み込み</Link><Link className="google-maps-link" href="/map">地図へ戻る</Link></div></main></>;}
const {store,openingTime,closingTime,weeklyHours,hasWeeklyHours,reportedBrands,allBrands,productItems,googleMapsUrl,storeTypeColor,displayName,jsonLd}=model;
return <><SiteHeader/><main className="detail">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,"\\u003c")}}/>
    <StickyStoreTitle name={displayName}/><p className="store-detail-type-name">{store.type}</p><div className="store-detail-title"><h1>{displayName}</h1><i style={{backgroundColor:storeTypeColor.background,color:storeTypeColor.foreground}}>{getStoreTypeCode(store.type)}</i></div><p className="lead">{store.address||"住所情報なし"}</p>
    {store.stationNames.length>0&&<div className="store-stations" aria-label="最寄り駅・周辺駅"><b>最寄り駅・周辺駅</b><div className="station-tags">{store.stationNames.map(name=><Link href={stationHref(name)} key={name}>{name}</Link>)}</div></div>}
    {hasWeeklyHours?<div className="store-weekly-hours"><b>営業時間</b><dl>{weeklyHours.map(hours=><div key={hours.key}><dt>{hours.label}</dt><dd>{formatStoreBusinessDay(hours)}</dd></div>)}</dl></div>:(openingTime||closingTime)&&<p className="store-business-hours"><b>営業時間</b><span>{formatStoreHoursRange(openingTime,closingTime)}</span></p>}
    <div className="detail-primary-actions"><FavoriteButton kind="store" id={store.id}/><a className="google-maps-link" href={googleMapsUrl} target="_blank" rel="noopener noreferrer">Googleマップで開く ↗</a><AuthenticatedOnly><Link className="detail-report-button" href={`/report?store=${store.id}`}>✦ この店舗で見つけた商品を報告</Link></AuthenticatedOnly><AdminDirectEditButton entity="store" id={store.id}/></div>
    <aside className="store-listing-notice" aria-labelledby="store-listing-notice-title"><h2 id="store-listing-notice-title">掲載情報に関するお願い</h2><p>本ページには、CosFind利用者から寄せられた情報が含まれており、当該店舗またはその運営会社が作成、確認もしくは保証したものではありません。</p><p><strong>掲載内容の確認、訂正、削除その他本ページに関するお問い合わせや苦情を、店舗またはその運営会社へ直接行うことはお控えください。</strong>掲載情報に関するご連絡は、CosFind運営者へお寄せくださいますようお願いいたします。</p></aside>
    <StoreDetailMap latitude={store.latitude} longitude={store.longitude} name={displayName} type={store.type}/>
    {reportedBrands.length>0&&<section><h2>報告があったブランド</h2><div className="reported-brands"><div>{reportedBrands.map(name=><span key={name}>{name}</span>)}</div></div></section>}
    <AuthenticatedOnly><StoreBrandReportForm storeId={store.id} brands={allBrands} reportedBrandNames={reportedBrands}/></AuthenticatedOnly>
    <section><h2>この店舗で最近報告された商品</h2><StoreProductList items={productItems}/></section>
  </main><BackToTopButton/></>;
}
