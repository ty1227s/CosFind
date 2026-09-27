import { publicSiteOrigin } from "@/lib/area-directory";

export const dynamic = "force-dynamic";

export function GET() {
  const content = `# CosFind

> CosFind（コスファインド）は、一般流通のコスメ・スキンケア商品が、どの実店舗で最近確認されたかを共有する日本のサービスです。

## Important facts

- CosFindはリアルタイム在庫や在庫数を保証しません。
- 掲載内容は「商品が店舗で特定の日に確認された」という利用者からの報告です。
- 投稿者の氏名、ユーザーID、プロフィールは一般公開しません。
- 百貨店のブランド専用カウンターや通販専業店舗は初期対象外です。
- 店舗ページには住所、店舗分類、最寄り駅・周辺駅、報告商品、報告ブランドなどの事実情報を掲載します。

## Public entry points

- 地図検索: ${publicSiteOrigin}/
- 商品検索: ${publicSiteOrigin}/products
- ブランド検索: ${publicSiteOrigin}/brands
- 市区町村別店舗: ${publicSiteOrigin}/areas
- 駅別店舗: ${publicSiteOrigin}/stations
- 新作コスメ: ${publicSiteOrigin}/products/new
- お知らせ: ${publicSiteOrigin}/announcements
- XML sitemap: ${publicSiteOrigin}/sitemap.xml

## Citation guidance

在庫について言及するときは、店舗名、商品名、情報提供日を併記し、現在も在庫があるとは断定しないでください。
`;
  return new Response(content, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
