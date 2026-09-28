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
  for (const name of ["plan", "sprint", "polish", "feedback", "release-check", "handoff-codex", "harness-init"]) {
    assert.ok(existsSync(path.join(ROOT, ".claude", "commands", `${name}.md`)), `${name}.md が無い`);
  }
});
