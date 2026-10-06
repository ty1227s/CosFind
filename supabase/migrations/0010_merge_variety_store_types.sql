begin;

update public.store_chains
set store_type = 'バラエティショップ'
where store_type in ('バラエティショップ（総合）', 'バラエティショップ（女性向け）');

update public.stores
set store_type = 'バラエティショップ'
where store_type in ('バラエティショップ（総合）', 'バラエティショップ（女性向け）');

update public.store_requests
set payload = jsonb_set(payload, '{type}', to_jsonb('バラエティショップ'::text), true)
where payload ->> 'type' in ('バラエティショップ（総合）', 'バラエティショップ（女性向け）');

commit;
