export function HeaderProductSearch({ mobile = false }: { mobile?: boolean }) {
  return <form action="/products" method="get" role="search" className={`header-product-search${mobile ? " mobile-header-search" : ""}`}><span aria-hidden="true">⌕</span><input type="search" name="q" placeholder="商品を検索" aria-label="商品を検索"/><button type="submit">検索</button></form>;
}
