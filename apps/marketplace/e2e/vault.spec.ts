import { expect, test, type Page } from "@playwright/test";

const password = "Synthetic-vault-password-2026";

async function register(page: Page, username: string) {
  await page.goto("/signup");
  await page.getByLabel("ユーザーID", { exact: true }).fill(username);
  await page.getByLabel("パスワード", { exact: true }).fill(password);
  await page.getByLabel("パスワード（確認）", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "アカウントを作成", exact: true })
    .click();
  await expect(page).toHaveURL(/\/vault$/);
}

async function addMaterial(page: Page, title: string) {
  await page.getByRole("link", { name: "＋ 教材を保存", exact: true }).click();
  await page.getByLabel("教材名", { exact: true }).fill(title);
  await page
    .getByLabel("概要", { exact: true })
    .fill("架空データを使う60分の教材です。");
  await page
    .getByLabel("進め方・メモ", { exact: true })
    .fill("導入、場面の分類、振り返り。");
  await page.getByLabel("タグ", { exact: true }).fill("報連相, 60分");
  await page
    .getByLabel("素材の権利・許可について（任意）", { exact: true })
    .fill("internal-rights-note-keep-private");
  await page.getByLabel("教材ファイルを追加", { exact: true }).setInputFiles({
    name: "lesson.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "© Fictional Example. 無断転載禁止。logoの利用条件は確認が必要。",
    ),
  });
  await page.getByRole("button", { name: "教材を保存", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
}

async function issueShare(page: Page) {
  await page
    .getByRole("checkbox", {
      name: "素材・権利の確認候補と共有される内容を確認しました。",
      exact: true,
    })
    .check();
  const link = page.locator('a[href^="/share/"]');
  const previous = (await link.count())
    ? await link.first().getAttribute("href")
    : null;
  await page
    .getByRole("button", { name: "閲覧リンクを発行", exact: true })
    .click();
  await expect(link.first()).toBeVisible();
  if (previous)
    await expect(link.first()).not.toHaveAttribute("href", previous);
  return (await link.first().getAttribute("href"))!;
}

test("個人教材の保存・添付・注意喚起・限定共有・取消・更新・再ログイン", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await register(page, "personal_tester");
  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === "spl_vault_session");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  await page.getByRole("link", { name: /個人の保管庫/ }).click();
  await expect(page).toHaveURL(/\/vault\/[^/]+$/);
  const vaultPath = new URL(page.url()).pathname;
  await addMaterial(page, "報連相の試用教材");
  const materialPath = new URL(page.url()).pathname;
  await expect(
    page.getByText("「無断転載」を検出しました。", { exact: false }),
  ).toBeVisible();
  const privateFilePath = (await page
    .locator('a[href^="/api/vault/"]')
    .first()
    .getAttribute("href"))!;
  const anonymous = await browser.newContext();
  const sharedPage = await anonymous.newPage();
  expect((await anonymous.request.get(privateFilePath)).status()).toBe(401);
  const sharePath = await issueShare(page);
  const response = await sharedPage.goto(sharePath);
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(
    sharedPage.getByRole("heading", { name: "報連相の試用教材", exact: true }),
  ).toBeVisible();
  await expect(sharedPage.locator("body")).not.toContainText(
    "internal-rights-note-keep-private",
  );
  await expect(sharedPage.locator("body")).not.toContainText(
    "素材・権利の確認候補",
  );
  const sharedFilePath = (await sharedPage
    .locator('a[href^="/api/share/"]')
    .first()
    .getAttribute("href"))!;
  const file = await anonymous.request.get(sharedFilePath);
  expect(file.status()).toBe(200);
  expect(file.headers()["content-disposition"]).toContain("attachment");
  expect(file.headers()["x-content-type-options"]).toBe("nosniff");
  expect(await file.text()).toContain("Fictional Example");
  await page
    .getByRole("button", { name: "このリンクを無効にする", exact: true })
    .click();
  await expect(
    page.getByText("リンク 1 · 無効", { exact: true }),
  ).toBeVisible();
  await sharedPage.reload();
  await expect(
    sharedPage.getByRole("heading", {
      name: "この共有リンクは利用できません",
      exact: true,
    }),
  ).toBeVisible();
  expect((await anonymous.request.get(sharedFilePath)).status()).toBe(404);
  const nextShare = await issueShare(page);
  await page.getByRole("link", { name: "教材を編集", exact: true }).click();
  await page
    .getByLabel("教材名", { exact: true })
    .fill("報連相の試用教材・改訂");
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "報連相の試用教材・改訂", exact: true }),
  ).toBeVisible();
  await sharedPage.goto(nextShare);
  await expect(
    sharedPage.getByRole("heading", {
      name: "この共有リンクは利用できません",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(vaultPath);
  await page
    .getByLabel("保管庫の中を検索", { exact: true })
    .fill("見つからない言葉");
  await page.getByRole("button", { name: "検索", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "条件に合う教材がありません",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "解除", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "報連相の試用教材・改訂", exact: true }),
  ).toBeVisible();
  await page.goto(materialPath);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/vault-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "ログアウト", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get(privateFilePath)).status()).toBe(401);
  await page.getByLabel("ユーザーID", { exact: true }).fill("personal_tester");
  await page.getByLabel("パスワード", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(page).toHaveURL(/\/vault$/);
  await page.goto(materialPath);
  await expect(
    page.getByRole("heading", { name: "報連相の試用教材・改訂", exact: true }),
  ).toBeVisible();
  await anonymous.close();
});

test("チーム招待・共同編集・除外によるアクセスと共有の失効", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await register(page, "team_owner");
  await page.getByLabel("保管庫名", { exact: true }).fill("架空の準備チーム");
  await page
    .getByRole("button", { name: "チーム保管庫を作成", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "架空の準備チーム", exact: true }),
  ).toBeVisible();
  const teamPath = new URL(page.url()).pathname;
  await addMaterial(page, "チーム教材");
  const materialPath = new URL(page.url()).pathname;
  const privateFilePath = (await page
    .locator('a[href^="/api/vault/"]')
    .first()
    .getAttribute("href"))!;
  const memberContext = await browser.newContext();
  const member = await memberContext.newPage();
  await register(member, "team_member");
  expect((await member.request.get(privateFilePath)).status()).toBe(404);
  await member.goto(materialPath);
  await expect(
    member.getByRole("heading", { name: "チーム教材", exact: true }),
  ).toHaveCount(0);
  await page.goto(teamPath);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByText("チームに招待", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/vault-team-mobile.png",
    fullPage: true,
  });
  await page
    .getByLabel("招待先のユーザーID", { exact: true })
    .fill("team_member");
  await page
    .getByRole("button", { name: "招待リンクを発行", exact: true })
    .click();
  const invitation = page.locator('a[href^="/invite/"]');
  await expect(invitation).toBeVisible();
  const invitePath = (await invitation.getAttribute("href"))!;
  await member.goto(invitePath);
  await member
    .getByRole("button", { name: "招待を受け取って参加", exact: true })
    .click();
  await expect(member).toHaveURL(new RegExp(`${teamPath}$`));
  await member
    .getByRole("link")
    .filter({
      has: member.getByRole("heading", { name: "チーム教材", exact: true }),
    })
    .click();
  expect((await member.request.get(privateFilePath)).status()).toBe(200);
  await member.getByRole("link", { name: "教材を編集", exact: true }).click();
  await member
    .getByLabel("教材名", { exact: true })
    .fill("チーム教材・共同編集済み");
  await member.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(
    member.getByRole("heading", {
      name: "チーム教材・共同編集済み",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(materialPath);
  const sharedPath = await issueShare(page);
  const readerContext = await browser.newContext();
  const reader = await readerContext.newPage();
  await reader.goto(sharedPath);
  await expect(
    reader.getByRole("heading", {
      name: "チーム教材・共同編集済み",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(teamPath);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "メンバーから外す", exact: true })
    .click();
  await expect(page.getByText("メンバー 1人", { exact: true })).toBeVisible();
  expect((await member.request.get(privateFilePath)).status()).toBe(404);
  await reader.reload();
  await expect(
    reader.getByRole("heading", {
      name: "この共有リンクは利用できません",
      exact: true,
    }),
  ).toBeVisible();
  await member.goto(invitePath);
  await member
    .getByRole("button", { name: "招待を受け取って参加", exact: true })
    .click();
  await expect(
    member.getByRole("alert").filter({ hasText: "招待リンクが無効" }),
  ).toBeVisible();
  await memberContext.close();
  await readerContext.close();
});
