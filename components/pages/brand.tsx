import Link from "next/link";
import {SiteHeader} from "@/components/site-header";
import {BrandProductList} from "@/components/brand-product-list";
import type {loadPage} from "@/lib/server/mobile-pages/brand";
import {publicSiteOrigin} from "@/lib/area-links";
type Model = Awaited<ReturnType<typeof loadPage>>;
export function BrandView({model}:{model:Model}){
const {brand,products}=model;
const url=`${publicSiteOrigin}/brands/detail/${encodeURIComponent(brand.id)}`;const jsonLd={"@context":"https://schema.org","@graph":[{"@type":"Brand","@id":`${url}#brand`,name:brand.name,url},{"@type":"CollectionPage",name:`${brand.name}の商品一覧`,url,about:{"@id":`${url}#brand`},mainEntity:{"@type":"ItemList",numberOfItems:products.length,itemListElement:products.slice(0,100).map((product,index)=>({"@type":"ListItem",position:index+1,name:product.name,url:`${publicSiteOrigin}/products/${encodeURIComponent(product.id)}`}))}},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"CosFind",item:publicSiteOrigin},{"@type":"ListItem",position:2,name:"ブランドから探す",item:`${publicSiteOrigin}/brands`},{"@type":"ListItem",position:3,name:brand.name,item:url}]}]};
return <>
    <SiteHeader />
    <main className="product-search-page brand-detail-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,"\\u003c")}}/>
      <section>
        <header className="product-search-head brand-detail-head">
          <div>
            <p className="eyebrow">BRAND</p>
            <h1>{brand.name}</h1>
            <p>{brand.name}の商品を一覧で確認できます。</p>
          </div>
          <Link href="/brands">← ブランドから探すへ戻る</Link>
        </header>
        <BrandProductList key={brand.id} brand={brand} products={products}/>
      </section>
    </main>
  </>;
}
