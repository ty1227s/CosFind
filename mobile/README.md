# CosFind Mobile（Capacitor）

既存のNext.js Web/PWA版を維持したまま、同じSupabaseデータベースと認証基盤を使うAndroid/iOSアプリです。端末へはViteで生成したローカルWeb資産を同梱し、本番でCapacitorの`server.url`は使用しません。

## 構成

- `src/`: Android/iOS共通のReact UI
- `src/lib/location.ts`: Web GeolocationとCapacitor Geolocationを吸収する境界
- `src/lib/barcode.ts`: 将来のJANコード読み取り用の境界
- `android/`: Android Studioで開くプロジェクト
- `ios/`: Xcodeで開くプロジェクト（ビルドにはmacOS＋Xcodeが必要）
- `dist/`: 端末へ同梱する生成物

店舗分類の色・略号は親プロジェクトの`lib/store-type-color.ts`と`lib/store-type-code.ts`をビルド時に共有します。SupabaseのSecret keyは読み込まず、Publishable keyとRLSだけを使用します。

## ビルドと同期

Node.js 22以上で実行します。

```powershell
cd C:\Users\yuuki\cosfind-runtime\mobile
C:\Users\yuuki\.local\nodejs22\npm.cmd install
C:\Users\yuuki\.local\nodejs22\npm.cmd run native:sync
```

通常は親の`C:\Users\yuuki\cosfind-runtime\.env.local`に設定済みの`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`NEXT_PUBLIC_MAP_TILE_URL`を再利用します。`SUPABASE_SECRET_KEY`はモバイルビルドへ含めません。

## Android EmulatorでPCのWeb版を使う

EmulatorからPC上の`localhost`へ接続するときは、Android専用のホスト別名`10.0.2.2`を使います。先にWeb版を3000番ポートで起動してから、次を実行してください。

```powershell
cd C:\Users\yuuki\cosfind-runtime\mobile
C:\Users\yuuki\.local\nodejs22\npm.cmd run android:sync:emulator
```

このコマンドはAndroidデバッグ用設定へ`http://10.0.2.2:3000`を同期します。公開用AABを作る前には必ず`npm run native:sync`を実行し、`server.url`を含まない通常構成へ戻してください。iOSと公開版はこのローカルURLを使用しません。

## Android Studio

Android Studioで`mobile/android`を開きます。Android SDK 36を導入し、Gradle Sync後に端末またはAPI 26以上のエミュレーターで実行してください。

## Google Play向けAAB

パッケージIDは現在`jp.cosfind.app`、versionCodeは1です。最初のPlay Console登録前に正式なIDを確定してください。一度公開したパッケージIDは変更できません。

1. Android Studioの「Generate Signed Bundle / APK」でUpload keyを作成するか、`android/keystore.properties.example`を`android/keystore.properties`へコピーして値を設定します。
2. `npm run android:aab`、またはAndroid Studioの「Build > Generate Signed Bundle / APK > Android App Bundle」を実行します。
3. AABは`android/app/build/outputs/bundle/release/`へ生成されます。

Upload keyとパスワードはリポジトリへ保存しないでください。新規Google PlayアプリではPlay App Signingを使用します。

## iOS

macOSへプロジェクトを移し、Node.js依存を導入して`npm run native:sync`を実行後、`ios/App/App.xcodeproj`をXcodeで開きます。署名チーム、Bundle Identifier、Privacy情報を確認してからArchiveします。

## バーコード読み取り

画面側は`BarcodeReader`インターフェースだけに依存します。実装時は公式`@capacitor/barcode-scanner`を追加し、AndroidのminSdkを26以上に設定し、iOSの`NSCameraUsageDescription`を追加して`src/lib/barcode.ts`を差し替えます。未使用のカメラ権限を申請しないため、現時点ではプラグインと権限を含めていません。
