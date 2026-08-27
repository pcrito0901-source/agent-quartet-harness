/**
 * guard.mjs の回帰テスト。
 *   node --test .claude/hooks/
 * ガード自体が壊れると「守っているつもり」が一番危ないので、
 * 役割境界はテストで固定する。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const GUARD = fileURLToPath(new URL("./guard.mjs", import.meta.url));
const ROOT = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));

/** @returns {number} exit code (2 = blocked) */
function run(role, toolName, toolInput) {
  const res = spawnSync(process.execPath, [GUARD, role], {
    input: JSON.stringify({
      hook_event_name: "PreToolUse",
      cwd: ROOT,
      tool_name: toolName,
      tool_input: toolInput,
    }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
    encoding: "utf8",
  });
  return res.status;
}

const abs = (p) => path.join(ROOT, p);
const BLOCKED = 2;
const ALLOWED = 0;

test("evaluator はプロダクトコードを書き換えられない", () => {
  assert.equal(run("evaluator", "Write", { file_path: abs("src/App.tsx") }), BLOCKED);
  assert.equal(run("evaluator", "Edit", { file_path: abs("app/page.tsx") }), BLOCKED);
});

test("evaluator は評価レポートと回帰テストは書ける", () => {
  assert.equal(run("evaluator", "Write", { file_path: abs("docs/sprints/sprint-1/evaluation-1.md") }), ALLOWED);
  assert.equal(run("evaluator", "Write", { file_path: abs("e2e/sprint-1.spec.ts") }), ALLOWED);
  assert.equal(run("evaluator", "Write", { file_path: abs("playwright.config.ts") }), ALLOWED);
});

test("evaluator は Bash 経由の書き込みも塞がれる", () => {
  assert.equal(run("evaluator", "Bash", { command: "echo 'fix' > src/App.tsx" }), BLOCKED);
  assert.equal(run("evaluator", "Bash", { command: "sed -i 's/a/b/' src/App.tsx" }), BLOCKED);
  assert.equal(run("evaluator", "Bash", { command: "cat x | tee src/App.tsx" }), BLOCKED);
});

test("evaluator の通常のテスト実行は妨げない", () => {
  assert.equal(run("evaluator", "Bash", { command: "npx playwright test 2>/dev/null" }), ALLOWED);
  assert.equal(run("evaluator", "Bash", { command: "npm run dev > /dev/null &" }), ALLOWED);
  assert.equal(run("evaluator", "Bash", { command: "git log --oneline | head -5" }), ALLOWED);
  assert.equal(run("evaluator", "Bash", { command: "echo report >> docs/sprints/sprint-1/notes.md" }), ALLOWED);
});

test("planner は docs/ の外に書けない", () => {
  assert.equal(run("planner", "Write", { file_path: abs("src/index.ts") }), BLOCKED);
  assert.equal(run("planner", "Write", { file_path: abs("package.json") }), BLOCKED);
  assert.equal(run("planner", "Write", { file_path: abs("docs/spec.md") }), ALLOWED);
  assert.equal(run("planner", "Write", { file_path: abs("docs/sprints/sprint-1/contract.md") }), ALLOWED);
});

test("generator は仕様と契約を書き換えられない", () => {
  assert.equal(run("generator", "Edit", { file_path: abs("docs/spec.md") }), BLOCKED);
  assert.equal(run("generator", "Edit", { file_path: abs("docs/sprints/sprint-2/contract.md") }), BLOCKED);
});

test("generator は実装コードには自由に書ける", () => {
  assert.equal(run("generator", "Write", { file_path: abs("src/App.tsx") }), ALLOWED);
  assert.equal(run("generator", "Write", { file_path: abs("docs/sprints/sprint-1/generator-report.md") }), ALLOWED);
});

test("designer は新しいルートやロジックファイルを作れない", () => {
  assert.equal(run("designer", "Write", { file_path: abs("src/app/admin/page.tsx") }), BLOCKED);
  assert.equal(run("designer", "Write", { file_path: abs("src/lib/newLogic.ts") }), BLOCKED);
});

test("designer はスタイルとアセットは新規作成できる", () => {
  assert.equal(run("designer", "Write", { file_path: abs("src/styles/theme.css") }), ALLOWED);
  assert.equal(run("designer", "Write", { file_path: abs("docs/sprints/sprint-1/designer-report.md") }), ALLOWED);
});

test("designer は既存ファイルの編集はできる", () => {
  assert.equal(run("designer", "Edit", { file_path: abs("README.md") }), ALLOWED);
});

test("全ロールでプロジェクト外への書き込みを拒否する", () => {
  assert.equal(run("generator", "Write", { file_path: path.join(ROOT, "..", "escape.txt") }), BLOCKED);
});

test("未知のロールはパイプラインを止めない", () => {
  assert.equal(run("unknown-role", "Write", { file_path: abs("src/App.tsx") }), ALLOWED);
});
