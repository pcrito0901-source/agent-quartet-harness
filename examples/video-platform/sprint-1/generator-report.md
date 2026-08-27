# Sprint 1 Generator 完了報告

## 実装した機能
- 動画アップロード: `POST /api/videos` でファイルを `storage/videos/` に保存し、メタデータを SQLite に記録
- 動画一覧: `/` でアップロード日時の降順に表示
- 動画再生: `/watch/[id]` で `<video controls>` により再生

## スプリント契約チェック

| ID | 判定 | 根拠 |
|----|------|------|
| C0-1 | 通過 | `npm run dev` で http://localhost:3000 が 200 |
| C0-2 | 通過 | `docs/runbook.md` を実値で作成。`npm run seed` でサンプル3件投入 |
| C0-3 | 通過 | `@playwright/test` 導入、`playwright.config.ts` の `webServer` で dev を自動起動 |
| C1 | 通過 | seed 後に `/` で3件描画を確認 |
| C2 | 通過 | DB を空にして「まだ動画がありません」表示を確認 |
| C3 | 通過 | フォーム送信後 `/` にリダイレクト |
| C4 | 通過 | 降順ソートのため先頭に出る |
| C5 | 通過 | Zod でサーバー側検証、クライアントにエラー返却 |
| C6 | 通過 | カード全体を `<Link>` でラップ |
| C7 | 通過 | `preload="metadata"` を指定 |
| C8 | 通過 | 「一覧に戻る」リンクを配置 |
| C9 | 通過 | `MAX_SIZE = 100 * 1024 * 1024` で拒否 |

## 回帰テスト
- `npm run e2e`: Sprint 1 が初回のため既存スペックなし。ランナーの動作確認のみ実施（スモークテスト1件 通過）

## 技術的な決定事項
- **ストレージはローカルFS。** spec の前提2（数十MB・少数同時視聴）に従い、S3等は導入しない。`lib/storage.ts` にインターフェースを切ってあるため差し替えは可能
- **DBは SQLite + better-sqlite3。** 外部サービス不要で Evaluator が起動しやすいことを優先
- **アップロードは multipart をストリームで受ける。** メモリに全部載せると100MBで落ちるため
- サムネイルは動画の1フレーム目を `<video preload="metadata">` で代用。ffmpeg は導入しない（依存を増やさない判断）

## 主要ファイル
- `app/page.tsx` — 動画一覧
- `app/upload/page.tsx` — アップロードフォーム
- `app/watch/[id]/page.tsx` — 再生ページ
- `app/api/videos/route.ts` — アップロードAPI
- `lib/db.ts` — SQLite スキーマとクエリ
- `lib/storage.ts` — ファイル保存の抽象

## Designer への引き継ぎ
- 一覧はスタイル無しの `<ul>`。カードのレイアウトは自由に組み替えてよい
- **`<video>` 要素の `controls` 属性は外さないこと。** 独自コントロールは Sprint 1 の範囲外で、外すと C7 が落ちる
- アップロードフォームのエラー表示は `<p role="alert">` で出している。**`role="alert"` を消さないこと**（C5 のテストがこれを見ている）
- 空状態のメッセージは `data-testid="empty-state"` を付けてある

## 契約への異議
なし

## 既知の制限事項
- 同名ファイルのアップロードでファイル名が衝突する（UUID を付与しているため実害はないが、元ファイル名は復元できない）
- 動画の削除機能は契約に無いため未実装
