# Runbook

> **Sprint 1 の Generator がこのファイルを実際の値で埋めます。**
> Designer と Evaluator がアプリを起動するための唯一の情報源です。
> ここが不正確だと、Evaluator は Phase 0 で不合格を出してパイプラインが止まります。

## 起動

### Web プロジェクトの場合

| 項目 | 値 |
|------|-----|
| 依存関係のインストール | `npm install` |
| 開発サーバー起動 | `npm run dev` |
| ベースURL | `http://localhost:3000` |
| 起動確認 | `curl -sf http://localhost:3000 > /dev/null && echo OK` |
| ビルド | `npm run build` |

### React Native / Expo の場合

**評価対象は Expo Web ビルド。** iOS シミュレータは macOS 専用のため、Windows 環境では
ネイティブの自動E2Eができない。Playwright は `expo start --web` が出力する DOM を操作する。

| 項目 | 値 |
|------|-----|
| 依存関係のインストール | `npm install` |
| 開発サーバー起動（評価用） | `npx expo start --web` |
| ベースURL | `http://localhost:8081`（実際のポートは起動ログを見て書き換える） |
| 実機確認（手動） | `npx expo start` → Expo Go でQRを読む |
| 型チェック | `npx tsc --noEmit` |

`playwright.config.ts` の `webServer.command` に `npx expo start --web` を設定し、
`url` をベースURLに合わせる。Metro の初回起動は時間がかかるため `timeout` は
120000 以上にしておくこと。

## テスト

| 項目 | 値 |
|------|-----|
| E2E（回帰スイート全件） | `npm run e2e` |
| E2E（単一スプリント） | `npx playwright test e2e/sprint-1.spec.ts` |
| ユニットテスト | `npm test` |

`playwright.config.ts` の `webServer` に開発サーバーの起動コマンドを設定してあるため、
`npm run e2e` はサーバーを自動で立ち上げます。

## テストデータ

| 項目 | 値 |
|------|-----|
| 初期データ投入 | `npm run seed` |
| データリセット | `npm run db:reset` |
| テストアカウント | `test@example.com` / `password123` |

## 環境変数

`.env.example` をコピーして `.env.local` を作成してください。

| 変数 | 用途 | 必須 |
|------|------|------|
| `DATABASE_URL` | 接続先 | はい |

## 既知のハマりどころ

- （ポート衝突、初回ビルドの所要時間、要外部サービスなど、実際に踏んだものを Generator が追記する）
