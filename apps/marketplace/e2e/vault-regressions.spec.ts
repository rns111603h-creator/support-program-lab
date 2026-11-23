import { expect, test, type Page } from "@playwright/test";

const password = "Synthetic-regression-password-2026";
const consentLabel = "素材・権利の確認候補と共有される内容を確認しました。";

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

async function openPersonalVault(page: Page) {
  await page.getByRole("link", { name: /個人の保管庫/ }).click();
  await expect(page).toHaveURL(/\/vault\/[^/]+$/);
}

async function addMaterial(page: Page, title: string, body: string) {
  await page.getByRole("link", { name: "＋ 教材を保存", exact: true }).click();
  await page.getByLabel("教材名", { exact: true }).fill(title);
  await page.getByLabel(/^進め方・メモ/).fill(body);
  await page
    .getByLabel("素材の権利・許可について（任意）", { exact: true })
    .fill("架空データ。文章は自作です。");
  await page.getByRole("button", { name: "教材を保存", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  return new URL(page.url()).pathname;
}

async function editMaterial(
  page: Page,
  path: string,
  title: string,
  body: string,
) {
  await page.goto(path);
  await page.getByRole("link", { name: "教材を編集", exact: true }).click();
  await page.getByLabel("教材名", { exact: true }).fill(title);
  await page.getByLabel(/^進め方・メモ/).fill(body);
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
}

async function issueShare(page: Page) {
  await page.getByRole("checkbox", { name: consentLabel, exact: true }).check();
  await page
    .getByRole("button", { name: "閲覧リンクを発行", exact: true })
    .click();
  const link = page.locator('a[href^="/share/"]');
  await expect(link).toBeVisible();
  return (await link.getAttribute("href"))!;
}

test("別タブでログアウト・別ユーザーへ切替後、履歴から前の個人教材を表示しない", async ({
  page,
  browser,
}) => {
  const title = "前の利用者だけの架空教材";
  const privateBody = "PRIVATE-ACCOUNT-A-FICTIONAL-CONTENT";
  await register(page, "regression_account_a");
  await openPersonalVault(page);
  const materialPath = await addMaterial(page, title, privateBody);

  const otherUserContext = await browser.newContext();
  try {
    await register(await otherUserContext.newPage(), "regression_account_b");
  } finally {
    await otherUserContext.close();
  }

  // This client navigation puts the private document in this tab's Router Cache.
  await page.getByRole("link", { name: "保管庫", exact: true }).click();
  await expect(page).toHaveURL(/\/vault$/);
  const switchTab = await page.context().newPage();
  await switchTab.goto("/vault");
  await switchTab
    .getByRole("button", { name: "ログアウト", exact: true })
    .click();
  await expect(switchTab).toHaveURL(/\/login$/);
  await switchTab
    .getByLabel("ユーザーID", { exact: true })
    .fill("regression_account_b");
  await switchTab.getByLabel("パスワード", { exact: true }).fill(password);
  await switchTab
    .getByRole("button", { name: "ログイン", exact: true })
    .click();
  await expect(switchTab).toHaveURL(/\/vault$/);
  expect((await page.request.get(materialPath)).status()).toBe(404);

  await page.bringToFront();
  await page.goBack();
  await expect(page.locator("body")).not.toContainText(privateBody, {
    timeout: 5_000,
  });
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("regression_account_a");
});

test("チームから除外された後、履歴からチーム教材を再表示しない", async ({
  page,
  browser,
}) => {
  const teamName = "架空の履歴検証チーム";
  const title = "除外後は表示しない架空教材";
  const privateBody = "PRIVATE-TEAM-FICTIONAL-CONTENT";
  await register(page, "regression_team_owner");
  await page.getByLabel("保管庫名", { exact: true }).fill(teamName);
  await page
    .getByRole("button", { name: "チーム保管庫を作成", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: teamName, exact: true }),
  ).toBeVisible();
  const teamPath = new URL(page.url()).pathname;
  const materialPath = await addMaterial(page, title, privateBody);
  const memberContext = await browser.newContext();
  try {
    const member = await memberContext.newPage();
    await register(member, "regression_team_member");
    await page.goto(teamPath);
    await page
      .getByLabel("招待先のユーザーID", { exact: true })
      .fill("regression_team_member");
    await page
      .getByRole("button", { name: "招待リンクを発行", exact: true })
      .click();
    const invitation = page.locator('a[href^="/invite/"]');
    await expect(invitation).toBeVisible();
    await member.goto((await invitation.getAttribute("href"))!);
    await member
      .getByRole("button", { name: "招待を受け取って参加", exact: true })
      .click();
    await expect(member).toHaveURL(new RegExp(`${teamPath}$`));
    await member
      .getByRole("link")
      .filter({
        has: member.getByRole("heading", { name: title, exact: true }),
      })
      .click();
    await expect(member).toHaveURL(new RegExp(`${materialPath}$`));
    await member
      .getByRole("link", { name: `← ${teamName}`, exact: true })
      .click();
    await expect(member).toHaveURL(new RegExp(`${teamPath}$`));

    await page.reload();
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "メンバーから外す", exact: true })
      .click();
    await expect(page.getByText("メンバー 1人", { exact: true })).toBeVisible();
    expect((await member.request.get(materialPath)).status()).toBe(404);

    await member.bringToFront();
    await member.goBack();
    await expect(member.locator("body")).not.toContainText(privateBody, {
      timeout: 5_000,
    });
    await expect(
      member.getByRole("heading", { name: title, exact: true }),
    ).toHaveCount(0);
  } finally {
    await memberContext.close();
  }
});

test("古い削除画面から別タブで更新済みの教材を削除できない", async ({
  page,
}) => {
  await register(page, "regression_stale_delete");
  await openPersonalVault(page);
  const materialPath = await addMaterial(
    page,
    "削除確認時の架空教材",
    "OLD-DELETE-FICTIONAL-CONTENT",
  );
  await page.getByText("教材を削除する", { exact: true }).click();
  const editor = await page.context().newPage();
  await editMaterial(
    editor,
    materialPath,
    "別タブで更新した架空教材",
    "LATEST-DELETE-FICTIONAL-CONTENT",
  );

  page.once("dialog", (dialog) => dialog.accept());
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === materialPath,
    ),
    page.getByRole("button", { name: "教材を削除", exact: true }).click(),
  ]);
  await expect
    .soft(page.getByRole("alert").filter({ hasText: "更新されています" }))
    .toBeVisible({ timeout: 5_000 });
  const response = await editor.goto(materialPath);
  expect(response?.status()).toBe(200);
  await expect(editor.locator("body")).toContainText(
    "LATEST-DELETE-FICTIONAL-CONTENT",
  );
});

test("別タブ更新をRSCで反映すると共有確認と旧リンク表示をリセットする", async ({
  page,
}) => {
  await register(page, "regression_share_consent");
  await openPersonalVault(page);
  const materialPath = await addMaterial(
    page,
    "共有確認時の架空教材",
    "OLD-SHARE-FICTIONAL-CONTENT",
  );
  const oldLink = await issueShare(page);
  await page.getByRole("checkbox", { name: consentLabel, exact: true }).check();
  const editor = await page.context().newPage();
  await editMaterial(
    editor,
    materialPath,
    "再確認が必要な架空教材",
    "LATEST-SHARE-FICTIONAL-CONTENT",
  );

  // A different action refreshes this stale RSC tree without replacing the route.
  await page
    .getByRole("button", { name: "このリンクを無効にする", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "再確認が必要な架空教材", exact: true }),
  ).toBeVisible();
  const checkbox = page.getByRole("checkbox", {
    name: consentLabel,
    exact: true,
  });
  await expect.soft(checkbox).not.toBeChecked({ timeout: 3_000 });
  await expect
    .soft(page.locator(`a[href="${oldLink}"]`))
    .toHaveCount(0, { timeout: 3_000 });

  await page
    .getByRole("button", { name: "閲覧リンクを発行", exact: true })
    .click();
  await expect(page.locator('a[href^="/share/"]')).toHaveCount(0, {
    timeout: 3_000,
  });
  await checkbox.check();
  await page
    .getByRole("button", { name: "閲覧リンクを発行", exact: true })
    .click();
  await expect(page.locator('a[href^="/share/"]')).toBeVisible();
});

// Additional validation of the new boundary, separate from the four original RED cases.
test("権限再確認の通信失敗後も、再試行で未保存の編集内容を保持する", async ({
  page,
}) => {
  await register(page, "regression_access_retry");
  await openPersonalVault(page);
  await addMaterial(
    page,
    "通信復帰を確認する架空教材",
    "SAVED-FICTIONAL-CONTENT",
  );
  await page.getByRole("link", { name: "教材を編集", exact: true }).click();
  const body = page.getByLabel(/^進め方・メモ/);
  const unsaved = "UNSAVED-FICTIONAL-EDIT-KEEP-AFTER-RETRY";
  await expect(body).toBeVisible();
  await body.fill(unsaved);

  const accessRoute = /\/api\/vault\/access(?:\?|$)/;
  let failedAccessRequests = 0;
  await page.route(accessRoute, async (route) => {
    failedAccessRequests++;
    await route.abort("failed");
  });
  const otherTab = await page.context().newPage();
  try {
    await otherTab.goto("/");
    await otherTab.bringToFront();
    await page.bringToFront();
    // Headless tab activation does not reliably deliver an OS focus event.
    // Exercise the focus handler explicitly, then fail the real access fetch.
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => failedAccessRequests).toBeGreaterThan(0);
    await expect(
      page.getByText(
        "権限を確認できないため、教材を隠しています。通信状態を確認して再試行してください。",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(body).toBeHidden();
    await expect(
      page.locator("[hidden][inert]").filter({ has: body }),
    ).toHaveCount(1);

    await page.unroute(accessRoute);
    await page.getByRole("button", { name: "再試行", exact: true }).click();
    await expect(body).toBeVisible();
    await expect(body).toHaveValue(unsaved);
  } finally {
    await page.unroute(accessRoute);
    await otherTab.close();
  }
});
