alter table public.product_variants
  add column if not exists release_date date;

comment on column public.product_variants.release_date is
  'Optional release date for this color or variation. Independent from products.release_date.';
