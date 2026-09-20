---
description: ハーネスの動作に必要なファイルをプロジェクトに配置し、設定を検証する
---

このプロジェクトで Agent Quartet Harness が動く状態を整えてください。

## 1. 必須ファイルの配置確認

以下が存在するか確認し、欠けていれば作成する:

| パス | 役割 | 欠けている場合 |
|------|------|----------------|
| `.claude/hooks/guard.mjs` | 役割境界の強制 | プラグイン利用時は`${CLAUDE_PLUGIN_ROOT}`から直接使う。手動コピー方式ではプロジェクトへコピーする |
| `docs/design-tokens.css` | デザイントークン（Web用正本） | Web プロジェクトならコピー |
| `docs/design-tokens.ts` | デザイントークン（RN/Expo用正本） | **React Native / Expo ならこちら**（RN に CSS 変数は無い） |
| `docs/rubric.md` | 採点アンカー | ハーネスのテンプレートをコピー |
| `docs/runbook.md` | 起動方法 | テンプレートを置く（Sprint 1 で Generator が実値を埋める） |
| `docs/sprints/status.md` | 進捗状態 | テンプレートを置く |
| `docs/design-references/` | 参考画像置き場 | 空ディレクトリを作る |

## 2. ガードのロジック検証

プラグイン方式ではプラグイン内のテストを実行する。

```bash
node --test "${CLAUDE_PLUGIN_ROOT}/.claude/hooks/*.test.mjs"
```

手動コピー方式ではプロジェクト内のテストを実行する。

```bash
node --test ".claude/hooks/*.test.mjs"
```

すべて緑になることを確認する。ロジックテストに加え、4エージェントのfrontmatter配線とPlaywright MCPのバージョン固定も検証される。

## 3. ガードの発火検証（これを省略してはならない）

**上の単体テストは「ガードのロジックが正しいこと」しか証明していない。**
フックが実際に発火するかは別問題である。ロジックが正しくても発火していなければ、
役割境界は存在しないのと同じ。「守っているつもり」が最も危険な状態である。

必ず**実際にサブエージェントを起動して**確認する:

1. Claude Codeのワークスペース信頼ダイアログを承認する。未信頼のフォルダではfrontmatterフックが読み飛ばされる。
2. **セッションを再起動する。** エージェント定義とフックはセッション開始時に読み込まれる。
   ファイルをコピーした同じセッションではエージェントは認識されない
   （`Agent type 'evaluator' not found` になる）
3. 再起動後、次を実行する:

   ```
   @agent-evaluator 動作確認です。src/dummy.ts に "hello" と書き込もうとしてみてください。ブロックされたらエラーメッセージをそのまま報告してください。
   ```

4. 期待する結果:

   ```
   [harness guard: evaluator] src/dummy.ts への書き込みは許可されていません。
   ```

5. **ファイルが作られてしまった場合、ガードは発火していない。** `claude --debug`のログで
   `skips its frontmatter hooks`またはパス解決エラーを確認する。プラグイン方式では
   `${CLAUDE_PLUGIN_ROOT}`、手動コピー方式では`${CLAUDE_PROJECT_DIR}`を使う。
   `.claude/agents/evaluator.md` の `command:` 行を一時的に差し替え、セッションを
   再起動してもう一度試す（パス依存を式から消すのが狙い）:

   ```
   command: node -e "require('fs').appendFileSync('hook-fired.log','FIRED cwd='+process.cwd()+String.fromCharCode(10))"
   ```

   | `hook-fired.log` | 判定と対処 |
   |---|---|
   | できた | フックは動いている。問題は起動コマンドのパス解決。ログの `cwd=` を見て `command:` を修正する |
   | できない | このビルドでは subagent frontmatter の `hooks:` が効いていない。役割境界はプロンプトレベルのみと割り切り、各フェーズ後に `git diff` で越境を目視確認する運用に切り替える |

6. 確認後、`src/dummy.ts` と `hook-fired.log` を削除し、`command:` を元に戻す

## 4. 前提の確認

- **Node.js が必要**（ガードスクリプトの実行に使う）。`node --version` で確認
- **Playwright MCP は設定不要**。Designer と Evaluator の frontmatter に inline 定義されており、
  エージェント起動時に検証済みの`@playwright/mcp@0.0.82`が自動的に立ち上がる

## 5. ユーザーへの案内

準備が終わったら、次のステップを案内する:

```
/plan 作りたいものを1〜4行で
```
