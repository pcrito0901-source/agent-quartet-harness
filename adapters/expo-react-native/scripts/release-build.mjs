#!/usr/bin/env node
/**
 * ビルドの台本（EAS ・ iOS）—— ビルド番号を引数に取る、1本だけの台本。
 *
 *   node scripts/release-build.mjs --build 27 --tree <合格のコミット> [--submit] [--expect-mb 250-350] [--dry-run]
 *
 * なぜ1本か:
 *   ビルドごとに台本をコピーして番号を書き換えると、置換漏れが起きる。
 *   実運用で、前回のログを今回の結果として表示していた（判定そのものは正しかったが、記録が信用できなくなった）。
 *   この台本は、作業フォルダ ・ ログ ・ タグの名を、すべて --build の番号から作る。手で書き換える所は無い。
 *
 * すること（どこかで落ちたら、そこで止まる）:
 *   1. 番号が未使用か確かめる（タグ testflight/<n> と build-logs/build-<n>/ が無いこと）
 *   2. まっさらな git worktree を ../<リポジトリ名>-build-<n> に作り、node_modules を本体へのジャンクションで置く
 *   3. npm run build:gate があれば通す（1段でも落ちたら出さない）
 *   4. アーカイブをアップロードせずに作り、大きさを測る（--expect-mb の範囲の外なら止める）
 *   5. eas build を「完了まで待つ形」で打つ（--no-wait は使わない）
 *   6. --submit のときだけ、そのビルドの ID を名指して eas submit し、タグ testflight/<n> を打つ
 *   7. ジャンクションを先に外し、本体の node_modules が無事か確かめてから worktree を外す
 *
 * しないこと: 審査への提出（submit-for-review の族）・ 支払い ・ アカウントの操作。
 * 打つのはオーケストレーターだけ。常設の承認の範囲の外なら、打つ前にユーザーに仰ぐ。
 * 長くかかるので、background で走らせて完了の通知を受ける（見張りは1つ）。
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// ---- 引数 ----
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const n = Number(opt("build"));
const tree = opt("tree");
const submit = flag("submit");
const dryRun = flag("dry-run");
const platform = opt("platform") ?? "ios";
const profile = opt("profile") ?? "production";
const expectMb = opt("expect-mb");

class Stop extends Error {}
// process.exit は finally を飛ばすので、止めるときは投げて、片付けの後に終わる
const die = (msg) => {
  throw new Stop(msg);
};
const fail = (msg) => {
  console.error(`[release-build ${Number.isInteger(n) ? n : "?"}] 止めた: ${msg}`);
  process.exitCode = 1;
};

if (!Number.isInteger(n) || n <= 0) {
  fail("--build <正の整数> が要る");
  process.exit();
}
if (!tree) {
  fail("--tree <合格のコミット> が要る（作業中のフォルダからは出さない）");
  process.exit();
}

// ---- 道具 ----
const isWin = process.platform === "win32";
const q = (s) => (/[\s"]/.test(s) ? `"${String(s).replace(/"/g, '\\"')}"` : s);

function run(cmd, args, { cwd, capture = false, allowFail = false } = {}) {
  const line = [cmd, ...args].map(q).join(" ");
  console.log(`$ ${line}${cwd ? `   （場所: ${cwd}）` : ""}`);
  if (dryRun) return { status: 0, stdout: "", stderr: "" };
  // npx / npm は Windows では .cmd なので殻を通す。git は殻を通さない（cmd では ^ が消える）
  const viaShell = isWin && (cmd === "npx" || cmd === "npm");
  const res = spawnSync(viaShell ? line : cmd, viaShell ? [] : args, {
    cwd,
    shell: viaShell,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (res.status !== 0 && !allowFail) {
    if (capture) process.stderr.write(res.stderr ?? "");
    die(`${cmd} ${args[0] ?? ""} が終了コード ${res.status} で落ちた`);
  }
  return res;
}

const git = (args, opts) => run("git", args, { capture: true, ...opts });

function dirSizeMb(dir) {
  let total = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) walk(p);
      else total += fs.statSync(p).size;
    }
  };
  walk(dir);
  return total / 1024 / 1024;
}

function main() {
  // ---- 名はすべて番号から作る ----
  const repoRoot = (spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).stdout ?? "").trim();
  if (!repoRoot) die("git のリポジトリの中で打つこと");
  const repoName = path.basename(repoRoot);
  const worktree = path.resolve(repoRoot, "..", `${repoName}-build-${n}`);
  const logDir = path.join(repoRoot, "build-logs", `build-${n}`);
  const tag = `testflight/${n}`;
  const startedAt = new Date();

  console.log(`ビルド ${n} ・ 木 ${tree} ・ ${platform}/${profile}${submit ? " ・ 送信あり" : ""}${dryRun ? " ・ 試し（何も打たない）" : ""}`);

  // 1. 番号が未使用か
  const commit = git(["rev-parse", "--verify", `${tree}^{commit}`]).stdout.trim() || tree;
  if (!dryRun && git(["tag", "--list", tag]).stdout.trim()) die(`タグ ${tag} が既にある（番号の使い回し）`);
  if (!dryRun && fs.existsSync(logDir)) die(`${logDir} が既にある（前の走行のログと混ぜない）`);
  if (!dryRun && fs.existsSync(worktree)) die(`${worktree} が既にある（前の作業フォルダを片付けてから）`);
  if (!dryRun) fs.mkdirSync(logDir, { recursive: true });

  // 2. まっさらな worktree
  run("git", ["worktree", "add", "--detach", worktree, commit]);
  const nm = path.join(worktree, "node_modules");
  const mainNm = path.join(repoRoot, "node_modules");

  const cleanup = () => {
    console.log("片付け: ジャンクションを先に外す → 本体の node_modules を確かめる → worktree を外す");
    if (dryRun) return;
    try {
      if (fs.lstatSync(nm).isSymbolicLink()) {
        try {
          fs.unlinkSync(nm);
        } catch {
          fs.rmdirSync(nm); // 再帰しない。リンクだけを外す
        }
      }
    } catch {
      /* 無ければよい */
    }
    if (!fs.existsSync(path.join(mainNm, ".bin"))) {
      console.error("本体の node_modules が見えない。worktree は外さずに止める。手で確かめること");
      return;
    }
    run("git", ["worktree", "remove", worktree], { allowFail: true });
  };

  const summary = { build: n, tree: commit, platform, profile, startedAt: startedAt.toISOString(), logDir };
  try {
    console.log(`node_modules → ${mainNm}（${isWin ? "ジャンクション" : "シンボリックリンク"}）`);
    if (!dryRun) fs.symlinkSync(mainNm, nm, isWin ? "junction" : "dir");

    // 3. 一括検査
    const pkg = JSON.parse(fs.readFileSync(path.join(dryRun ? repoRoot : worktree, "package.json"), "utf8"));
    if (pkg.scripts?.["build:gate"]) run("npm", ["run", "build:gate"], { cwd: worktree });
    else console.log("build:gate が無い。一括検査なしで進む（runbook に段を書いて足すこと）");

    // 4. アーカイブの大きさ
    const archiveDir = path.join(logDir, "archive");
    run("npx", ["eas-cli", "build:inspect", "--platform", platform, "--profile", profile, "--stage", "archive", "--output", archiveDir], { cwd: worktree });
    if (!dryRun) {
      const mb = dirSizeMb(archiveDir);
      summary.archiveMb = Math.round(mb);
      console.log(`アーカイブ: ${summary.archiveMb} MB`);
      if (expectMb) {
        const [lo, hi] = expectMb.split("-").map(Number);
        if (!(mb >= lo && mb <= hi)) die(`アーカイブ ${summary.archiveMb} MB が範囲 ${expectMb} MB の外。${archiveDir} の中を見ること`);
      }
      fs.rmSync(archiveDir, { recursive: true, force: true });
    }

    // 5. ビルド（完了まで待つ形）
    const build = run("npx", ["eas-cli", "build", "--platform", platform, "--profile", profile, "--non-interactive", "--json"], { cwd: worktree, capture: true });
    if (!dryRun) {
      fs.writeFileSync(path.join(logDir, "build.log"), `${build.stdout}\n--- stderr ---\n${build.stderr}`);
      const info = JSON.parse(build.stdout.slice(build.stdout.indexOf("[")))[0];
      summary.buildId = info.id;
      summary.appBuildVersion = info.appBuildVersion;
      summary.status = info.status;
      if (String(info.appBuildVersion) !== String(n)) {
        die(`EAS のビルド番号 ${info.appBuildVersion} が --build ${n} と違う。送信しない（番号の付け方を runbook と突き合わせること）`);
      }
    }

    // 6. 送信とタグ
    if (submit) {
      run("npx", ["eas-cli", "submit", "--platform", platform, "--id", summary.buildId ?? "<buildId>", "--non-interactive"], { cwd: worktree });
      const day = startedAt.toISOString().slice(0, 10);
      run("git", ["tag", "-a", tag, commit, "-m", `sent ${day}`]);
      summary.tag = tag;
    }
  } finally {
    cleanup();
    if (!dryRun) {
      summary.finishedAt = new Date().toISOString();
      fs.writeFileSync(path.join(logDir, "summary.json"), JSON.stringify(summary, null, 2));
    }
  }

  // この走行で作ったファイルだけを読んで報告する（前の走行のログを読まない）
  console.log(`\nビルド ${n} の結果（${path.relative(repoRoot, logDir) || logDir}）`);
  console.log(JSON.stringify(summary, null, 2));
  console.log("status.md の台帳に書くもの: ビルド番号 ・ 木 ・ タグ ・ 費用 ・ 月の枠の残り");
}

try {
  main();
} catch (e) {
  if (e instanceof Stop) fail(e.message);
  else throw e;
}
