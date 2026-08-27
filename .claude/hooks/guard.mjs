#!/usr/bin/env node
/**
 * Agent Quartet Harness — 役割境界ガード (PreToolUse hook)
 *
 * 各サブエージェントの「やらないこと」を散文ではなく仕組みで強制する。
 * 各エージェントの frontmatter から次のように呼ばれる:
 *
 *   hooks:
 *     PreToolUse:
 *       - matcher: "Write|Edit|NotebookEdit|Bash"
 *         hooks:
 *           - type: command
 *             command: 'node "${CLAUDE_PROJECT_DIR}/.claude/hooks/guard.mjs" evaluator'
 *
 * exit 2 でツール呼び出しをブロックし、stderr が理由として Claude に返る。
 *
 * 注意: これはサンドボックスではない。Bash 経由の書き込みは代表的な
 * 書き込み手段（リダイレクト / tee / sed -i など）をヒューリスティックに
 * 塞ぐ多層防御であり、完全な封じ込めではない。
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const PROTECTED = [
  /^docs\/spec\.md$/,
  /^docs\/sprints\/sprint-\d+\/contract\.md$/,
];

const STYLE_ASSET = /\.(css|scss|sass|less|styl|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf)$/i;

const ROLES = {
  planner: {
    write: [/^docs\//],
    protect: [],
    reason:
      "Planner が書けるのは docs/ 配下だけです。実装ファイルには触れず、仕様と契約の記述に集中してください。",
  },
  generator: {
    write: [/.*/],
    protect: PROTECTED,
    reason:
      "Generator は仕様書とスプリント契約を書き換えられません。契約に無理があると判断した場合は、勝手に直さずユーザーに報告してください。",
  },
  designer: {
    write: [/.*/],
    protect: PROTECTED,
    newFile: [STYLE_ASSET, /^docs\//, /^e2e\//],
    reason:
      "Designer は仕様・契約を書き換えられません。",
    newFileReason:
      "Designer は新しいページ・ルート・ロジックファイルを作れません。新規作成できるのはスタイル / アセット / ドキュメントのみです。既存ファイルの編集は可能です。",
  },
  evaluator: {
    write: [/^docs\//, /^e2e\//, /^tests\//, /^playwright\.config\.[cm]?[jt]s$/],
    protect: PROTECTED,
    reason:
      "Evaluator はプロダクトコードを修正できません。書けるのは評価レポート (docs/) と回帰テスト (e2e/) だけです。不具合は自分で直さず、修正指示として @agent-generator / @agent-designer に返してください。",
  },
};

const role = process.argv[2];
const cfg = ROLES[role];
if (!cfg) process.exit(0); // 未知のロールは素通し（ガードの誤設定でパイプラインを止めない）

const block = (msg) => {
  process.stderr.write(`[harness guard: ${role}] ${msg}\n`);
  process.exit(2);
};

let stdin = "";
try {
  stdin = readFileSync(0, "utf8");
} catch {
  process.exit(0);
}

let payload;
try {
  payload = JSON.parse(stdin);
} catch {
  process.exit(0);
}

const root = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
const toolName = payload.tool_name;
const input = payload.tool_input || {};

/** 絶対 / 相対どちらのパスもプロジェクトルート相対の posix 形式へ正規化する */
const rel = (p) => {
  if (!p) return null;
  const abs = path.isAbsolute(p) ? p : path.resolve(root, p);
  return path.relative(root, abs).split(path.sep).join("/");
};

const checkPath = (target, isNewFile) => {
  if (!target) return;
  if (target.startsWith("..")) {
    block(`プロジェクト外への書き込みは禁止です: ${target}`);
  }
  if ((cfg.protect || []).some((re) => re.test(target))) {
    block(`${target} は保護されています。${cfg.reason}`);
  }
  if (!cfg.write.some((re) => re.test(target))) {
    block(`${target} への書き込みは許可されていません。${cfg.reason}`);
  }
  if (isNewFile && cfg.newFile && !cfg.newFile.some((re) => re.test(target))) {
    block(`${target} の新規作成は許可されていません。${cfg.newFileReason}`);
  }
};

if (toolName === "Write" || toolName === "Edit" || toolName === "NotebookEdit") {
  const raw = input.file_path || input.notebook_path;
  const target = rel(raw);
  const isNewFile =
    toolName === "Write" && raw != null && !existsSync(path.isAbsolute(raw) ? raw : path.resolve(root, raw));
  checkPath(target, isNewFile);
  process.exit(0);
}

if (toolName === "Bash" || toolName === "PowerShell") {
  const cmd = String(input.command || "");

  // 明示的なインプレース書き換えは、対象を静的に判定しづらいので一律ブロックする
  const inPlace = /(^|[;&|(\s])(sed\s+-i|perl\s+-i|truncate\b|dd\s+of=|shred\b)/;
  if (inPlace.test(cmd)) {
    block(`インプレース書き換えコマンドは使用できません。${cfg.reason}`);
  }

  // リダイレクト / tee の書き込み先を抽出して許可リストに照合する
  const targets = [];
  const redirect = /(?:^|[^0-9<>&])>>?\s*("([^"]+)"|'([^']+)'|[^\s;&|)]+)/g;
  for (const m of cmd.matchAll(redirect)) {
    targets.push(m[2] || m[3] || m[1]);
  }
  const tee = /(?:^|[;&|]\s*)tee\s+(?:-a\s+)?("([^"]+)"|'([^']+)'|[^\s;&|)]+)/g;
  for (const m of cmd.matchAll(tee)) {
    targets.push(m[2] || m[3] || m[1]);
  }

  for (const t of targets) {
    if (/^\/dev\/(null|stderr|stdout)$/i.test(t) || /^nul$/i.test(t) || t === "&1" || t === "&2") continue;
    if (t.startsWith("$")) {
      block(`書き込み先が変数で解決できません (${t})。ファイル出力は Write ツールを使ってください。`);
    }
    checkPath(rel(t), false);
  }
  process.exit(0);
}

process.exit(0);
