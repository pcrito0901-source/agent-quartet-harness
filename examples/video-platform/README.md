# 実行例: 動画プラットフォーム Sprint 1

`/plan 動画をアップロードして視聴できるサービスを作りたい` から始まり、
Sprint 1 が **1回差し戻されて2ラウンド目で合格する**までの全生成物です。

各エージェントの出力がどの粒度になるべきかの基準として使ってください。

| ファイル | 生成者 | 見どころ |
|---|---|---|
| [`spec.md`](spec.md) | Planner | 「確認事項」に推測で埋めた前提が明示されている |
| [`sprint-1/contract.md`](sprint-1/contract.md) | Planner | 契約IDと「検証方法」列。C0-1〜C0-3 の土台条件 |
| [`sprint-1/generator-report.md`](sprint-1/generator-report.md) | Generator | 契約ID単位の自己申告と回帰テスト結果 |
| [`sprint-1/designer-report.md`](sprint-1/designer-report.md) | Designer | 機能非破壊を `npm run e2e` で証明している |
| [`sprint-1/evaluation-1.md`](sprint-1/evaluation-1.md) | Evaluator | **不合格。** 差し戻し先とファイル単位の修正指示 |
| [`sprint-1/evaluation-2.md`](sprint-1/evaluation-2.md) | Evaluator | 合格。加重総合スコアの計算過程 |
| [`e2e/sprint-1.spec.ts`](e2e/sprint-1.spec.ts) | Evaluator | 契約が実行可能なテストになったもの |

> これはハーネスの出力サンプルであり、動くアプリのソースは含まれていません。
