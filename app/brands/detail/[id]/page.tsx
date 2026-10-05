export const dynamic = "force-dynamic";
import type {Metadata} from "next";
import {loadPage} from "@/lib/server/mobile-pages/brand";
import {BrandView} from "@/components/pages/brand";
import {getBrandSeoData} from "@/lib/server/catalog-seo";
import {publicSiteOrigin} from "@/lib/area-links";
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const{id}=await params;const data=await getBrandSeoData(id);
  if(!data)return{title:"ブランドが見つかりません | CosFind",robots:{index:false,follow:false}};
  const categories=[...new Set(data.products.flatMap(product=>[product.category,...(product.additional_categories??[])])).values()].filter(Boolean).slice(0,6);
  const title=`${data.brand.name}の商品・取扱店舗情報 | CosFind`;
  const description=`${data.brand.name}${data.brand.name_kana?`（${data.brand.name_kana}）`:""}の商品${data.productCount}件を掲載。${categories.length?`${categories.join("・")}など、`:""}各商品のカラー・種類と最近確認された店舗を探せます。`;
  const url=`${publicSiteOrigin}/brands/detail/${encodeURIComponent(id)}`;
  return{title,description,alternates:{canonical:url},openGraph:{title,description,url,type:"website"}};
}
export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }){return <BrandView model={await loadPage({ params })} />;}
