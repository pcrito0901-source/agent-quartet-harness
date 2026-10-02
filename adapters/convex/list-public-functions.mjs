#!/usr/bin/env node
/**
 * Convex の公開の入口を列挙する（読むだけ。何も書き換えない）。
 *
 *   node docs/adapters/convex/list-public-functions.mjs [convex のディレクトリ（既定: convex）]
 *        [--auth <正規表現>]   認証の手がかりの型（既定に足す。例: "requireMember|checkSession"）
 *        [--gate <正規表現>]   開発用の関門の手がかりの型（既定に足す）
 *
 * `/release-check` のセキュリティ点検の「入口の一覧」の下書きを作る。
 * **出すのは字の上の手がかりであって、証拠ではない。** 各行を人（またはレビュー用のスキル）が開いて確かめる。
 *
 * 見るもの:
 *   - export された query / mutation / action / httpAction（公開）と internal*（内部）
 *   - 公開の関数の本文に、認証の手がかり（getUserIdentity ・ getAuthUserId ・ require〜User／Access／Owner〜 などの呼び出し）があるか
 *   - 公開の関数の本文に、開発用の関門の手がかり（process.env.* ・ 〜Dev〜 の関門の呼び出し）があるか
 *   - crons.ts が api.*（公開）を呼んでいないか（定期処理は internal.* から呼ぶ）
 */
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const positional = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
const dir = path.resolve(positional[0] ?? "convex");
if (!fs.existsSync(dir)) {
  console.error(`${dir} が無い`);
  process.exit(1);
}

const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "_generated" || e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|js|mjs)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) files.push(p);
  }
};
walk(dir);

const KINDS = /export\s+const\s+(\w+)\s*=\s*(query|mutation|action|httpAction|internalQuery|internalMutation|internalAction)\s*\(/g;
const AUTH = new RegExp(
  [
    /getUserIdentity|getAuthUserId/.source,
    /\b(?:require|assert|ensure|check)\w*(?:User|Auth|Access|Owner|Member|Session)\w*\(/.source,
    opt("auth"),
  ]
    .filter(Boolean)
    .join("|"),
);
const DEVGATE = new RegExp(
  [/process\.env\.\w+/.source, /\b(?:require|assert|ensure|check)\w*Dev\w*(?=\()/.source, opt("gate")].filter(Boolean).join("|"),
  "g",
);

const rows = [];
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const hits = [...src.matchAll(KINDS)];
  hits.forEach((m, i) => {
    const body = src.slice(m.index, i + 1 < hits.length ? hits[i + 1].index : src.length);
    const kind = m[2];
    const isPublic = !kind.startsWith("internal");
    const mod = path.relative(dir, file).replace(/\\/g, "/").replace(/\.(ts|js|mjs)$/, "");
    rows.push({
      name: `${mod}:${m[1]}`,
      kind,
      isPublic,
      auth: isPublic ? (AUTH.test(body) ? "手がかりあり" : "**無し**") : "-",
      gate: isPublic ? [...new Set([...body.matchAll(DEVGATE)].map((g) => g[0]))].join(" ") || "-" : "-",
    });
  });
}

const pub = rows.filter((r) => r.isPublic);
console.log(`# 公開の入口の一覧（下書き ・ ${new Date().toISOString().slice(0, 10)}）\n`);
console.log(`公開 ${pub.length} 本 ・ 内部 ${rows.length - pub.length} 本 ・ 認証の手がかりが無い公開 ${pub.filter((r) => r.auth === "**無し**").length} 本\n`);
console.log("| 入口 | 種類 | 認証の手がかり | 開発用の関門の手がかり | 確かめた結果（人が書く） |");
console.log("|---|---|---|---|---|");
// 認証も関門も手がかりが無いもの → 関門だけのもの → 認証の手がかりがあるもの の順（危ない順）
const rank = (r) => (r.auth === "**無し**" ? (r.gate === "-" ? 0 : 1) : 2);
for (const r of pub.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))) {
  console.log(`| \`${r.name}\` | ${r.kind} | ${r.auth} | ${r.gate === "-" ? "-" : `\`${r.gate}\``} | |`);
}

const crons = files.find((f) => /(^|[\\/])crons\.(ts|js)$/.test(f));
if (crons) {
  const src = fs.readFileSync(crons, "utf8");
  const publicCalls = [...src.matchAll(/\bapi\.[\w.]+/g)].map((m) => m[0]);
  console.log(`\n## 定期処理（${path.relative(dir, crons)}）\n`);
  console.log(publicCalls.length ? `**公開の入口を呼んでいる**: ${[...new Set(publicCalls)].join(" ・ ")} → internal.* に移す` : "公開の入口を呼んでいない（internal.* だけ）");
}

console.log("\n> 字の上の手がかりであって証拠ではない。「認証の手がかりあり」でも、持ち主やメンバーの照合が抜けていることがある。");
console.log("> 各行を開いて、ログインなしで呼んだら何が返るかを確かめ、右の列に書く。");
