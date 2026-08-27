---
description: ハーネスの動作に必要なファイルをプロジェクトに配置し、設定を検証する
---

このプロジェクトで Agent Quartet Harness が動く状態を整えてください。

## 1. 必須ファイルの配置確認

以下が存在するか確認し、欠けていれば作成する:

| パス | 役割 | 欠けている場合 |
|------|------|----------------|
| `.claude/hooks/guard.mjs` | 役割境界の強制 | **必須。** プラグイン経由なら `${CLAUDE_PLUGIN_ROOT}/.claude/hooks/guard.mjs` からコピーする |
| `docs/design-tokens.css` | デザイントークン（正本） | ハーネスのテンプレートをコピー |
| `docs/rubric.md` | 採点アンカー | ハーネスのテンプレートをコピー |
| `docs/runbook.md` | 起動方法 | テンプレートを置く（Sprint 1 で Generator が実値を埋める） |
| `docs/sprints/status.md` | 進捗状態 | テンプレートを置く |
| `docs/design-references/` | 参考画像置き場 | 空ディレクトリを作る |

## 2. ガードの動作確認

`guard.mjs` が実際にブロックできることをテストで確認する:

```bash
node --test .claude/hooks/guard.test.mjs
```

全件緑にならない場合、役割境界は**強制されていない**。その状態でパイプラインを回すと、
Evaluator が自分でコードを直したり Generator が契約を書き換えたりしても誰も気づかない。
必ず直してから先に進むこと。

## 3. 前提の確認

- **Node.js が必要**（ガードスクリプトの実行に使う）。`node --version` で確認
- **Playwright MCP は設定不要**。Designer と Evaluator の frontmatter に inline 定義されており、
  エージェント起動時に `npx -y @playwright/mcp@latest` で自動的に立ち上がる

## 4. ユーザーへの案内

準備が終わったら、次のステップを案内する:

```
/plan 作りたいものを1〜4行で
```
