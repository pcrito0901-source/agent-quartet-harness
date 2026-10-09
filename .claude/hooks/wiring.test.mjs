import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const AGENTS = ["planner", "generator", "designer", "evaluator"];

for (const role of AGENTS) {
  test(`${role} は役割境界ガードを配線している`, () => {
    const file = path.join(ROOT, ".claude", "agents", `${role}.md`);
    const content = readFileSync(file, "utf8");
    assert.match(content, /\n hooks:|\nhooks:/);
    assert.match(content, /matcher: "Write\|Edit\|NotebookEdit\|Bash\|PowerShell"/);
    assert.ok(content.includes(`node "${"${CLAUDE_PLUGIN_ROOT}"}/.claude/hooks/guard.mjs" ${role}`));
  });
}

test("Playwright MCP は検証済みバージョンに固定されている", () => {
  for (const role of ["designer", "evaluator"]) {
    const content = readFileSync(path.join(ROOT, ".claude", "agents", `${role}.md`), "utf8");
    assert.ok(content.includes("@playwright/mcp@0.0.82"));
    assert.ok(!content.includes("@playwright/mcp@latest"));
  }
});

test("plugin.json・marketplace.json・CHANGELOG の版が揃っている", () => {
  const plugin = JSON.parse(readFileSync(path.join(ROOT, ".claude-plugin", "plugin.json"), "utf8"));
  const market = JSON.parse(readFileSync(path.join(ROOT, ".claude-plugin", "marketplace.json"), "utf8"));
  const changelog = readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8");
  const latest = changelog.match(/^## (\d+\.\d+\.\d+)/m)?.[1];
  assert.ok(latest, "CHANGELOG に版の見出しが無い");
  assert.equal(plugin.version, latest);
  assert.equal(market.plugins.find((p) => p.name === plugin.name)?.version, latest);
});

test("README のファイル構成が載せるコマンドは実在する", () => {
  const content = readFileSync(path.join(ROOT, "README.md"), "utf8");
  const listed = [...content.matchAll(/([a-z-]+)\.md\s+#\s*\//g)].map((m) => m[1]);
  assert.ok(listed.length >= 7, `README から拾えたコマンドが ${listed.length} 件（器が壊れている）`);
  for (const name of listed) {
    assert.ok(existsSync(path.join(ROOT, ".claude", "commands", `${name}.md`)), `README: ${name}.md が無い`);
  }
  for (const name of ["plan", "design", "sprint", "polish", "feedback", "release-check", "handoff-codex", "harness-init"]) {
    assert.ok(existsSync(path.join(ROOT, ".claude", "commands", `${name}.md`)), `${name}.md が無い`);
  }
});

// 見本の段（v2.7.0）: 画面の形を実装の前に見本で決める流れが、どこかの直しで外れないように見張る。
test("見本の段が計画と実装のあいだに配線されている", () => {
  const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");
  assert.ok(existsSync(path.join(ROOT, "docs", "design-references", "INDEX.md")), "目録の雛形 docs/design-references/INDEX.md が無い");
  assert.match(read(".claude/commands/plan.md"), /\/design/, "plan.md が承認の後に /design を案内していない");
  assert.match(read(".claude/commands/sprint.md"), /見本: 承認済み/, "sprint.md が見本の承認を事前確認していない");
  assert.match(read(".claude/commands/design.md"), /INDEX\.md/, "design.md が目録に触れていない");
  assert.match(read(".claude/agents/planner.md"), /^## 画面一覧/m, "planner.md の spec の雛形に「画面一覧」が無い");
  assert.match(read(".claude/agents/designer.md"), /^## 見本モード/m, "designer.md に「見本モード」の節が無い");
  assert.match(read(".claude/agents/evaluator.md"), /両方向/, "evaluator.md が見本との差を両方向で数えていない");
});

// 実運用の学び（v2.8.0）: 作る前の需要 ・ 課金と計測は「届いたか」まで ・ 数字は数え直す。
test("作る前と公開の前の学びが配線されている", () => {
  const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");
  assert.match(read(".claude/agents/planner.md"), /^## 需要の根拠/m, "planner.md の spec の雛形に「需要の根拠」が無い");
  assert.match(read(".claude/commands/plan.md"), /需要/, "plan.md が起動の前に需要を聞いていない");
  const checklist = read("docs/release-checklist.md");
  assert.match(checklist, /サーバーに購入の記録/, "release-checklist.md が購入をサーバーの記録まで見ていない");
  assert.match(checklist, /分析の画面/, "release-checklist.md が計測の届きを見ていない");
  assert.match(read(".claude/commands/release-check.md"), /^\| E11 /m, "release-check.md の early に計測の行（E11）が無い");
  assert.match(read("CLAUDE.md"), /別の数え方で確かめてから/, "CLAUDE.md に「数字は別の数え方で確かめる」が無い");
});

// 進め方: 1週間（v2.9.0）: 切り替え式で、`通常` に戻せることまで見張る。
test("1週間の進め方が配線され、通常に戻せる", () => {
  const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");
  const pace = read("docs/pace-one-week.md");
  for (const id of ["W1", "W2", "W3", "W4", "W5", "W6", "W7"]) {
    assert.match(pace, new RegExp(`^\\| ${id} \\|`, "m"), `pace-one-week.md に ${id} の行が無い`);
  }
  assert.match(pace, /^## 戻し方/m, "pace-one-week.md に「戻し方」が無い");
  assert.match(pace, /v2\.8\.0/, "pace-one-week.md が戻す先の版（v2.8.0）を名指していない");
  assert.match(read("docs/sprints/status.md"), /^\| 進め方 \|.*通常/m, "status.md の雛形に「進め方」の行（無ければ通常）が無い");
  assert.match(read(".claude/commands/plan.md"), /進め方を選ぶ/, "plan.md が進め方を聞いていない");
  const sprint = read(".claude/commands/sprint.md");
  assert.match(sprint, /「進め方」を読む/, "sprint.md が進め方を読んでいない");
  assert.match(sprint, /進め方が `1週間` なら省いて Phase C/, "sprint.md が 1週間 のとき Phase C0 を省いていない");
  assert.match(read(".claude/agents/planner.md"), /^## 最初の版と翌週以降/m, "planner.md の spec の雛形に「最初の版と翌週以降」が無い");
  assert.match(read(".claude/agents/evaluator.md"), /W3/, "evaluator.md が時計の固定（W3）を持っていない");
  assert.match(read(".claude/agents/generator.md"), /W3/, "generator.md が時計の差し替え口（W3）を持っていない");
  assert.match(read(".claude/commands/harness-init.md"), /pace-one-week\.md/, "harness-init.md が pace-one-week.md を写していない");
});

// 見た目の方向（v2.10.0）: 見本の前に方向を聞き、iOS の半透明は付録に作り方と確かめ方を置く。
test("見た目の方向と iOS の半透明が配線されている", () => {
  const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");
  assert.match(read(".claude/commands/design.md"), /^### 0\. 見た目の方向を1回聞く/m, "design.md が見本の前に方向を聞いていない");
  const rn = read("adapters/expo-react-native/README.md");
  assert.match(rn, /^### iOS の半透明/m, "付録 expo-react-native に「iOS の半透明」の節が無い");
  assert.match(rn, /isGlassEffectAPIAvailable/, "付録が API の在りか（beta で落ちる）を確かめていない");
  assert.match(rn, /isReduceTransparencyEnabled/, "付録が「透明度を下げる」を確かめていない");
});

test("付録（adapters）がそろい、必ず置く見出しを持つ", () => {
  assert.ok(existsSync(path.join(ROOT, "adapters", "README.md")), "adapters/README.md が無い");
  for (const name of ["web", "expo-react-native", "convex"]) {
    const file = path.join(ROOT, "adapters", name, "README.md");
    assert.ok(existsSync(file), `adapters/${name}/README.md が無い`);
    const content = readFileSync(file, "utf8");
    for (const heading of ["見分け方", "スキルの例", "土台への差し込み"]) {
      assert.match(content, new RegExp(`^#+ .*${heading}`, "m"), `adapters/${name}: 見出し「${heading}」が無い`);
    }
  }
  assert.ok(existsSync(path.join(ROOT, "adapters", "expo-react-native", "design-tokens.ts")));
  assert.ok(existsSync(path.join(ROOT, "adapters", "expo-react-native", "scripts", "release-build.mjs")));
  assert.ok(existsSync(path.join(ROOT, "adapters", "convex", "list-public-functions.mjs")));
});

// 土台（決まりの本文）に、特定の技術名とアプリ固有の語を戻さない。
// 技術名は「例」の行か、付録（adapters/）を指す行にだけ置いてよい。
// /harness-init は付録を選ぶコマンドなので、技術名の検査から外す（アプリ固有の語は検査する）。
const CORE = [
  "CLAUDE.md",
  ...AGENTS.map((r) => `.claude/agents/${r}.md`),
  ...["plan", "design", "sprint", "polish", "feedback", "release-check", "handoff-codex", "harness-init"].map((c) => `.claude/commands/${c}.md`),
  "docs/runbook.md",
  "docs/release-checklist.md",
  "docs/rubric.md",
  "docs/design-tokens.md",
  "docs/product-direction.md",
  "docs/pace-one-week.md",
  "docs/sprints/status.md",
];
const APP_WORDS = /PawNow|befitting|お題|ペット|グループ/;
const TECH_WORDS = /Expo|React Native|\bRN\b|Convex|\bEAS\b|TestFlight|RevenueCat|PostHog|App Store Connect|app\.json|eas\.json|asc-/;
const lines = (rel) => readFileSync(path.join(ROOT, rel), "utf8").split(/\r?\n/);

test("土台の本文にアプリ固有の語が無い", () => {
  for (const rel of CORE) {
    lines(rel).forEach((line, i) => assert.ok(!APP_WORDS.test(line), `${rel}:${i + 1} にアプリ固有の語: ${line.trim()}`));
  }
});

test("土台の本文の技術名は「例」か付録を指す行にだけある", () => {
  for (const rel of CORE.filter((r) => !r.endsWith("harness-init.md"))) {
    lines(rel).forEach((line, i) => {
      if (!TECH_WORDS.test(line)) return;
      assert.ok(/例|adapters\//.test(line), `${rel}:${i + 1} に技術名（例でも付録でもない）: ${line.trim()}`);
    });
  }
});
