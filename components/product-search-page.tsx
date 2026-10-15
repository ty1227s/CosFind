"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { catalogRepository } from "@/lib/data";
import { PRODUCT_CATEGORIES } from "@/lib/product-categories";
import type { Product } from "@/types/domain";
import { SiteHeader } from "./site-header";
import { ProductCategoryBadges } from "./product-category-badge";

const PRODUCT_SEARCH_PAGE_SIZE = 20;

export function ProductSearchPage({ initialBrand="", initialQuery="" }: { initialBrand?:string; initialQuery?:string }) {
  const [products,setProducts]=useState<Product[]|null>(null);
  const [query,setQuery]=useState(initialQuery);
  const [brand,setBrand]=useState(initialBrand);
  const [category,setCategory]=useState("");
  const [page,setPage]=useState(1);
  const [error,setError]=useState("");
  useEffect(()=>{let active=true;void catalogRepository.searchProducts("").then(rows=>{if(active){setProducts(rows);setError("")}}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:"商品を取得できませんでした")});return()=>{active=false}},[]);
  const brands=useMemo(()=>[...new Set((products??[]).map(product=>product.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ja")),[products]);
  const searching=Boolean(query.trim()||brand||category);
  const results=useMemo(()=>{const keyword=query.trim().toLowerCase();return(products??[]).filter(product=>{const categories=[product.category,...(product.additionalCategories??[])];const match=!keyword||`${product.name} ${product.brand} ${categories.join(" ")} ${product.janCode} ${(product.additionalJanCodes??[]).join(" ")} ${product.variants.map(v=>`${v.name} ${v.colorCode??""} ${v.janCode}`).join(" ")}`.toLowerCase().includes(keyword);return match&&(!brand||product.brand===brand)&&(!category||categories.includes(category))})},[products,query,brand,category]);
  useEffect(()=>setPage(1),[query,brand,category]);
  const pageCount=Math.max(1,Math.ceil(results.length/PRODUCT_SEARCH_PAGE_SIZE));
  const currentPage=Math.min(page,pageCount);
  const visibleResults=results.slice((currentPage-1)*PRODUCT_SEARCH_PAGE_SIZE,currentPage*PRODUCT_SEARCH_PAGE_SIZE);
  return <><SiteHeader/><main className="product-search-page"><section>
    <header className="product-search-head"><div><p className="eyebrow">PRODUCT SEARCH</p><h1>商品を検索</h1><p>ブランド・商品名・カテゴリ・カラーからコスメを探せます。</p></div><Link href="/">← トップページへ</Link></header>
    <div className="product-search-controls"><label><span>キーワード</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="商品名・カラー名・色番"/></label><label><span>ブランド</span><select value={brand} onChange={e=>setBrand(e.target.value)}><option value="">すべてのブランド</option>{brands.map(item=><option key={item}>{item}</option>)}</select></label><label><span>カテゴリ</span><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">すべてのカテゴリ</option>{PRODUCT_CATEGORIES.map(item=><option key={item}>{item}</option>)}</select></label><button type="button" disabled={!searching} onClick={()=>{setQuery("");setBrand("");setCategory("")}}>条件をクリア</button></div>
<div className="product-search-content" aria-live="polite">{error?<div className="product-search-empty is-error"><span>!</span><b>商品情報を読み込めませんでした</b><p>{error}</p></div>:products===null?<div className="product-search-empty is-loading"><i/><b>商品情報を読み込んでいます</b><p>検索の準備が整うまで少しお待ちください。</p></div>:!searching?<div className="product-search-empty"><span>⌕</span><b>商品を探してみましょう</b><p>キーワードを入力するか、ブランド・カテゴリを選択してください。</p></div>:<><div className="product-search-result-head"><div><b>{results.length}</b><span>商品が見つかりました</span></div><small>商品を選ぶと詳細と店舗情報を確認できます</small></div>{results.length?<><div className="product-search-list">{visibleResults.map(product=><Link href={`/products/${product.id}`} className="product-search-list-row" key={product.id}><span><small>{product.brand||"ブランド未設定"}</small><b>{product.name}</b></span><ProductCategoryBadges categories={[product.category,...(product.additionalCategories??[])]}/><span>{Math.max(1,product.variants.length)}種</span><strong>詳細を見る <i>→</i></strong></Link>)}</div>{pageCount>1&&<nav className="product-search-pagination" aria-label="商品検索結果のページ切り替え"><button type="button" disabled={currentPage===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>‹ 前へ</button><b>{currentPage} / {pageCount}</b><button type="button" disabled={currentPage===pageCount} onClick={()=>setPage(value=>Math.min(pageCount,value+1))}>次へ ›</button></nav>}</>:<div className="product-search-empty"><span>○</span><b>条件に一致する商品はありません</b><p>表記を短くするか、条件を減らしてお試しください。</p></div>}</>}</div>
  </section></main></>;
}
