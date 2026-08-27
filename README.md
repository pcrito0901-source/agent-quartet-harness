# Agent Quartet Harness

Claude Code のサブエージェント4体によるスプリント駆動開発ハーネス。

```
/plan → @agent-planner
          ↓
/sprint N → @agent-generator → @agent-designer → @agent-evaluator
                   ↑                                    │
                   └────── 不合格時のフィードバック ──────┘
                              （リトライ上限3回）
```

## 4つのエージェント

| エージェント | 役割 | 書き込める範囲（フックで強制） |
|---|---|---|
| **@agent-planner** | 短いプロンプトから仕様書とスプリント契約を生成 | `docs/` のみ |
| **@agent-generator** | 契約に基づいてコードを実装 | 仕様・契約以外の全体 |
| **@agent-designer** | トークンと参考画像でUIを仕上げ | 全体（新規作成はスタイル/アセットのみ） |
| **@agent-evaluator** | 契約をE2Eテストに変換して実行・合否判定 | `docs/`, `e2e/`, `tests/` のみ |

## このハーネスの3つの仕掛け

普通の「AIに丁寧に指示する」やり方との違いはこの3点です。

### 1. 引き継ぎをファイルで行う

サブエージェントは独立したコンテキストで起動するため、**チャットに出力された完了報告は次のエージェントから見えません。**
各エージェントは報告を `docs/sprints/sprint-N/*.md` に書き出し、次のエージェントにはパスを渡します。

### 2. 役割境界をフックで強制する

「Evaluator は自分でコードを修正しない」を散文で書いても、LLM は状況次第で破ります。
`.claude/hooks/guard.mjs` が PreToolUse で実際にブロックします。Bash 経由の書き込み（リダイレクト・`tee`・`sed -i`）も塞いであります。

**フックの登録は各エージェントの frontmatter で完結しています。`.claude/settings.json` は不要です。**
`hooks:` はサブエージェント専用にスコープされる正式なフィールドで、これによって役割ごとに
異なる制限をかけています。settings.json に登録するとセッション全体に適用され、
役割ごとの境界という設計が壊れるため、**追加しないでください**。

ガードの起動は **fail-closed** です。スクリプトが見つからない等で起動に失敗した場合、
黙って素通りするのではなく**ブロック側に倒れます**（`|| exit 2`）。設定ミスが即座に露見します。

導入直後は `/harness-init` の「ガードの発火検証」を必ず実行してください。
**単体テストが緑でも、フックが発火していなければ役割境界は存在しません。**

ガード自体にも回帰テストがあります:

```bash
node --test .claude/hooks/guard.test.mjs
```

### 3. 契約が実行可能なテストになる

Evaluator は契約条件を目視確認するのではなく、`e2e/sprint-N.spec.ts` に変換して実行します。
**契約条件 1件 = `test()` 1件。**

- 再評価が数秒・決定的になる（ブラウザ操作を毎回やり直さない）
- 契約が累積する回帰スイートになる
- Sprint 3 の実装が Sprint 1 の機能を壊したら、その場で検出される

## セットアップ

### 方法A: プラグインとして入れる（推奨）

```bash
claude
```

Claude Code のセッション内で:

```
/plugin marketplace add Shin-sibainu/agent-quartet-harness
```

```
/plugin install agent-quartet-harness@agent-quartet
```

インストール後、プロジェクトで一度だけ:

```
/harness-init
```

### 方法B: ファイルをコピーする

```bash
git clone https://github.com/Shin-sibainu/agent-quartet-harness.git
```

```bash
cp -r agent-quartet-harness/.claude your-project/
```

```bash
cp -r agent-quartet-harness/docs your-project/
```

既に `CLAUDE.md` がある場合は**上書きせず、内容を追記**してください。

配置後、ガードが動くことを確認します:

```bash
node --test .claude/hooks/guard.test.mjs
```

## 使い方

### 1. 計画

```
/plan 動画をアップロードして視聴できるサービスを作りたい
```

Planner が `docs/spec.md` と `docs/sprints/sprint-N/contract.md` を生成します。
**`spec.md` の「確認事項」節（Planner が推測で埋めた前提）を確認してから次に進んでください。**

### 2. スプリントを回す

```
/sprint 1
```

実装 → デザイン → 評価が自動で流れます。不合格なら差し戻し先のエージェントに戻り、
合格するまでループします（上限3回）。

### 3. デザインを手直しする（任意）

```
/polish 1 カードの余白をもっと広く
```

Evaluator の合格はルーブリックによる判定であって、あなたの好みではありません。
実物を見て直したい箇所があれば `/polish` で Designer に反映させます。
非破壊確認は `npm run e2e` だけで済むため、数秒で回ります。

値の話（余白・色・サイズ）は `design-tokens.css` に、判断の話（方針・禁止事項）は
Designer の記憶（`memory: project`）に残るので、**同じ指摘を毎スプリント繰り返さずに済みます**。

### 手動で呼ぶ場合

```
@agent-generator Sprint 1 を実装して。契約は docs/sprints/sprint-1/contract.md
```

> **`@planner` ではなく `@agent-planner`** です。`@agent-` 接頭辞が無いとサブエージェントとして解決されません。

## 事前準備

### 必須

- [Claude Code](https://code.claude.com/docs)
- **Node.js**（ガードスクリプトの実行に使用）

**Playwright MCP の設定は不要です。** Designer と Evaluator の frontmatter に inline 定義されており、
エージェント起動時に自動で立ち上がります。

### 任意（デザイン品質に効く）

- デザイントークンを自分のプロダクトの色・フォントに差し替える
  - **Web プロジェクト** → `docs/design-tokens.css`（CSS変数）
  - **React Native / Expo** → `docs/design-tokens.ts`（RN に CSS 変数は無い。`.css` を使うと Expo Web でだけ効いて**実機で崩れる**）
- `docs/design-references/` に参考画像を置く（トーンの方向づけに使われます）

## ファイル構成

```
your-project/
├── CLAUDE.md                      # オーケストレーションルール
├── .claude/
│   ├── agents/                    # 4体のサブエージェント定義
│   │   ├── planner.md
│   │   ├── generator.md
│   │   ├── designer.md
│   │   └── evaluator.md
│   ├── commands/
│   │   ├── plan.md                # /plan
│   │   ├── sprint.md              # /sprint N
│   │   ├── polish.md              # /polish N
│   │   └── harness-init.md        # /harness-init
│   └── hooks/
│       ├── guard.mjs              # 役割境界の強制
│       └── guard.test.mjs         # ガードの回帰テスト
├── docs/
│   ├── spec.md                    # Planner が生成
│   ├── runbook.md                 # 起動方法（Sprint 1 で Generator が実値を埋める）
│   ├── rubric.md                  # デザイン採点アンカー
│   ├── design-tokens.css          # トークン正本
│   ├── design-tokens.md           # トークン解説
│   ├── design-references/         # 参考画像（ユーザーが用意）
│   └── sprints/
│       ├── status.md              # 進捗状態
│       └── sprint-1/
│           ├── contract.md        # 契約（Planner。以降 読み取り専用）
│           ├── generator-report.md
│           ├── designer-report.md
│           └── evaluation-1.md
└── e2e/                           # Evaluator が育てる回帰スイート
    └── sprint-1.spec.ts
```

## 実行例

[`examples/video-platform/`](examples/video-platform/) に、動画プラットフォームの Sprint 1 を
1回差し戻して合格するまでの**全生成物**（仕様書・契約・各報告・評価レポート2ラウンド・E2Eスペック）
を置いてあります。各エージェントの出力がどういう粒度になるかの参考にしてください。

## ライセンス

MIT
