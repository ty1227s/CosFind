alter table public.products
  add column if not exists additional_jan_codes text[] not null default '{}';

create index if not exists products_additional_jan_codes_gin_idx
  on public.products using gin (additional_jan_codes);

comment on column public.products.additional_jan_codes is
  '商品単位の追加JANコード。代表JANはjan_code、カラー別JANはproduct_variants.jan_codeに保存する。';
