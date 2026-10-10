export const dynamic = "force-dynamic";
import type {Metadata} from "next";
import {loadPage} from "@/lib/server/mobile-pages/product";
import {ProductView} from "@/components/pages/product";
import {getProductSeoData} from "@/lib/server/catalog-seo";
import {publicSiteOrigin} from "@/lib/area-links";
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const{id}=await params;const product=await getProductSeoData(id);
  if(!product)return{title:"商品が見つかりません | CosFind",robots:{index:false,follow:false}};
  const brandName=product.brand?.name??"";const displayName=[brandName,product.name].filter(Boolean).join(" ");
  const categories=[product.category,...(product.additional_categories??[])].filter(Boolean);
  const variants=product.product_variants.map(variant=>variant.color_code||variant.variant_name).filter(Boolean).slice(0,6);
  const title=`${displayName}はどこにある？ | CosFind`;
  const detailText=[categories.join("・"),variants.length?`カラー・種類：${variants.join("、")}`:""].filter(Boolean).join("。 ");
  const description=`${displayName}が最近確認された店舗を地図で探せます。${detailText ? `${detailText}。` : ""}在庫を保証するものではなく、ユーザーから寄せられた確認日時付きの情報です。`;
  const url=`${publicSiteOrigin}/products/${encodeURIComponent(id)}`;
  return{title,description,alternates:{canonical:url},openGraph:{title,description,url,type:"website"}};
}
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }){return <ProductView model={await loadPage({ params })} />;}
