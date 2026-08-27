# Sprint 1 Designer 完了報告

## 適用したデザイントークン
- カラー: 背景 `--color-bg` / カード面 `--color-bg-elevated` / 境界 `--color-border`、CTA に `--color-accent`
- タイポグラフィ: 見出し `--text-3xl` + `--font-semibold` + `--tracking-tight`、本文 `--text-base`、メタ情報 `--text-sm` + `--color-text-secondary`
- スペーシング: カード内 `--space-4`、セクション間 `--space-12`、グリッド gap `--space-6`

## トークンの拡張
- なし（既存トークンで足りた）

## 参考画像からの反映
- `docs/design-references/editorial-grid.png` — 全カード同幅の均等グリッドを避け、**先頭の1件だけ2カラム幅**にする編集的なレイアウトを採用
- `docs/design-references/dark-player.png` — 再生ページのみ暗い面（`--color-bg` を反転）にし、動画に視線が集まるようにした

## 変更したファイル
- `app/globals.css` — `docs/design-tokens.css` を import。ベースのタイポ設定
- `app/page.tsx` — 一覧を CSS Grid 化。先頭カードを `grid-column: span 2`
- `app/upload/page.tsx` — フォームのラベル・入力・エラーの余白を整理
- `app/watch/[id]/page.tsx` — プレイヤー周りを暗色面に
- `app/components/VideoCard.module.css` — 新規（カードのスタイル）

## レスポンシブ確認

| 幅 | 結果 |
|----|------|
| 375px | 確認済み（1カラム。先頭カードの span を解除） |
| 768px | 確認済み（2カラム） |
| 1280px | 確認済み（3カラム、先頭のみ2カラム幅） |

## 機能非破壊の証明
- `npm run e2e`: 該当スペック未生成のため、Generator のスモークテスト1件のみ通過
- `<video controls>` と `role="alert"`、`data-testid="empty-state"` は維持
- コンソールエラー: なし

## 既知の制限事項
- 375px でアップロードフォームのファイル選択ボタンがブラウザ既定の見た目のまま（ネイティブ要素のため深追いしなかった）
