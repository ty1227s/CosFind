-- 「ネイルリムーバー」と「除光液」は同義のため、表示名を「除光液」に統一する。
update public.products
set category = '除光液'
where category = 'ネイルリムーバー';

update public.products as product
set additional_categories = (
  select array_agg(normalized.category order by normalized.first_position)
  from (
    select
      case when item.category = 'ネイルリムーバー' then '除光液' else item.category end as category,
      min(item.position) as first_position
    from unnest(product.additional_categories) with ordinality as item(category, position)
    group by case when item.category = 'ネイルリムーバー' then '除光液' else item.category end
  ) as normalized
)
where 'ネイルリムーバー' = any(product.additional_categories);

update public.product_requests
set payload = jsonb_set(payload, '{category}', to_jsonb('除光液'::text), false)
where payload ->> 'category' = 'ネイルリムーバー';
