alter table public.products
  add column if not exists additional_categories text[] not null default '{}';

create index if not exists products_additional_categories_gin_idx
  on public.products using gin (additional_categories);

comment on column public.products.additional_categories is
  '主カテゴリ（category）に加えて商品へ設定する追加カテゴリ';
