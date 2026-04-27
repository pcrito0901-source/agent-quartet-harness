# Agent Quartet Harness

Claude Code のサブエージェント4体によるスプリント駆動開発ハーネス。

```
@planner → @generator → @designer → @evaluator
                ↑                        │
                └── 不合格時のフィードバック ──┘
```

## 4つのエージェント

| エージェント | 役割 | model |
|---|---|---|
| **@planner** | 短いプロンプトから製品仕様書とスプリント計画を生成 | opus |
| **@generator** | スプリント契約に基づいてコードを実装 | opus |
| **@designer** | デザイントークンと参考画像でUIを仕上げ | opus |
| **@evaluator** | Playwright MCP で実操作テスト・合否判定 | opus |

## セットアップ

1. このリポジトリの `.claude/agents/` と `CLAUDE.md` を自分のプロジェクトにコピーする
2. デザイントークンを `/docs/design-tokens.md` に用意する
3. 参考画像を `/docs/design-references/` に配置する

```bash
# 例: 自分のプロジェクトにコピー
cp -r .claude/agents/ /path/to/your-project/.claude/agents/
cp CLAUDE.md /path/to/your-project/CLAUDE.md
```

## 使い方

### 1. 計画

```
@planner 動画プラットフォームを作りたい。ユーザーが動画をアップロードして視聴できるサービス。
```

### 2. 実装

```
@generator Sprint 1を実装して
```

### 3. デザイン

```
@designer Sprint 1のデザインを仕上げて
```

### 4. 評価

```
@evaluator Sprint 1を評価して
```

Evaluator が合格を出したら次のスプリントへ。不合格なら修正指示に従って該当エージェントに戻す。

## ファイル構成

```
your-project/
├── CLAUDE.md                      # オーケストレーションルール
├── .claude/agents/
│   ├── planner.md                 # 仕様策定エージェント
│   ├── generator.md               # 実装エージェント
│   ├── designer.md                # デザインエージェント
│   └── evaluator.md               # QAエージェント
└── docs/
    ├── spec.md                    # 製品仕様書（Planner が生成）
    ├── design-tokens.md           # デザイントークン（ユーザーが用意）
    ├── design-references/         # 参考画像（ユーザーが用意）
    └── sprints/
        ├── sprint-1.md
        ├── sprint-2.md
        └── ...
```

## 前提条件

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) が使える環境
- Playwright MCP サーバーの設定（Evaluator・Designer が使用）

## ライセンス

MIT
