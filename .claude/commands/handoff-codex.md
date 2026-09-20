---
description: スプリント成果をCodex・cc-company・発信作成へ渡せる安全な引き継ぎ文書にまとめる
argument-hint: <スプリント番号>
---

Sprint $1 の成果を、別のAIが会話履歴なしで理解できる引き継ぎ文書にしてください。

## 読むもの

- `docs/spec.md`
- `docs/sprints/sprint-$1/contract.md`
- `docs/sprints/sprint-$1/generator-report.md`
- `docs/sprints/sprint-$1/designer-report.md`
- 最新の`docs/sprints/sprint-$1/evaluation-*.md`
- `e2e/sprint-$1.spec.*`
- 対象スプリントのgitコミットと差分概要

## 保存先

`docs/handoffs/sprint-$1-codex.md`

## 内容

1. ユーザーに増えた価値
2. 実装・デザインの要点
3. 合格を示すテスト証拠
4. 未解決事項とネイティブ手動確認
5. 判断・トレードオフ
6. X、TikTok、Instagramで発信できる具体的な素材
7. 次スプリントへの提案
8. 参照ファイルへの相対パス

秘密、トークン、メールアドレス、テスト用パスワード、`.env`の内容は含めない。推測した成果や数値を事実として書かない。このコマンドではプロダクトコードとスプリント契約を変更しない。
