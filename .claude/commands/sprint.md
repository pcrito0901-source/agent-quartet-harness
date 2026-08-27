---
description: 指定スプリントを 実装 → デザイン → 評価 の順に回し、合格するまでループする
argument-hint: <スプリント番号>
---

Sprint $1 をパイプラインで完走させてください。あなたはオーケストレーターです。**自分でコードを書いてはいけません。** 各フェーズを担当エージェントに委譲し、状態を管理することがあなたの仕事です。

## 事前チェック

0. **ガードが生きているか確認する。** `.claude/hooks/guard.mjs` が存在しなければ、役割境界は一切強制されていない状態でパイプラインが回る（フックの実行に失敗しても Claude Code はツール呼び出しを通してしまうため、壊れたガードは静かに無効になる）。存在しない場合は `/harness-init` を実行するよう案内して中断する
1. `docs/sprints/status.md` を読む
2. **Sprint $1 より前のスプリントがすべて `合格` になっているか確認する**。なっていなければ中断し、ユーザーに報告する（番号順の実行はこのハーネスの前提）
3. `docs/sprints/sprint-$1/contract.md` が存在するか確認する。無ければ `/plan` が先だと案内して中断する

## パイプライン

### Phase A: 実装

`@agent-generator` に Sprint $1 の実装を依頼する。プロンプトには必ず以下を含める:

- 契約ファイルのパス: `docs/sprints/sprint-$1/contract.md`
- 完了報告の書き出し先: `docs/sprints/sprint-$1/generator-report.md`
- 差し戻しの場合は、前ラウンドの評価レポートのパス

完了後、`docs/sprints/sprint-$1/generator-report.md` が**実在するか確認する**。無ければ書き出しを再依頼する（ファイルが無いと次のエージェントが読めない）。

status.md を `実装済み` に更新し、`git add -A && git commit -m "sprint-$1: generator"` でチェックポイントを打つ。

### Phase B: デザイン

`@agent-designer` に Sprint $1 のデザインを依頼する。プロンプトには以下を含める:

- `docs/sprints/sprint-$1/generator-report.md` を読むこと
- 完了報告の書き出し先: `docs/sprints/sprint-$1/designer-report.md`

完了後、報告ファイルの実在を確認し、status.md を `デザイン済み` に更新、`git commit -m "sprint-$1: designer"`。

### Phase C: 評価

`@agent-evaluator` に Sprint $1 の評価を依頼する。プロンプトには以下を含める:

- 契約: `docs/sprints/sprint-$1/contract.md`
- 両エージェントの報告ファイルのパス
- 評価レポートの書き出し先: `docs/sprints/sprint-$1/evaluation-{ラウンド番号}.md`
- 回帰テストは Sprint 1..$1 の全件を実行すること

status.md を `評価中` に更新する。

### Phase D: 判定

評価レポートを読んで分岐する:

**合格の場合**
1. status.md の Sprint $1 を `合格` に更新
2. `git commit -m "sprint-$1: passed"`
3. ユーザーに要約を報告し、`/sprint` に次の番号を渡すよう案内して終了

**不合格の場合**
1. status.md のリトライ回数を +1
2. リトライ回数を確認する:
   - **3 未満** → 評価レポートの「差し戻し先」に従って Phase A（Generator）または Phase B（Designer）に戻る。差し戻し先のエージェントには**評価レポートのパスを渡す**
   - **3 に達した** → **ループを止める**。`AskUserQuestion` でユーザーに選択させる:
     - 契約を見直す（`/plan` からやり直し）
     - 該当条件をこのスプリントの対象から外す
     - もう3ラウンド試す
3. Generator に戻した場合、修正後は Designer も再実行する（実装変更でデザインが崩れている可能性があるため）

## 絶対のルール

- **リトライ上限は3。** 無視して回し続けない。同じ失敗を3回繰り返すのは、多くの場合エージェントではなく契約の問題
- **オーケストレーターは実装しない。** 「小さい修正だから自分で」は禁止。パイプラインの検証性が失われる
- **各フェーズでコミットする。** 差し戻しで状態が壊れたとき `git revert` で戻せることが安全弁になる
- **報告ファイルの実在を毎回確認する。** サブエージェントは独立コンテキストで動くため、チャットに出力された報告は次のエージェントには見えない
