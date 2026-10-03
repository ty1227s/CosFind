import Link from "next/link";
import {SiteHeader} from "@/components/site-header";
import {FavoriteButton} from "@/components/favorite-button";
import {formatVariantName} from "@/lib/variant-name";
import {formatStoreName} from "@/lib/store-name";
import {ProductDetailMap} from "@/components/product-detail-map";
import {ProductCategoryBadges} from "@/components/product-category-badge";
import type {loadPage} from "@/lib/server/mobile-pages/product";
type Model = Awaited<ReturnType<typeof loadPage>>;
export function ProductView({model}:{model:Model}){
const {product,brand,stores,mapStores,productMeta,customNameFlags}=model;
return <><SiteHeader/><main className="detail"><ProductCategoryBadges categories={[product.category,...(product.additional_categories??[])]} className="detail-product-categories"/><h1>{product.name}</h1><p className="lead">{brand&&<Link className="product-brand-link" href={`/brands/detail/${brand.id}`}>{brand.name}</Link>}{brand&&productMeta&&" ・ "}{productMeta}</p><FavoriteButton kind="product" id={product.id}/><section><h2>カラー / 色番 / バリエーション</h2><div className="variant-grid">{product.product_variants.map((variant) => <div key={variant.id}><b>{formatVariantName({ name: variant.variant_name, colorCode: variant.color_code ?? "" })}</b><small>色番 {variant.color_code || "—"}{variant.jan_code ? ` ・ JAN ${variant.jan_code}` : ""}</small>{variant.release_date&&<small className="variant-release-date">発売日 {new Date(`${variant.release_date}T00:00:00`).toLocaleDateString("ja-JP")}</small>}</div>)}</div></section><section><h2>店舗別の報告状況</h2><ProductDetailMap stores={mapStores}/></section><section><h2>報告されている店舗 <em>{stores.length}</em></h2>{stores.length ? stores.map((report) => { const store = report.stores!; return <Link className="detail-row" href={`/stores/${store.id}`} key={store.id}><span><b>{formatStoreName({ name: store.name, chain: store.chain_name ?? "", customName:customNameFlags[store.id]===true })}</b><small>{store.address}</small></span><span>最終情報 {new Date(report.reported_at).toLocaleDateString("ja-JP")} ›</span></Link>; }) : <div className="empty-state"><b>この商品の在庫報告はまだありません</b><p>店舗で見つけたら情報提供をお願いします。</p></div>}</section></main></>;
}
