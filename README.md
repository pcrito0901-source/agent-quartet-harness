# Agent Quartet Harness

Claude Code のサブエージェント4体によるスプリント駆動開発ハーネス。
**どんな種類のアプリにも使える土台**と、**技術ごとの付録**（Web ・ Expo / React Native ・ Convex）でできています。

```
/plan → @agent-planner
          ↓
/design → @agent-designer（見本モード）→ あなたが全画面の見本を承認
          ↓
/sprint N → @agent-generator → @agent-designer → @agent-evaluator
                   ↑                                    │
                   └────── 不合格時のフィードバック ──────┘
                              （リトライ上限3回）
```

**画面の形は実装の前に、見本（絵）で決め切ります。** 実運用で、見本が実装の後に届いて変わったため、
約76回のスプリントのうち約28回が「動いている画面の作り直し」になりました。見本なら1枚数分で直せます。

## 土台と付録

| 層 | 置き場所 | 中身 |
|---|---|---|
| **土台** | `CLAUDE.md` ・ `.claude/agents/` ・ `.claude/commands/` ・ `docs/` の雛形 | どの技術でも同じに使える決まり（何を守るか） |
| **付録** | [`adapters/`](adapters/README.md) | 技術ごとの「どうやって」（どの面で評価するか ・ 何が手動検証になるか ・ どう配る ・ どこに罠があるか） |

| 付録 | 使うとき |
|---|---|
| [`web`](adapters/web/README.md) | ブラウザで動くアプリ（土台がそのまま回ることを示す最小の付録） |
| [`expo-react-native`](adapters/expo-react-native/README.md) | Expo / React Native で作り、EAS でビルドして TestFlight ・ App Store に出すアプリ |
| [`convex`](adapters/convex/README.md) | サーバーが Convex のアプリ |

組み合わせて使えます（例: `expo-react-native` ＋ `convex`）。**付録の無い技術（例: Flutter ＋ Supabase ・ CLI ・ API だけのサービス）でも、土台だけで動きます。**
`/harness-init` が技術の組み合わせを聞き、使う付録を `docs/adapters/` に写して `CLAUDE.md` に配線します。

### 新しいアプリで使うときの手順

0. **作る前に、需要を確かめる**（同じ悩みを持つ人5人に話を聞く ・ 見本を見せて「使いたいか」を聞く ・ 説明のページで登録を集める など）。
   確かめたことは `/plan` に添える。実運用で、作っている途中に方向が少なくとも5回変わり、そのたびに作り直した
1. ハーネスを入れる（下の「セットアップ」）
2. `/harness-init` —— 技術の組み合わせを聞かれるので答える。使う付録が `docs/adapters/` に写り、`CLAUDE.md` の「使う付録」に載る。
   入っているスキルだけが、役と場面ごとに配線される
3. `/plan 作りたいものを1〜4行で` —— **進め方（1週間 ／ 通常）を聞かれるので選ぶ**。`docs/spec.md` の「確認事項」に答えて承認する
4. **画面のあるアプリなら `/design`** —— 全画面の見本（端の状態も含む）が作られるので、見て直してもらい、承認する
5. ストアに出す・一般に公開するなら `/release-check early`
6. `/sprint 1` を繰り返す（1回で1フェーズ）
7. 外部のテスターに配る前と、提出 ・ 公開の前に `/release-check security` と `/release-check <版>`
8. 付録の無い技術で踏んだ罠は `docs/runbook.md` の「既知のハマりどころ」に貯め、3つ以上たまったら
   [`adapters/README.md`](adapters/README.md) の見出しで付録に切り出す

## 4つのエージェント

| エージェント | 役割 | 書き込める範囲（フックで強制） |
|---|---|---|
| **@agent-planner** | 短いプロンプトから仕様書とスプリント契約を生成 | `docs/` のみ |
| **@agent-generator** | 契約に基づいてコードを実装 | 仕様・契約以外の全体 |
| **@agent-designer** | 実装の前に全画面の見本を作り、実装後はトークンと承認済みの見本でUIを仕上げ | 全体（新規作成はスタイル/アセット/ドキュメントのみ） |
| **@agent-evaluator** | 契約をE2Eテストに変換して実行・合否判定 | `docs/`, `e2e/`, `tests/` のみ |

## このハーネスの3つの仕掛け

普通の「AIに丁寧に指示する」やり方との違いはこの3点です。

### 1. 引き継ぎをファイルで行う

サブエージェントは独立したコンテキストで起動するため、**チャットに出力された完了報告は次のエージェントから見えません。**
各エージェントは報告を `docs/sprints/sprint-N/*.md` に書き出し、次のエージェントにはパスを渡します。

### 2. 役割境界を決めておく

各エージェントが触ってよい範囲を決めてあります（Planner は `docs/` のみ、
Evaluator は `docs/` と `e2e/` のみ、など）。

> **v2.4.0で役割境界ガードを再有効化しました。** Claude Code公式のsubagent frontmatterフックと
> `${CLAUDE_PLUGIN_ROOT}`を使います。ワークスペースを信頼していない場合はClaude Codeが
> フックを読み飛ばすため、導入後に`/harness-init`の発火確認を必ず実行してください。
> ガードは完全なサンドボックスではないため、各フェーズ後の`git diff`確認も残しています。

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

`/harness-init` は技術スタックを見分け、**実際に入っているスキルだけ**を役ごとに配線し（役ごとに1〜2本まで）、
効きそうなスキルと MCP を3つまで提案します。サードパーティのスキルはこのリポジトリに同梱していません。
入れる・認証する・鍵を渡すのはあなたの操作です。

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

PowerShellの場合:

```powershell
Copy-Item -Recurse -Force agent-quartet-harness\.claude your-project\
Copy-Item -Recurse -Force agent-quartet-harness\docs your-project\
```

手動コピー方式では、`.claude/agents/*.md`のフックパスを
`${CLAUDE_PLUGIN_ROOT}`から`${CLAUDE_PROJECT_DIR}`へ置き換えてください。

既に `CLAUDE.md` がある場合は**上書きせず、内容を追記**してください。

配置後、ガードが動くことを確認します:

```bash
node --test ".claude/hooks/*.test.mjs"
```

## 使い方

### 1. 計画

```
/plan 動画をアップロードして視聴できるサービスを作りたい
```

Planner が `docs/spec.md` と `docs/sprints/sprint-N/contract.md` を生成します。
**`spec.md` の「確認事項」節（Planner が推測で埋めた前提）を確認してから次に進んでください。**
`spec.md` には「画面一覧」（画面ID ・ 役割 ・ 端の状態）も入ります。

### 1.2 進め方を選ぶ（1週間 ／ 通常）

`/plan` のときに聞かれます。**最初の版を1週間で出したいなら「1週間」**を選びます。

| 日 | やること |
|---|---|
| 0日目（半日） | 需要を確かめる → `/plan` → 確認事項に答える |
| 1日目 | `/design` で全画面の見本を承認（**あなたの出番がいちばん多い日**） |
| 2〜5日目 | 1日2回ずつ、計8回のスプリント。質問は朝と夕にまとめて届きます |
| 6日目 | 実機の確認 ・ `/release-check` ・ 課金と計測が届くか |
| 7日目 | 予備日 → 審査に出す |

- 最初の版は**スプリント8回まで**、1回の自動の条件は**10件まで**。入らない機能は翌週に回します
- 時刻で動きが変わる機能は、最初から**テストの時計を固定**します（いつ走らせても同じ結果）
- 評価の前のフル回帰は省き、全件は合格の直前の1回だけ（件数を抑えるので20分に収まる見込み）
- 途中で増えた要望は「最初の版に入れて別の機能を翌週へ出す」か「翌週に回す」かを聞かれます
- **品質の床は下げません**（縦切り ・ 契約がテストになる ・ 合格の前に全件が緑 ・ 見本の承認はそのまま）

**合わなかったら戻せます。**

1. **そのプロジェクトだけ戻す**: `docs/sprints/status.md` の「進め方」を `通常` に書き換える。次の `/sprint` から元の流れになります
2. **ハーネスごと戻す**: 1週間の進め方が入る前の版にタグ `v2.8.0` が付いています。その版に戻すか、この版のマージを `git revert` で打ち消します

詳しくは [`docs/pace-one-week.md`](docs/pace-one-week.md)。

### 1.5 見本を決める（画面のあるアプリ）

```
/design
```

Designer が「画面一覧」の画面ごとに見本を作り、`docs/design-references/` と目録 `INDEX.md` に置きます。
見本には**端の状態**（空 ・ 長い文字 ・ 多い件数 ・ 失敗）も描かれます。あなたが見て、直してほしい画面があれば言い、承認します。

- **承認した見本が正本になり**、Generator は骨格を、Designer は見た目を、Evaluator は差を、それに合わせて見ます
- 承認の前に `/sprint 1` は始まりません。目録に無い画面を作る回の前にも `/design <画面ID>` が入ります
- 承認の後に見本を変えるのは「決定」です。変わる画面だけ見本を差し替えてから、作り直しの回を立てます
- 見本はスプリントではありません（コードもテストも作らない）。デザインのツールがあれば使い（例: Claude Design ・ Figma）、無ければ HTML で組んで撮ります

### 2. スプリントを回す

```
/sprint 1
```

**1回につき1フェーズだけ実行して停止します。** 実装 → デザイン → 評価と進めるには3回実行します
（見た目を詰める回は実装の前に「見た目の案」、スイートが育ったら評価の前に「フル回帰」が1回ずつ入ります）。

各フェーズの結果を見てから次に進めるので、**途中で割り込んで別の指示を出せます。**
不合格なら、次の `/sprint` 実行時に差し戻し先のエージェントへ自動的に戻ります（リトライ上限3回）。

### 3. デザインを手直しする（任意）

```
/polish 1 カードの余白をもっと広く
```

Evaluator の合格はルーブリックによる判定であって、あなたの好みではありません。
実物を見て直したい箇所があれば `/polish` で Designer に反映させます。
非破壊確認は `npm run e2e` だけで済むため、数秒で回ります。

値の話（余白・色・サイズ）は `design-tokens.css` に、判断の話（方針・禁止事項）は
Designer の記憶（`memory: project`）に残るので、**同じ指摘を毎スプリント繰り返さずに済みます**。

### 4. リリース前に確認する

```
/release-check early
```

ストアに出すアプリは、計画の承認の直後に1回。アイコンと起動画面が見本のままでないか、ソーシャルログインの設定、
公開 URL、審査用アカウント、画面写真の寸法を**最初に名指します**（提出の前夜に見つかると間に合わないもの）。

```
/release-check device 12
```

ビルド12 を配布した後に。前のビルドからの契約の「手動検証項目」を集め、そのビルドの実機チェックリストを作ります。

```
/release-check security
```

外部のテスターに配る前と、公開の入口を足した回の後に。サーバーの公開の入口をすべて列挙して
「認証が要る ／ 開発用の関門の後ろ ／ 公開でよい」に仕分け、定期処理が内部の入口から呼ばれているか、
テスト用の入口が本番で開いていないか、機能（通報 ・ ブロック ・ 削除 ・ アカウント削除）に画面の入口があるか、
増え続けるデータを全件読んでいないかを**読むだけで**確かめます（提出の直前に、ログインなしで全利用者の記録が読める口が4つ見つかった実害から）。

```
/release-check 1.0.0
```

自動の面の検証、上の点検、本番の面（実機）の手動確認、ストアの情報を分けて確認し、
`docs/releases/release-readiness.md`へ記録します。アップロードや提出は行わず、必ず人間の承認前で止まります。
**審査への提出はあなたの操作です。** 配布のビルドの決まり（まっさらな worktree から出す・一括検査・
サーバーが本番に届いているか・番号を引数に取る1本の台本・送信後のタグ・費用の記録）と、
外部サービスの管理画面の作業の分担表は `docs/release-checklist.md` にあります。

### 5. 実機の指摘を受ける

```
/feedback 12 「一覧の＋が押しにくい」
```

原文を `status.md` に残し、答えが要る点を1度にまとめて聞き、Planner に「実機の指摘（ビルド12）」の回の契約を書かせます。
提出の後でよいものは ID 付きの「送り」へ。スプリントの途中の追加の指摘は、契約への純粋な追記で受けます。
**E2E の全緑は自動の面の全緑であって、実機の保証ではありません。**

### 6. Codex・cc-companyへ引き継ぐ

```
/handoff-codex 1
```

Sprint 1の契約、実装、デザイン、評価、発信素材を
`docs/handoffs/sprint-1-codex.md`へまとめます。Codexはこのファイルを読み、調査、記録、SNS投稿案へ再利用できます。

### 長く回すとき

スプリントが数十回に及ぶと、1回の評価に何時間もかかり、セッションは何度も途切れます。`CLAUDE.md` の
「長く回すための決まり」に、止まらない仕組み（起こす仕掛け・見張りは1つ・並走・判断待ちで止まらない）、
早める4つの手（評価の前に1回だけフル回帰など）、時刻で結果が変わるテストの扱い、途切れた後の再開手順、ユーザーへの報告の書き方があります。
本番の設定や外部への書き込みが安全装置に止められたときの渡し方は「外向きの操作」にあります。
方向の決定は `docs/product-direction.md`（決定の台帳 ・ 追記のみ）に積みます。

### 手動で呼ぶ場合

```
@agent-generator Sprint 1 を実装して。契約は docs/sprints/sprint-1/contract.md
```

> **`@planner` ではなく `@agent-planner`** です。`@agent-` 接頭辞が無いとサブエージェントとして解決されません。

## 事前準備

### 必須

- [Claude Code](https://code.claude.com/docs)
- **Node.js**（ガードスクリプトの実行に使用）
- プロジェクトを信頼済みにすること（未信頼のフォルダではsubagent frontmatterフックが読み飛ばされます）

**Playwright MCP の設定は不要です。** Designer と Evaluator の frontmatter に検証済みバージョン
`@playwright/mcp@0.0.82`を固定しており、エージェント起動時に自動で立ち上がります。

### 任意（デザイン品質に効く）

- デザイントークンを自分のプロダクトの色・フォントに差し替える
  - 既定 → `docs/design-tokens.css`（CSS変数）
  - 本番の面で CSS 変数が効かない技術 → 付録が渡す形式（例: Expo / React Native は `adapters/expo-react-native/design-tokens.ts` を `docs/design-tokens.ts` に写す。`.css` を使うと Web でだけ効いて**実機で崩れる**）
- `/design` の前に、`docs/design-references/` に方向づけの参考画像（好きなアプリの画面など）を置く。
  見本を作るときのトーンの手がかりになります（目録に載らない画像は、そのまま再現されません）

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
│   │   ├── design.md              # /design [画面ID …]
│   │   ├── sprint.md              # /sprint N
│   │   ├── polish.md              # /polish N
│   │   ├── feedback.md            # /feedback <ビルド番号>
│   │   ├── release-check.md        # /release-check [early | device N | security | バージョン]
│   │   ├── handoff-codex.md        # /handoff-codex N
│   │   └── harness-init.md        # /harness-init
│   └── hooks/
│       ├── guard.mjs              # 役割境界の強制
│       ├── guard.test.mjs         # ガードの回帰テスト
│       └── wiring.test.mjs        # 配線 ・ 版 ・ 付録 ・ 土台の語の検査
├── docs/
│   ├── adapters/                  # 使う付録（/harness-init がハーネスの adapters/ から写す）
│   ├── spec.md                    # Planner が生成
│   ├── product-direction.md       # 決定の台帳（V-n ・ 追記のみ）
│   ├── runbook.md                 # 起動方法（Sprint 1 で Generator が実値を埋める）
│   ├── release-checklist.md        # 提出・公開の前の確認（早期の穴 ・ 点検 ・ 配布のビルドの決まり ・ 管理画面の分担）
│   ├── pace-one-week.md           # 進め方: 1週間（日割り ・ W1〜W7 ・ 戻し方）
│   ├── rubric.md                  # デザイン採点アンカー
│   ├── design-tokens.css          # トークン正本（既定。形式は付録が決める）
│   ├── design-tokens.md           # トークン解説
│   ├── design-references/         # 見本（/design が作り、あなたが承認した正本）・ 目録 INDEX.md ・ 方向づけの参考画像
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
