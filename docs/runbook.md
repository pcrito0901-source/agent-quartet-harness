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
| 起動確認（PowerShell） | `(Invoke-WebRequest http://localhost:3000 -UseBasicParsing).StatusCode` |
| 起動確認（bash） | `curl -sf http://localhost:3000 >/dev/null` |
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

Expo Webの合格はiOSネイティブの合格ではない。配布前は`/release-check`を実行し、
プロジェクトで採用しているクラウドビルドまたはmacOSビルド環境のコマンドをこの表へ追記する。
EASを採用していないプロジェクトへ、EASコマンドを推測で追加しない。

| ネイティブ配布 | 値 |
|---|---|
| ビルド方式 | （EAS Build / Xcode Cloud / GitHub Actions macOS / その他） |
| 検証用ビルド | （実際のコマンド） |
| TestFlight配布 | （実際のコマンドまたは手順。自動実行には承認が必要） |
| ビルド元 | （まっさらな `git worktree` の作り方と片付け方。作業中のフォルダから出さない ・ `docs/release-checklist.md` の B1） |
| ビルドの前の一括検査 | （例: `npm run build:gate`。1段でも落ちたら出さない ・ B3） |
| アーカイブのいつもの大きさ | （例: 約 300MB。桁が違えば止めて中身を見る ・ B2） |
| 送信後のタグ | `git tag -a testflight/<n> <木> -m "sent YYYY-MM-DD"`（B6） |
| 月の枠 | （プランと上限。費用は `status.md` の「ビルドの台帳」へ ・ B7） |

### サーバー（バックエンド）がある場合

**E2E と実機が同じサーバーを見ているとは限らない。** ここに両方の向き先を書く。

| 項目 | 値 |
|---|---|
| E2E が見るサーバー | （例: ローカルの開発用デプロイメント） |
| 実機が見るサーバー | （例: クラウドのデプロイメント。本番と同じに扱う） |
| クラウドへの配備コマンド | （実際のコマンド。**毎回ユーザーの承認**） |
| 最後に配備したコミット | （配備のたびに `status.md` に記録する。ビルドの前に `git diff <このコミット>..HEAD -- <サーバーのディレクトリ>` が空かを見る） |
| ローカルのサーバーの起こし方と確かめ方 | （起動コマンド ・ ヘルスチェックの URL ・ 起動待ちの長さ ・ 対話の問いで止まるなら避け方） |

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

## スキル（役ごと）

`/harness-init` が、実際に入っているスキルだけをここに書く（役ごとに1〜2本まで・Planner は原則なし）。
プラグイン方式では、オーケストレーターがサブエージェントを起動するときにこの表のスキル名をプロンプトで渡す。

| 役 | スキル | 使わないもの・注意 |
|---|---|---|
| Generator | （例: `react-native-best-practices`） | |
| Designer | （例: `ui-ux-pro-max` の本体） | （例: RN では `ui-styling` ・ `design-system` を使わない） |
| Evaluator | （例: `react-native-best-practices`） | |
| オーケストレーター | （例: 配備先ガード ・ `asc-*` の読み取り系） | 提出の族は使わない |

## 既知のハマりどころ

- （ポート衝突、初回ビルドの所要時間、要外部サービスなど、実際に踏んだものを Generator が追記する）
