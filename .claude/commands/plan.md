---
description: プロダクトの概要から仕様書とスプリント契約を生成する（Planner を起動）
argument-hint: <作りたいものを1〜4行で>
---

`@agent-planner` を起動して、以下のプロダクトの仕様書とスプリント契約を作らせてください。

**ユーザーの要望:**
$ARGUMENTS

## Planner 起動後にあなた（オーケストレーター）がやること

1. 生成された `docs/spec.md` と `docs/sprints/*/contract.md` を読む
2. **`docs/spec.md` の「確認事項」節を必ずユーザーに提示する** — Planner は推測で前提を埋めている。ここが違うと以降のスプリント全部が無駄になる
3. `AskUserQuestion` でスプリント構成の承認を取る:
   - この前提で進めてよいか
   - スプリントの分割・順序でよいか
4. 承認が取れたら `docs/sprints/status.md` の Sprint 1 を `計画済み` に更新する
5. 次のステップとして `/sprint 1` を案内する

**承認を取る前に `/sprint` へ進んではならない。** 仕様の誤りは後段になるほど修正コストが跳ね上がる。
