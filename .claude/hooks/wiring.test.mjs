import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
