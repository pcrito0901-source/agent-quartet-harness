# Agent Quartet Harness

## エージェント・オーケストレーション

このハーネスは4つのサブエージェントによるパイプラインで開発を進める。

```
/plan → @agent-planner
          ↓
/sprint N → @agent-generator → @agent-designer → @agent-evaluator
                   ↑                                    │
                   └────── 不合格時のフィードバック ──────┘
                              （リトライ上限3回）
```

### 各エージェントの役割

| エージェント | 役割 | 入力 | 出力 |
|---|---|---|---|
| `@agent-planner` | 仕様策定 | ユーザーの短いプロンプト | `docs/spec.md`, `docs/sprints/sprint-N/contract.md` |
| `@agent-generator` | 機能実装 | スプリント契約 | 動作するコード + `generator-report.md` |
| `@agent-designer` | UI仕上げ | トークン + 参考画像 + Generator の報告 | スタイル適用済みコード + `designer-report.md` |
| `@agent-evaluator` | QAテスト | 契約 + 両報告 | `e2e/sprint-N.spec.ts` + `evaluation-R.md` + 合否 |

**呼び出しは `@agent-<名前>` 形式。** `@planner` では解決しない。

## 3つの設計原則

このハーネスが普通の「AIに丁寧に指示する」やり方と違う点は3つだけ。ここを崩すと機能しない。

### 1. 引き継ぎはファイルで行う

サブエージェントは**独立したコンテキスト**で起動し、親セッションの会話履歴を引き継がない。
チャットに出力された完了報告は、次のエージェントからは**見えない**。

したがって各エージェントは報告を必ずファイルに書き出し、次のエージェントにはパスを渡す:

```
docs/sprints/sprint-N/
├── contract.md            # Planner が生成（以降 読み取り専用）
├── generator-report.md    # Generator が書き出す
├── designer-report.md     # Designer が書き出す
├── evaluation-1.md        # Evaluator ラウンド1
└── evaluation-2.md        # Evaluator ラウンド2（差し戻し後）
```

オーケストレーターは各フェーズ後に**報告ファイルの実在を確認する**。

### 2. 役割境界はフックで強制する

「Evaluator は自分でコードを修正しない」を散文で書いても、LLM は状況次第で破る。
`.claude/hooks/guard.mjs` が PreToolUse で実際にブロックする:

| エージェント | 書き込める範囲 |
|---|---|
| Planner | `docs/` のみ |
| Generator | 全体。ただし `docs/spec.md` と `contract.md` は不可 |
| Designer | 全体。ただし仕様・契約は不可、かつ**新規作成はスタイル/アセット/ドキュメントのみ** |
| Evaluator | `docs/`, `e2e/`, `tests/`, `playwright.config.*` のみ |

Bash 経由の書き込み（リダイレクト・`tee`・`sed -i`）も塞いである。
ガード自体の回帰テストは `node --test .claude/hooks/guard.test.mjs`。

### 3. 契約は実行可能なテストになる

Evaluator は契約条件を目視確認するのではなく、**`e2e/sprint-N.spec.ts` に変換して実行する**。
契約条件 1件 = `test()` 1件、テスト名は契約ID（C1, C2...）で始める。

これにより:
- 再評価が数秒・決定的になる（MCP で毎回操作し直さない）
- **契約が累積する回帰スイートになる。** Sprint 5 の評価では Sprint 1..5 の全テストを実行する
- Sprint 3 の実装が Sprint 1 の機能を壊したら、その場で検出される

## スプリント実行手順

### 1. 計画フェーズ（初回のみ）

```
/plan 動画をアップロードして視聴できるサービスを作りたい
```

Planner が `docs/spec.md` と契約を生成する。**`spec.md` の「確認事項」節をユーザーに提示し、承認を取ってから次へ進む。**
Planner はサブエージェントのため `AskUserQuestion` が使えない。承認ゲートはオーケストレーター側の責務。

### 2〜4. 実装・デザイン・評価

```
/sprint 1
```

`/sprint` が Generator → Designer → Evaluator を順に回し、不合格なら差し戻し先に戻す。

### 5. フィードバックループ（不合格時）

- **機能の不具合** → `@agent-generator` に戻す
- **デザインの問題** → `@agent-designer` に戻す
- Generator に戻した場合、修正後は Designer も再実行する（実装変更でデザインが崩れうるため）
- **リトライ上限は3回。** 到達したらループを止めてユーザーに判断を仰ぐ

## ファイル構成

```
プロジェクトルート/
├── CLAUDE.md
├── .claude/
│   ├── agents/           # 4体のサブエージェント定義
│   ├── commands/         # /plan, /sprint, /harness-init
│   └── hooks/
│       ├── guard.mjs     # 役割境界の強制
│       └── guard.test.mjs
├── docs/
│   ├── spec.md                # Planner が生成
│   ├── runbook.md             # 起動方法（Sprint 1 で Generator が実値を埋める）
│   ├── rubric.md              # デザイン採点アンカー
│   ├── design-tokens.css      # トークン正本
│   ├── design-tokens.md       # トークン解説
│   ├── design-references/     # 参考画像（ユーザーが用意）
│   └── sprints/
│       ├── status.md          # 進捗状態
│       └── sprint-N/
└── e2e/                       # Evaluator が育てる回帰スイート
    └── sprint-N.spec.ts
```

## ルール

- スプリントは必ず番号順に実行する。Sprint 2 を Sprint 1 より先に実行してはならない
- Evaluator が合格を出すまで次のスプリントに進んではならない
- **オーケストレーター（親セッション）は自分で実装しない。** 「小さい修正だから自分で」はパイプラインの検証性を壊す
- 各フェーズ後に git コミットでチェックポイントを打つ（差し戻しで壊れたら `git revert` で戻す）
- セッションを再開したら、まず `docs/sprints/status.md` を読んで現在地を把握する
- 参考画像が `docs/design-references/` に無い場合、Designer フェーズ前にユーザーに用意を依頼する（無い場合はトークンのみで進めてよい）
