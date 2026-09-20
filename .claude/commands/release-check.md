---
description: 公開・TestFlight・App Store提出の前に、変更を加えずリリース準備状況を確認する
argument-hint: [バージョンまたはリリース名]
---

リリース `$1` の準備状況を確認してください。これは**読み取りと検証だけ**を行うコマンドです。ビルドのアップロード、TestFlight配布、ストア提出、公開、APIキー作成は実行しません。

## 1. 現在地を確認

- `docs/spec.md`、`docs/sprints/status.md`、`docs/runbook.md`を読む
- 全スプリントが合格か確認する
- `git status --short`で未コミット変更を確認する
- `package.json`、`app.json`、`app.config.*`、`eas.json`からWebまたはExpo/React Nativeを判別する

## 2. 自動検証

存在するコマンドだけを実行し、推測したコマンドを追加しない。

- 型チェック
- lint
- ユニットテスト
- `npm run e2e`による全スプリント回帰
- production buildまたはExpo設定検証

失敗した場合はそこで「準備未完了」とし、エラー、再現コマンド、差し戻し先を記録する。失敗を直すためのコード変更はこのコマンド内では行わない。

## 3. Expo / React Native追加確認

`docs/release-checklist.md`のネイティブ項目を確認する。Windowsから検証できない項目は合格扱いにせず、`未検証`として残す。

- 実機レイアウト
- カメラ、通知、位置情報、写真、マイク等の権限
- Appleログイン、ディープリンク、バックグラウンド動作
- アプリ内課金・サブスクリプション
- EASまたは別のmacOSビルド環境
- TestFlightでのインストールと主要導線

## 4. App Store情報

秘密情報を表示・保存せず、次の有無だけを確認する。

- Bundle ID、バージョン、ビルド番号
- アプリアイコン、起動画面、スクリーンショット
- 説明文、キーワード、サポートURL、プライバシーポリシーURL
- Privacy ManifestとApp Privacy回答
- 年齢区分、暗号化申告、審査用メモ、審査アカウント

## 5. レポート

`docs/releases/release-readiness.md`へ次を保存する。

1. 判定: `準備未完了` / `ネイティブ確認待ち` / `提出承認待ち`
2. 実行したコマンドと終了結果
3. 未検証のネイティブ項目
4. App Store情報の不足
5. ブロッカーと担当
6. 人間が次に行う1つの操作

提出可能に見えても、自動送信はせず`提出承認待ち`で止める。
