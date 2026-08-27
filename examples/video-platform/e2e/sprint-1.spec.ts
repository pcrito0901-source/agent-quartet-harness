/**
 * Sprint 1 契約の実行可能版。
 * Evaluator が docs/sprints/sprint-1/contract.md から生成した。
 *
 * 契約条件 1件 = test() 1件。テスト名は契約IDで始める。
 * このファイルは Sprint 2 以降も毎回実行され、回帰を検出する。
 */
import { test, expect } from "@playwright/test";
import path from "node:path";

const FIXTURES = path.join(__dirname, "fixtures");

test("C1: トップページに動画一覧が表示される", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("article")).not.toHaveCount(0);
});

test("C2: 動画が0件のとき空状態メッセージが表示される", async ({ page }) => {
  await page.request.post("/api/test/reset");
  await page.goto("/");
  await expect(page.getByTestId("empty-state")).toBeVisible();
  await expect(page.getByTestId("empty-state")).toContainText("まだ動画がありません");
});

test("C3: /upload でファイル・タイトル・説明を入力して送信できる", async ({ page }) => {
  await page.goto("/upload");
  await page.getByLabel("動画ファイル").setInputFiles(path.join(FIXTURES, "sample.mp4"));
  await page.getByLabel("タイトル").fill("テスト動画");
  await page.getByLabel("説明").fill("E2E から投稿");
  await page.getByRole("button", { name: "アップロード" }).click();
  await expect(page).toHaveURL("/");
});

test("C4: アップロードした動画が一覧の先頭に表示される", async ({ page }) => {
  await page.goto("/upload");
  await page.getByLabel("動画ファイル").setInputFiles(path.join(FIXTURES, "sample.mp4"));
  await page.getByLabel("タイトル").fill("最新の動画");
  await page.getByRole("button", { name: "アップロード" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("article").first()).toContainText("最新の動画");
});

test("C5: タイトル未入力で送信するとバリデーションエラーが表示される", async ({ page }) => {
  await page.goto("/upload");
  await page.getByLabel("動画ファイル").setInputFiles(path.join(FIXTURES, "sample.mp4"));
  await page.getByRole("button", { name: "アップロード" }).click();
  await expect(page.getByRole("alert")).toContainText("タイトル");
});

test("C6: 一覧の動画をクリックすると再生ページに遷移する", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("article").first().click();
  await expect(page).toHaveURL(/\/watch\/\w+/);
});

test("C7: 再生ページで video 要素が再生可能な状態になる", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("article").first().click();
  const video = page.locator("video");
  await expect(video).toBeVisible();
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(1);
});

test("C8: 再生ページに戻るリンクがあり一覧に戻れる", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("article").first().click();
  await page.getByRole("link", { name: "一覧に戻る" }).click();
  await expect(page).toHaveURL("/");
});

test("C9: 100MBを超えるファイルは拒否され理由が表示される", async ({ page }) => {
  await page.goto("/upload");
  await page.getByLabel("動画ファイル").setInputFiles(path.join(FIXTURES, "oversized.mp4"));
  await page.getByLabel("タイトル").fill("大きすぎる動画");
  await page.getByRole("button", { name: "アップロード" }).click();
  await expect(page.getByRole("alert")).toContainText("ファイルサイズ");
});
