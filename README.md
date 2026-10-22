# CosFind（コスファインド）

「欲しいコスメ、どのお店にある？」一般流通コスメの店頭目撃情報を匿名で共有するWebアプリです。リアルタイム在庫は保証せず、確認日と店舗を提供します。

## 技術構成

Next.js / TypeScript / App Router / Tailwind CSS / MapLibre GL JS / Supabase Auth + PostgreSQL + RLS / PWA manifest。データ取得はRepository境界でUIから分離しています。

## 環境構築

ローカル開発ではNode.js 22.23.4以上（22.xまたは24.x）を使用します。Cloudflare Workers Buildsでは、ビルドイメージにプリインストールされたNode.js 24.21.0を使用します。

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 環境変数

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: クライアント用Publishable key（`sb_publishable_...`）
- `SUPABASE_SECRET_KEY`: サーバー専用Secret key（`sb_secret_...`）。`NEXT_PUBLIC_`を付けず、ブラウザコードから参照しない
- `NEXT_PUBLIC_MAP_TILE_URL`: MapLibre用タイルURL
- `X_API_KEY` / `X_API_SECRET`: X Developer Consoleで作成したCosFind用AppのOAuth 1.0a API Key / Secret（サーバー専用）
- `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET`: `@CosFindApp` 所有者のRead and Write権限付きAccess Token / Secret（サーバー専用）

管理画面から新規お知らせを公開すると、設定済みのX APIを通じて `@CosFindApp` にタイトル・本文抜粋・お知らせURLを同時投稿します。既存お知らせの編集では重複投稿しません。Xの4変数はCloudflareのRuntime Secretsとして設定し、`NEXT_PUBLIC_`を付けたりGitへコミットしたりしないでください。

## SupabaseとDBマイグレーション

Supabaseでプロジェクトを作成後、`supabase link --project-ref <ref>`、`supabase db push` の順に実行し、`supabase/migrations` 内の全マイグレーションを適用します。新規登録はサーバー側でメールアドレスを確認済みにしてアカウントを作成し、そのままログイン状態にします。メールアドレスはログインとパスワード再設定に使用します。

パスワード再設定メールを利用するには、Supabase Dashboardの Authentication → URL Configuration で、本番URLの `/reset-password`（例: `https://<公開ドメイン>/reset-password`）とローカル確認用の `http://localhost:3000/reset-password` をRedirect URLsへ追加してください。画面上では、入力されたメールアドレスの登録有無を表示しません。

RLSは公開カタログ参照、自分の投稿・申請の作成、投稿停止ユーザーの拒否を定義します。公開集約Viewに `user_id` は含まれません。

## 起動モード

- モック: Supabaseの3環境変数を空欄にすると、ダミー情報でUIを確認できます。モックモードでは認証・投稿・管理機能は無効です。
- 本番DB: Supabaseの3環境変数をすべて設定すると、自動的にSupabaseモードになります。1つでも欠ける場合は認証を拒否します。

最初の管理者は、一般ユーザー登録を済ませてからローカル端末で次を実行します。固定の管理者パスワードや管理者Cookieは使用しません。

```bash
npm run admin:promote -- 登録済みユーザー名
```

OSM標準タイルは開発確認用です。本番では利用量に合うタイル事業者を設定してください。未確定の運用判断は [TODO.md](./TODO.md) に記録しています。

## Android（PWA）

Android版はWeb版と同じコード・Supabaseを使用するPWAです。公開先をHTTPSで開くと、対応するAndroid版Chromeでインストール案内が表示されます。案内を閉じた場合も、ハンバーガーメニューまたはChromeのメニューから「アプリをインストール」を選択できます。

- `public/manifest.webmanifest`: standalone表示、テーマ色、ショートカットを定義
- `public/icons/icon-192.png` / `icon-512.png`: Androidホーム画面用アイコン
- `public/icons/icon-maskable-512.png`: Androidのマスカブルアイコン
- `public/sw.js`: 更新時に古いCosFind用キャッシュだけを整理。商品・店舗・在庫情報はキャッシュせず、常に最新データを取得

PC上の `127.0.0.1` はPC自身からのみ利用できます。Android実機へのインストール確認には、HTTPSで公開したURLをAndroid端末から開いてください。

## Google Play / App Store向けアプリ

Capacitor版は [`mobile`](./mobile) にあります。Web/PWA版は変更せず、モバイル版は同じSupabase・RLS・店舗分類定義を利用します。Android Studio用プロジェクトは`mobile/android`、Xcode用プロジェクトは`mobile/ios`です。詳細なビルド・署名手順は [`mobile/README.md`](./mobile/README.md) を参照してください。

## Cloudflare Workers

Web版はOpenNextアダプターを利用してCloudflare Workersへデプロイします。CloudflareのGit連携では、ルートディレクトリを`/`、Build commandを`npm run build:worker`、Deploy commandを`npx wrangler deploy`に設定してください。

CloudflareのBuild variables and secretsとRuntime variables and secretsの両方へ、`.env.example`に記載したSupabase・MapLibre用環境変数を設定します。`SUPABASE_SECRET_KEY`は必ずSecretとして登録し、Gitへコミットしないでください。

ローカルでWorker向けビルドを確認する場合は次を実行します。

```bash
npm run build:worker
```
