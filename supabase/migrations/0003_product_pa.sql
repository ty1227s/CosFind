alter table public.products
  add column if not exists pa text;

alter table public.products
  drop constraint if exists products_pa_check;

alter table public.products
  add constraint products_pa_check
  check (pa is null or pa in ('+', '++', '+++', '++++'));

comment on column public.products.pa is
  'Optional Japanese UV protection grade: +, ++, +++, or ++++.';
