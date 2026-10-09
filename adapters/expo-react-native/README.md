# 付録: Expo / React Native

Expo / React Native で作り、EAS でビルドして TestFlight ・ App Store に出すアプリ。
1か月 ・ 約70スプリントの実運用（Windows の機械で開発し、iPhone の実機で確かめた）から書いた。

補助ファイル:

| ファイル | 中身 |
|---|---|
| [`design-tokens.ts`](design-tokens.ts) | RN 用のトークンの正本（プロジェクトの `docs/design-tokens.ts` に写す） |
| [`scripts/release-build.mjs`](scripts/release-build.mjs) | ビルド番号を引数に取る、1本だけのビルドの台本 |

## 1. 見分け方

- `package.json` に `expo` か `react-native` がある
- `app.json` ・ `app.config.*` ・ `eas.json` がある

## 2. 評価の面 —— Web の束で測る

**回帰の E2E は `expo start --web`（または `expo export -p web` の束）を Playwright で操作する。**
react-native-web が DOM を出すので、Playwright がそのまま使える。

**なぜ Web か:** iOS シミュレータは macOS 専用で、Windows の機械ではネイティブの自動 E2E が物理的にできない。
自動で測れる面は Web だけになる。

**限界（Web の全緑は実機の保証ではない）:**

| 差 | 起きること |
|---|---|
| JS のエンジン（ブラウザ と Hermes） | Web で動く書き方が実機で落ちる（実運用の実機の欠陥は、全部ビルドとスクリーンショットが捕まえた） |
| 見た目 | 影 ・ 字の行の高さ ・ フォントの読み込み ・ 安全領域が違う |
| ネイティブのモジュール | Web では代わりの実装か、何もしない |
| サーバー | E2E はローカル、実機はクラウドを見ていることがある（[`convex` の付録](../convex/README.md) の 2） |

- 合否には必ず「**Web で**」と添える
- 幅は **375px が主軸**。768 ／ 1280 はタブレット対応が契約にあるときだけ
- `playwright.config.ts` の `webServer.command` に `npx expo start --web`、`timeout` は 120000 以上（Metro の初回起動が遅い）
- **束（`expo export -p web` の出力）を作り直さない走行コマンドがあるなら、製品のコードが動いた後のフル回帰の前に束を作り直し、
  走行の頭に束の名（`entry-<hash>.js`）を記録する**。記録が無いと、その走行が古い束で走ったか言えなくなる（実運用で2回の走行がそうなった）

## 3. 手動検証に回すもの

契約の表とは別の「手動検証項目」節に書く。**自動の契約に混ぜると Evaluator が永久に合格を出せない。**

| 自動の契約に入れてよい（Web で測れる） | 手動検証へ（実機だけ） |
|---|---|
| 画面遷移 ・ 入力 ・ バリデーション | プッシュ通知の受信 |
| 一覧 ・ 検索 ・ 並べ替え ・ 状態の更新 | カメラ ・ マイク ・ 位置情報 ・ 写真の権限 |
| 空の状態 ・ エラー ・ 読み込み中 | アプリ内課金 ・ 生体認証 ・ Apple でサインイン |
| 永続化と再読み込み後の復元 | ディープリンク ・ バックグラウンド動作 ・ ウィジェット |
| 半透明の部品が**在ること**（押せる ・ 文字が出る） | 半透明（Liquid Glass）の**見え方**（下の 4 の「iOS の半透明」） |

ビルドを配ったら `/release-check device <n>` で、そのビルドの手動検証の一覧を作ってユーザーに渡す。

## 4. デザイントークン —— `design-tokens.ts`

**RN では `docs/design-tokens.ts` を使う。`.css` は使わない。**
RN に CSS 変数は無い。`.css` は Expo Web でだけ効いてしまい、**ブラウザでは正しく見えるのに実機で崩れる**。

```ts
import { colors, spacing, radius, shadow } from "@/docs/design-tokens";

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgElevated, padding: spacing[4], borderRadius: radius.md, ...shadow.sm },
});
```

- 影は iOS（`shadow*`）と Android（`elevation`）で別物。`shadow.*` は両方を含むので展開して使う
- `lineHeight` は倍率ではなく絶対値（dp）。`typography.size.base * typography.leading.normal` で出す
- フォントは `expo-font` で読み込んだ名前を書く。読み込んでいない名前は、**ネイティブでは警告も無く既定のフォントになる**
- `gap` は RN 0.71 以降だけ
- デザインのスキル（例: `ui-ux-pro-max`）は**プラグインの本体だけ**を使う。同じプラグインの `ui-styling` ・ `design-system` は
  Web 前提（Tailwind ・ shadcn ・ CSS 変数）で、**実機で崩れる**。取り入れた助言と退けた助言を、両方報告に書く
- `EXPO_PUBLIC_*` の環境変数は束に埋め込まれる。秘密を置かない

### iOS の半透明（Liquid Glass ・ iOS 26 以降）

iPhone の半透明のボタン ・ タブ ・ シート（Apple の呼び名は Liquid Glass）は、`expo-glass-effect` の `GlassView` で作る。
**シンプルで、浮いているものだけが半透明**の見た目にしたいアプリは、見本の段（`/design`）で方向に選び、ここに従う。

**どこに使うか**: 中身の上に**浮いているもの**（タブバー ・ 浮いたボタン ・ 下から出るシート ・ 小さなピル）。
写真 ・ 本文 ・ 一覧の行のような**中身そのものには使わない**（読みにくくなり、どこが押せるかも分かりにくくなる）。

**ガラスにするのは、3つがそろったときだけ。** どれかが欠けたら不透明の地に落とす:

| 条件 | 確かめ方 |
|---|---|
| OS が Liquid Glass を持つ（iOS 26 以降） | `isLiquidGlassAvailable()` |
| その API が在る（iOS 26 の一部の beta には無く、呼ぶと落ちる） | `isGlassEffectAPIAvailable()` |
| 利用者が「透明度を下げる」を入れていない | `AccessibilityInfo.isReduceTransparencyEnabled()` と、その変化の知らせ |

落とし先は、不透明の地（Web と同じ色）か、`expo-blur` の `BlurView`（`tint="systemMaterial"`）。どちらにするかは見本の段で決める。

**ガラスの箱にしないこと**:
- `overflow: "hidden"` で外から切らない。ガラスは自分の `borderRadius` で切る（外から切ると縁の光が欠ける。`BlurView` は逆に `overflow: "hidden"` が要る）
- 上に不透明の地の色や縁を重ねない（透けなくなる）
- 不透明度（`opacity`）を動かさない（例: 下から出すモーダルは iOS で `animationType="none"` にする）
- `isInteractive` は押せるもの（ボタン）にだけ付ける
- ピルの角は高さの半分にし、描いた高さ（`onLayout`）から求めて渡す（大きすぎる角の数で形が崩れうる）

**部品は1つにまとめる**: `glass-surface.ios.tsx`（iOS の束にだけ入る ・ 3つの条件と落とし先を持つ）と
`glass-surface.tsx`（Web と Android ・ 不透明の地）の2ファイルにし、画面からは部品だけを呼ぶ。画面ごとに `GlassView` を直に書かない
（条件の確かめ忘れが画面の数だけ生まれる）。

**評価と確認**:
- ガラスは **Web の束（自動の E2E）では見えない**（不透明の地で描かれる）。自動の契約では「部品が在る ・ 押せる ・ 字が出る」だけを測る
- 見え方は契約の「手動検証項目」に書く: **明るい写真の上 ・ 暗い写真の上で字が読めるか** ／ 「透明度を下げる」を入れると不透明になるか ／ iOS 26 より前の端末で不透明に落ちるか
- 見本（`/design`）でも、ガラスは**写真や色のある地の上**に描いてから承認する（白い地の上では違いが見えない）
- 使うスキルの例: `expo-native-ui`（`references/visual-effects.md` に GlassView と BlurView の書き方がある）

## 5. サーバーの公開の入口

アプリ自身は入口を持たない。サーバーの付録（例: [`convex`](../convex/README.md)）の 5 を見る。
**束に入ったサーバーの URL は誰でも読める**ので、「アプリからしか呼ばれないはず」は守りにならない。

## 6. ビルドと配布（EAS）

土台の `docs/release-checklist.md` の「配布のビルドの決まり」を、EAS ではこう満たす。

### 別フォルダ（まっさらな `git worktree`）から出す

```powershell
git worktree add --detach ..\app-build-<n> <合格のコミット>
New-Item -ItemType Junction -Path ..\app-build-<n>\node_modules -Target .\node_modules
```

- **なぜ:** Windows の eas-cli は、**入れ子の `.gitignore` を当てられない**（`path.relative` が `\` を返すので、規則の `/` 区切りと一致しない）。
  ルートの規則は効き、入れ子の規則だけが黙って効かない。実運用ではローカルのサーバーのデータ（2.3GB）を丸ごとアーカイブに入れて上げた。
  恒久の直しはルートの `.easignore`
- ジャンクションは PowerShell で作る（Git Bash の `mklink /J` は `/J` が道に書き換えられて落ちる）
- **片付けはジャンクションを先に外す**（`cmd /c rmdir ..\app-build-<n>\node_modules`）→ 本体の `node_modules` が無事か確かめる → `git worktree remove`。
  逆順は本体の `node_modules` を消しうる

### アーカイブの大きさを見る

```bash
npx eas-cli build:inspect --platform ios --profile production --stage archive --output <scratchpad>/archive-<n>
```

アップロードせずに中身を作る。いつもの大きさ（実運用では 286MB 前後）から桁が違えば止めて中を見る。

### ビルドの前の一括検査（`npm run build:gate` の例）

1段でも落ちたら出さない。段の例: `expo-doctor` ／ 本番のエンジン（Hermes）で束が作れるか ／ 計測や課金のキーの有無 ／
サーバーへ配備した記録と手元のサーバーのコードの突き合わせ ／ 古いビルドが呼ぶ入口を消していないか（[`convex`](../convex/README.md) の 3）。

### 台本は1本 ・ 番号を引数で

```bash
node scripts/release-build.mjs --build 27 --tree <合格のコミット> [--submit]
```

[`scripts/release-build.mjs`](scripts/release-build.mjs) をプロジェクトの `scripts/` に写して使う。
**ビルドごとに台本をコピーして書き換えない。** 実運用で、コピーの置換漏れから**前回のログを今回の結果として表示していた**
（判定そのものは正しかったが、記録が信用できなくなった）。台本は番号から作業フォルダ ・ ログ ・ タグの名をすべて作る。

### 待ち方

- `--no-wait` を使わない。`eas build` は完了まで待つ形のまま、**background で走らせて完了の通知を受ける**
- 見張りは1つ。時間切れで見張りを足し直さない

### 費用

- 無料プランには iOS のビルドの月の上限がある（実運用で月の途中に使い切った）
- 有料プランは1回ごとに費用がかかる（実運用の例: 中サイズ 1回 $2 ・ 月の枠 $45）。**ビルド番号と費用を `status.md` の台帳に書く**
- **追加の支払い ・ 枠の超過 ・ プランの変更はユーザーが決める。** 枠が尽きそうなら止めて言う

### 送信の後

- `git tag -a testflight/<n> <木> -m "sent YYYY-MM-DD"`（どのビルドがどの木かの台帳。古いビルドが呼ぶ入口を消してよいかの判定に使う）
- `/release-check device <n>` でそのビルドの実機チェックリストを作る

## 7. TestFlight と外部テスト

| | 内部テスト | 外部テスト |
|---|---|---|
| 誰に | App Store Connect の利用者（チーム） | メールか公開リンクで招いた人 |
| 審査 | 無し | **その版の最初のビルドに、ベータ版の審査が要る** |
| 要るもの | ビルドだけ | ベータ版の説明 ・ フィードバックのメール ・ 「テストの内容」・ 審査の連絡先とデモアカウント |

- **外部のテスターに配る前に、開発用のログイン（審査用 ・ テスト用の裏口）を閉じる。** 閉じられないなら、本番の利用者が通れない関門の後ろに置く
- 暗号化の申告を毎回聞かれないよう、`app.json` の `ios.infoPlist.ITSAppUsesNonExemptEncryption` を設定する（値は暗号の使い方に合わせてユーザーが決める）

## 8. App Store Connect の作業の分担

土台の `docs/release-checklist.md` の「外部サービスの管理画面の作業の分担」の、App Store Connect の例。
道具（App Store Connect の MCP ・ `asc` CLI）が入っている前提。**書き込みは毎回ユーザーの承認の後。**

| 作業 | 道具で書けるか | 担当 | 文字数の上限と注意 |
|---|---|---|---|
| 説明文 ・ キーワード ・ プロモーション用テキスト ・ 新機能 ・ サポート URL | 書ける（版の地域ごとの情報） | エージェント（承認の後） | 説明 4000 ・ キーワード 100 バイト ・ プロモーション 170 ・ 新機能 4000 |
| アプリ名 ・ サブタイトル ・ プライバシーポリシー URL | 道具に更新が無いことがある | ユーザー（画面） | 名前 30 ・ サブタイトル 30 |
| 画面写真 ・ プレビュー動画 | 道具に無いことがある | ユーザー（画面） | 寸法は端末の大きさごとに決まっている（例: 6.9 インチ 1320×2868） |
| App のプライバシー（集めるデータ） | 画面だけ | ユーザー（材料はエージェント） | 何を集めて誰に渡すかを文書で用意して渡す |
| 年齢区分 | 書ける | エージェント（承認の後） | 記録がまだ無いと更新できない |
| 審査の連絡先 ・ デモアカウント ・ メモ | 書ける | エージェント（メモ）／ユーザー（パスワード） | **記録がまだ無いと更新の道具が使えない** → 最初の1回は画面で保存してもらう ・ パスワードはエージェントが入れない |
| 価格 ・ 配信地域 ・ 課金の商品 | 一部 | ユーザー | 価格と支払いはユーザーが決める |
| テスターとグループ | 書ける | エージェント（承認の後） | テスターのメールはユーザーが渡したものだけ |
| ベータ版の審査への提出 ・ **審査への提出（submit-for-review の族）** | 書ける | **ユーザー** | **常設の承認があってもエージェントは出さない** |

- 道具が安全装置に止められたら、回り道をせず、ユーザーが打つ1行か、画面の手順と貼り付け用の文をすぐ渡す（土台の `CLAUDE.md` の「安全装置に止められたら」）

## 9. 罠（実害つき）

| 罠 | 実害 |
|---|---|
| `.css` のトークンを RN で使う | Web では正しく、実機で崩れた |
| アイコンと起動画面がテンプレートの見本のまま | 29ビルド配った後に気づいた（`/release-check early` の E1） |
| Apple ・ Google のログインのクライアント ID | 提出の前夜に判明した（E2） |
| 本体のフォルダから `eas build` | ローカルのデータ 2.3GB がアーカイブに入った（6） |
| サーバーから入口を消す配備 | 端末に入っていたビルドの画面が落ちる見込みになった（[`convex`](../convex/README.md) の 3） |
| 束を作り直さない走行 | どの束で測ったか言えなくなった（2） |
| ビルドの台本をコピーして書き換え | 前回のログを今回の結果として表示した（6） |
| 「1画面に収めて」をそのまま詰めた | 実機で「窮屈」と言われ、往復に2スプリント（土台の Phase A0） |

## 10. スキルの例

| 場面 | 役 | 例 |
|---|---|---|
| 実装 ・ 評価 | Generator ・ Evaluator | `react-native-best-practices` |
| UI の仕上げ | Designer | `ui-ux-pro-max`（**本体だけ**）・ `expo-native-ui` |
| ビルドと配布 | オーケストレーター | `eas-app-stores` |
| 提出の前の確かめ ・ ストアの文 | オーケストレーター（`/release-check`） | `asc-*` の読み取り系 ・ `asc-whats-new-writer` ・ `metadata-optimization` |

## 11. 土台への差し込み

### `docs/runbook.md` の「起動」表

| 項目 | 値 |
|---|---|
| 評価の面 | Expo Web（`expo start --web`）。**実機の保証ではない** |
| 開発サーバー起動（評価用） | `npx expo start --web` |
| ベースURL | `http://localhost:8081`（起動ログのポートに合わせる） |
| 実機確認（手動） | `npx expo start` → Expo Go か開発ビルドで QR を読む |
| 型チェック | `npx tsc --noEmit` |

### `docs/runbook.md` の「配布」表

| 項目 | 値 |
|---|---|
| ビルド方式 | EAS Build（iOS ・ production） |
| ビルドの台本 | `node scripts/release-build.mjs --build <n> --tree <木>` |
| ビルド元 | `git worktree add --detach ../app-build-<n> <木>`（6） |
| 一括検査 | `npm run build:gate` |
| アーカイブのいつもの大きさ | （初回に測って書く） |
| 送信後のタグ | `testflight/<n>` |
| 月の枠 | （プランと上限） |

### `CLAUDE.md` に足す行（常設の承認の書き方の例）

```markdown
- **`eas build`（iOS ・ production）と `eas submit`（TestFlight まで）には常設の承認がある**（YYYY-MM-DD ユーザー）。
  範囲: 合格した木から、まっさらな worktree で出すビルドと、その TestFlight への送信だけ。
  範囲の外（毎回仰ぐ）: 審査への提出 ・ プランの変更 ・ 追加の支払い ・ Apple のアカウント操作。
  毎回すること: 一括検査 ・ アーカイブの大きさ ・ サーバーの差 0 ・ 費用と番号を status.md に ・ 送信の後にタグ。
  **オーケストレーターだけが打つ。サブエージェントには打たせない**
```
