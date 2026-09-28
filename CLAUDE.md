# Agent Quartet Harness

## エージェント・オーケストレーション

このハーネスは4つのサブエージェントによるパイプラインで開発を進める。

```
/plan → @agent-planner
          ↓
/sprint N を3回 → @agent-generator → @agent-designer → @agent-evaluator
（1回の /sprint で1フェーズだけ実行して停止。間に割り込める）
                   ↑                                    │
                   └────── 不合格時のフィードバック ──────┘
                              （リトライ上限3回）
                                                        ↓ 合格
                                          /polish → @agent-designer
                                          （ユーザーの手直し。任意）
                                                        ↓
                                          /release-check（提出前確認）
                                          /handoff-codex（業務・発信用引継ぎ）
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

### 2. 役割境界を決めておく

各エージェントが触ってよい範囲を決めてある。

| エージェント | 書き込んでよい範囲 |
|---|---|
| Planner | `docs/` のみ |
| Generator | 全体。ただし `docs/spec.md` と `contract.md` は不可 |
| Designer | 全体。ただし仕様・契約は不可、かつ**新規作成はスタイル/アセット/ドキュメントのみ** |
| Evaluator | `docs/`, `e2e/`, `tests/` のみ |

**v2.4.0でsubagent frontmatterのPreToolUseガードを再有効化した。**
プラグイン内のスクリプトは`${CLAUDE_PLUGIN_ROOT}`から解決する。未信頼のワークスペースでは
Claude Codeがfrontmatterフックを読み飛ばすため、導入時に`/harness-init`の発火確認を必ず通す。
ガードは完全なサンドボックスではないため、**オーケストレーターは各フェーズ後の`git diff`も確認する。**
Evaluator のコミットにプロダクトコードの変更が混ざっていたら、それは越境である。

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

**`/sprint` は1回につき1フェーズだけ実行して停止します。** 実装 → デザイン → 評価と進めるには
3回実行します。各フェーズの結果を見てから次に進めるので、途中で割り込んで別の指示を出せます。

不合格なら、次の `/sprint` 実行時に差し戻し先のエージェントへ自動的に戻ります。

### 5. デザインの手直し（任意）

```
/polish 1 カードの余白をもっと広く
```

Evaluator の合格はルーブリックによる判定であって、**ユーザーの好みではない**。
実物を見て直したい箇所があれば `/polish` で Designer に反映させる。
契約が実行可能なテストになっているため、非破壊確認は `npm run e2e` だけで済み、
Evaluator を丸ごと回す必要はない。

値の話（余白・色・サイズ）はトークンに、判断の話（方針・禁止事項）は Designer の記憶に残す。
そうしないと、次のスプリントで同じ指摘を繰り返すことになる。

### 6. フィードバックループ（不合格時）

- **機能の不具合** → `@agent-generator` に戻す
- **デザインの問題** → `@agent-designer` に戻す
- Generator に戻した場合、修正後は Designer も再実行する（実装変更でデザインが崩れうるため）
- **リトライ上限は3回。** 到達したらループを止めてユーザーに判断を仰ぐ

### 7. リリースと外部引き継ぎ

- `/release-check [バージョン]`は読み取りと検証だけを行い、`docs/releases/release-readiness.md`へ結果を保存する
- ビルドのアップロード、TestFlight配布、審査提出、公開は実行直前に人間の明示承認を得る
- `/handoff-codex N`は`docs/handoffs/sprint-N-codex.md`を作り、Codexやcc-companyへ渡す
- 引き継ぎ文書には秘密、トークン、`.env`、テスト用パスワードを含めない

## ファイル構成

```
プロジェクトルート/
├── CLAUDE.md
├── .claude/
│   ├── agents/           # 4体のサブエージェント定義
│   ├── commands/         # /plan, /sprint, /polish, /release-check, /handoff-codex, /harness-init
│   └── hooks/
│       ├── guard.mjs     # 役割境界の強制
│       └── guard.test.mjs
├── docs/
│   ├── spec.md                # Planner が生成
│   ├── runbook.md             # 起動方法（Sprint 1 で Generator が実値を埋める）
│   ├── release-checklist.md    # ネイティブ・App Store提出前の確認
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

- **React Native / Expo の場合、評価対象は `expo start --web` の Expo Web ビルド。** iOS シミュレータは macOS 専用のため Windows ではネイティブの自動E2Eができない。ネイティブ限定機能（プッシュ通知・カメラ・課金など）は自動契約に含めず、契約の「手動検証項目」節に分離する
- Expo Webの合格をiOS実機の合格として扱わない。公開前に`/release-check`を実行し、配布用ビルドと実機またはTestFlightで手動確認する
- **React Native / Expo では `docs/design-tokens.ts` を使う。** `.css` は Expo Web でだけ効いて実機で崩れる
- **テストを重くしすぎない。** 契約の約束を測るテスト（押すと増える・残る・床以上）を厚くし、実装の細部を縛るテスト
  （px の等号・ソースの行番号・長い文言の完全一致）は契約が名指したときだけにする（`evaluator.md` の「テストを重くしすぎない」）。
  画面の入口を消す／移す回は、付け替えの見込みを契約の R 表で先に数える。生成物（スクリプトの出力）の作り直しは
  Generator と Designer の完了条件。フル回帰をいつ回すかはオーケストレーターが決める
  （実運用では約900本・1周1時間超に育ち、付け替えが実装より長くかかる回が出た）
- **スプリントは縦切りにする。** 各スプリントは UI からデータ永続化まで貫通した、単体で価値のある機能とする。「Sprint 1: モック画面 / Sprint 2: バックエンド」のようなレイヤー単位の分割は禁止（E2E テストが資産にならず、回帰検出が機能しなくなる）
- スプリントは必ず番号順に実行する。Sprint 2 を Sprint 1 より先に実行してはならない
- Evaluator が合格を出すまで次のスプリントに進んではならない
- **オーケストレーター（親セッション）は自分で実装しない。** 「小さい修正だから自分で」はパイプラインの検証性を壊す
- 各フェーズ後に git コミットでチェックポイントを打つ（差し戻しで壊れたら `git revert` で戻す）
- セッションを再開したら、まず `docs/sprints/status.md` を読んで現在地を把握する
- 参考画像が `docs/design-references/` に無い場合、Designer フェーズ前にユーザーに用意を依頼する（無い場合はトークンのみで進めてよい）
- **見た目を「詰める／削る／1画面に収める」直しは、実装の前に Designer が案を2〜3枚撮り、ユーザーに選ばせる**（`/sprint` の Phase A0 ・ `/polish` も同じ）。
  言葉どおりに詰めると実機で「窮屈」と言われ、戻す往復が起きる（実運用で同じ画面に2スプリント分かかった）。量は選ばれた案で決まり、契約は床（字の大きさ・押せる箱）だけを決める
