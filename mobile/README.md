# CosFind Android

画面はWeb版と共通のReact部品・CSSをViteでビルドしてアプリに同梱します。Androidの画面更新には再ビルド・同期が必要です。

## セットアップ

リポジトリ直下とmobileでそれぞれnpm ciを実行してください。Node.js 22.13以上、JDK 21、Android SDK 36を使用します。親の.env.localにある公開用Supabase設定を使用します。秘密鍵はアプリへ含めません。

## 本番に接続

今回の /api/mobile/pages を含むWeb側の変更を先にCloudflareへ反映してください。その後mobileで次を実行し、Android StudioでSync・Runします。

~~~powershell
npm run android:sync
~~~

画面はアプリ内、APIはCloudflareです。PCのサーバー起動は不要です。Commit・Push・デプロイは上記コマンドでは行いません。

## 公開前の確認

リポジトリ直下でnpm run dev -- --port 3000を起動し、mobileで次を実行します。

~~~powershell
npm run android:sync:local
~~~

画面は同梱のまま、APIのみこのPCの10.0.2.2:3000へ接続します。Android StudioでSync・Runしてください。公開前には必ずnpm run android:syncで本番接続へ戻してください。旧android:sync:emulatorはWeb画面そのものをPCから読み込む別方式です。

## 共通化の範囲

- 検索、地図、メニュー、プロフィール、お気に入り、履歴、申請、管理画面はWebの部品を直接利用。
- 商品・店舗・ブランド・お知らせ・新作・地域・駅・路線の表示はcomponents/pagesを共用。
- WebのサーバーページとアプリAPIはlib/server/mobile-pagesの公開用データ取得を共用。
- 認証・保存・画像送信は既存APIを利用。CookieはネイティブHTTPで管理。
- PWAインストール案内はネイティブアプリでは非表示。

## 配布

Android Studioで署名付きAABを作成します。配布時にはversionCodeを増やし、本番APIの稼働、実機ログイン・画像送信・位置情報・戻る操作を確認してください。署名鍵はGitに含めないでください。
