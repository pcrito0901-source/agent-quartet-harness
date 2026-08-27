# Changelog

## 2.0.0

パイプラインの「約束」を散文から仕組みに移した破壊的変更。

### 修正されたバグ

- **サブエージェントの呼び出し記法が誤っていた** — `@planner` では解決しない。全ドキュメントを `@agent-planner` 形式に修正
- **Generator → Designer の引き継ぎが成立していなかった** — サブエージェントは独立コンテキストで起動するため、チャットに出力された完了報告は次のエージェントから見えない。報告をファイル（`docs/sprints/sprint-N/*-report.md`）に書き出す設計に変更
- **Planner がユーザーに確認を求める設計だった** — サブエージェントは `AskUserQuestion` を使えない。前提を `spec.md` の「確認事項」に記録し、承認ゲートはオーケストレーター側に移動
- **アプリの起動方法がどこにも定義されていなかった** — `docs/runbook.md` を追加。Sprint 1 の Generator が実値で埋める契約条件（C0-1〜C0-3）を必須化
- **Evaluator がレスポンシブを検証していなかった** — `browser_resize` をツール一覧に追加し、375/768/1280px の実測を必須化
- **「重み」列が判定に使われていなかった** — 加重総合スコア（閾値 6.0）として実際の合格条件に組み込み

### 追加された強制力

- `.claude/hooks/guard.mjs` — PreToolUse で役割境界を実際にブロックする
  - Planner: `docs/` のみ書き込み可
  - Generator / Designer: 仕様書・契約ファイルへの書き込み不可
  - Designer: 新規ファイル作成はスタイル/アセット/ドキュメントのみ
  - Evaluator: `docs/`, `e2e/`, `tests/` のみ。プロダクトコードは修正不可
  - Bash 経由の書き込み（リダイレクト・`tee`・`sed -i`）も遮断
- `.claude/hooks/guard.test.mjs` — ガード自体の回帰テスト12件（`node --test`）
- 各エージェントに `maxTurns` / `permissionMode` を設定

### 追加された検証

- **契約が実行可能なテストになった** — Evaluator が契約条件を `e2e/sprint-N.spec.ts` に変換して実行する。契約条件 1件 = `test()` 1件
- **回帰スイートが累積する** — Sprint N の評価では Sprint 1..N の全テストを実行。過去スプリントの機能が壊れたら即検出
- `docs/rubric.md` — デザイン4基準のスコアアンカー。印象採点を排除し、再現性のある採点にする

### 追加された運用

- `/plan` `/sprint` `/harness-init` スラッシュコマンド。パイプラインの手動実行が不要に
- **リトライ上限3回** — 無限ループとコスト暴走の防止。到達時はユーザーに判断を仰ぐ
- `docs/sprints/status.md` — 進捗状態の永続化。セッションを跨いで復帰できる
- 各フェーズ後の git チェックポイント。差し戻しで壊れたら `git revert` で戻せる
- Playwright MCP を各エージェントの frontmatter に inline 定義。**MCP の事前設定が不要に**

### 追加された配布・ドキュメント

- Claude Code プラグイン化（`.claude-plugin/plugin.json` + `marketplace.json`）。`/plugin install` でワンコマンド導入
- `docs/design-tokens.css` — トークンの正本を機械可読な CSS に。ダークモード・フォーカスリング・モーション低減に対応。Markdown 版は解説に降格
- `examples/video-platform/` — Sprint 1 が1回差し戻されて合格するまでの全生成物

## 1.0.0

初版。4エージェント（Planner / Generator / Designer / Evaluator）とスプリント契約の概念を定義。
