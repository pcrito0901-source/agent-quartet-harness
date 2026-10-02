# 付録: Web

ブラウザで動くアプリ（例: Next.js ・ Vite ・ Remix ・ Rails ・ Django）。
**土台は Web をそのまま前提にできるので、この付録は薄い。** 土台が Web でも追加の決まり無しで回ることを示すための最小の付録である。

## 1. 見分け方

- `package.json` に Web のフレームワーク（`next` ・ `vite` ・ `@remix-run/*` など）がある、またはサーバーが HTML を返す
- ネイティブのアプリの設定（`app.json` の `expo` など）が無い

## 2. 評価の面

- **本番と同じ面（ブラウザ）を、回帰の E2E がそのまま操作する。** 自動の面と本番の面がほぼ一致するので、手動検証は少ない
- 既定の道具は Playwright。`playwright.config.ts` の `webServer` に開発サーバーの起動コマンドを置き、`testDir` を `e2e/` にする
- 幅は 375 ／ 768 ／ 1280 px の3つを測る（`docs/rubric.md`）
- 本番の束（`npm run build` の出力）と開発サーバーで挙動が違うことがある（キャッシュ ・ 最適化 ・ 環境変数）。
  提出の前の総点検では、本番の束を起こしてから E2E を1回回す

## 3. 手動検証に回すもの

- 本物の決済（テストモードでない支払い）
- メールや SMS の到達
- 本物の外部ログイン（OAuth の同意画面 ・ 本番のクライアント ID）
- 実機のブラウザでの見た目（iOS の Safari など。自動の面は Chromium であることが多い）

## 4. デザイントークン

- 正本は `docs/design-tokens.css`。CSS 変数として import し、`var(--color-primary)` で参照する。hex を書き写さない
- Web 前提のデザインのスキル（例: `ui-ux-pro-max` の `ui-styling` ・ `design-system`）もそのまま使える

## 5. サーバーの公開の入口

- 入口の例: API のルート（`app/api/**` ・ `pages/api/**`）・ サーバーアクション ・ GraphQL の resolver ・ webhook
- 一覧の作り方: ルートのファイルを列挙し、各ファイルで認証を確かめる行（セッションの取得 ・ 持ち主の照合）があるかを見る
- **クライアントに渡る環境変数に秘密を置かない**（例: `NEXT_PUBLIC_*` ・ `VITE_*` は束に埋め込まれる）
- 定期処理（cron）は、外から叩けないか、秘密のヘッダーを確かめる入口から呼ぶ

## 6. 配備

- プレビューの配備（プルリクエストごと）は自由。**本番への配備は毎回ユーザーの承認**
- 配備のコマンドと、配備したコミットを `docs/sprints/status.md` に記録する

## 7. 罠

- 開発サーバーでは緑、本番の束では赤（環境変数の読み込みの時機 ・ 静的化）。総点検で本番の束を1回測る
- 秘密を公開の環境変数に置き、束から読めた

## 8. スキルの例

| 場面 | 役 | 例 |
|---|---|---|
| UI の仕上げ | Designer | `ui-ux-pro-max`（本体と `ui-styling`） |
| 提出 ・ 公開の前の点検 | オーケストレーター（`/release-check`） | `security-review`（読むだけ） |

## 9. 土台への差し込み

`docs/runbook.md` の「起動」表に:

| 項目 | 値 |
|---|---|
| 評価の面 | ブラウザ（本番と同じ面） |
| 開発サーバー起動 | `npm run dev` |
| ベースURL | `http://localhost:3000` |
| 起動確認（PowerShell） | `(Invoke-WebRequest http://localhost:3000 -UseBasicParsing).StatusCode` |
| 起動確認（bash） | `curl -sf http://localhost:3000 >/dev/null` |
| ビルド | `npm run build` |
