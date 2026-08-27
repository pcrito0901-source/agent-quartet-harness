# Design Tokens

> **正本は [`design-tokens.css`](./design-tokens.css) です。**
> Designer はそちらを import して `var()` で参照します。
> このファイルは人間向けの解説であり、値を変更する場合は **CSS 側を編集してください**。

## なぜ CSS が正本なのか

Markdown の箇条書きから hex 値を手で書き写すと、必ず転記ミスが起きます。
Evaluator は「デザイントークンに無い値が使われていないか」をチェックするため、
転記ミスはそのまま不合格につながります。CSS 変数として import すれば、
この経路そのものが消えます。

## カスタマイズ方法

1. `design-tokens.css` の値だけを自分のプロダクトに合わせて差し替える
2. **変数名は変えない**（エージェントのプロンプトが変数名を前提にしている）
3. トークンを増やしたい場合は追加してよい。Designer が追加した場合は
   `designer-report.md` の「トークンの拡張」に記録される

## トークン一覧

| カテゴリ | 変数 | 用途 |
|---|---|---|
| Color / primitive | `--color-primary`, `--color-accent` | ブランドの主役色 |
| Color / surface | `--color-bg`, `--color-bg-secondary`, `--color-bg-elevated`, `--color-border` | 背景・面・境界 |
| Color / text | `--color-text`, `--color-text-secondary`, `--color-text-muted`, `--color-text-on-primary` | 文字色の階層 |
| Color / status | `--color-success`, `--color-error`, `--color-warning`, `--color-info` | 状態表現 |
| Focus | `--color-focus-ring`, `--focus-ring` | キーボードフォーカス |
| Typography | `--font-sans`, `--font-mono`, `--text-xs`〜`--text-4xl`, `--font-normal`〜`--font-bold`, `--leading-*`, `--tracking-*` | 文字 |
| Spacing | `--space-1`〜`--space-24` | 4px スケールの余白 |
| Radius | `--radius-sm`〜`--radius-full` | 角丸 |
| Shadow | `--shadow-sm`〜`--shadow-lg` | 影 |
| Motion | `--duration-fast`, `--duration-normal`, `--ease-out` | アニメーション |
| Layout | `--container-max`, `--bp-mobile`, `--bp-tablet`, `--bp-desktop` | 幅とブレークポイント |

## 設計上の約束

- **ダークモードは値の差し替えだけで成立する。** 変数名はライト/ダークで共通
- **余白は 4px スケールに乗せる。** `--space-*` 以外の余白値を使うと Evaluator の「クラフト」で減点される
- **`outline: none` を書くなら `--focus-ring` で代替を必ず用意する**
- `prefers-reduced-motion` でアニメーションが無効化される
