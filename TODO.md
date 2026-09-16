# MVP判断・今後のTODO
- 住所ジオコーディングは未接続。申請時は緯度経度を任意入力とする。
- 管理画面のモック表示は本番時にSSRガードとSupabase custom claimsの両方で制限する。
- `public_stock_summaries` は投稿者IDを公開しない。本番適用前にSupabaseのView/RLS挙動を結合テストする。
- 売り切れ報告はenumのみ先行定義し、MVP UIには表示しない。
- 公式商品画像は使用せず、`products.image_url` のみ将来用に用意する。
