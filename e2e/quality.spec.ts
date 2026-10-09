import { expect, test } from "@playwright/test";

test("commits a preview edit within 100 ms", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "Saved locally" })).toBeVisible();
  await page.getByRole("textbox", { name: "Light value" }).fill("#C2415D");

  const result = await page.getByRole("button", { name: "Apply" }).evaluate(
    (button) =>
      new Promise<{ elapsed: number; value: string }>((resolve) => {
        const preview = document.querySelector<HTMLElement>("[data-testid='preview-root']");
        const start = performance.now();
        const finish = () => {
          observer.disconnect();
          window.clearTimeout(timeout);
          resolve({
            elapsed: performance.now() - start,
            value: preview
              ? getComputedStyle(preview)
                  .getPropertyValue("--tl-preview-action-primary-background")
                  .trim()
              : "",
          });
        };
        const observer = new MutationObserver(finish);
        if (preview) observer.observe(preview, { attributes: true, attributeFilter: ["style"] });
        const timeout = window.setTimeout(finish, 500);
        button.click();
      }),
  );

  expect(result.value).toBe("#C2415D");
  expect(result.elapsed).toBeLessThan(100);
});

test("honors reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const durations = await page.getByRole("button", { name: "Export" }).evaluate((button) => {
    const style = getComputedStyle(button);
    return [
      Number.parseFloat(style.animationDuration),
      Number.parseFloat(style.transitionDuration),
    ];
  });
  expect(durations).toEqual([0.00001, 0.00001]);
});

test("keeps tablet zoom layouts inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 936, height: 624 });
  await page.goto("/");

  const toolbarFits = await page
    .locator("main > section > div")
    .first()
    .evaluate((toolbar) => {
      const controls = toolbar.lastElementChild?.getBoundingClientRect();
      const bounds = toolbar.getBoundingClientRect();
      return Boolean(controls && controls.left >= bounds.left && controls.right <= bounds.right);
    });
  expect(toolbarFits).toBe(true);

  const selectChrome = await page.getByRole("combobox").evaluateAll((selects) =>
    selects.map((select) => {
      const style = getComputedStyle(select);
      return {
        appearance: style.appearance,
        backgroundImage: style.backgroundImage,
        paddingRight: style.paddingRight,
        hasChevron: Boolean(select.parentElement?.querySelector("svg")),
      };
    }),
  );
  expect(
    selectChrome.every(
      ({ appearance, backgroundImage, paddingRight, hasChevron }) =>
        appearance === "none" &&
        backgroundImage === "none" &&
        Number.parseFloat(paddingRight) >= 32 &&
        hasChevron,
    ),
  ).toBe(true);

  const previewTabX = await page
    .getByRole("button", { name: "Preview" })
    .evaluate((button) => button.getBoundingClientRect().x);
  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByRole("complementary", { name: "Token library" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Saved baselines" })).toBeVisible();
  const focusedView = await page.evaluate(() => {
    const panel = document
      .querySelector("main > section > div:last-child")
      ?.getBoundingClientRect();
    return {
      documentFits: document.documentElement.scrollWidth === document.documentElement.clientWidth,
      panelFits: Boolean(panel && panel.left >= 0 && panel.right <= window.innerWidth),
    };
  });
  expect(focusedView).toEqual({ documentFits: true, panelFits: true });
  const focusedPreviewTabX = await page
    .getByRole("button", { name: "Preview" })
    .evaluate((button) => button.getBoundingClientRect().x);
  expect(Math.abs(focusedPreviewTabX - previewTabX)).toBeLessThanOrEqual(1);
});

test("keeps project search and filters the same height across presets", async ({ page }) => {
  await page.goto("/");

  for (const preset of ["product", "editorial", "expressive"]) {
    await page.getByLabel("Starting system").selectOption(preset);
    const heights = await Promise.all([
      page
        .getByRole("textbox", { name: "Search projects" })
        .evaluate((input) => input.parentElement?.getBoundingClientRect().height),
      page
        .getByRole("combobox", { name: "Project status" })
        .evaluate((select) => select.getBoundingClientRect().height),
      page
        .getByRole("combobox", { name: "Project sort" })
        .evaluate((select) => select.getBoundingClientRect().height),
    ]);
    expect(heights).toEqual([34, 34, 34]);
  }
});

test("keeps the task count badge readable in dark mode", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Starting system").selectOption("expressive");
  await page.getByLabel("Preview mode").selectOption("dark");

  const badge = page.getByRole("button", { name: /My tasks/ }).locator("small");
  const contrast = await badge.evaluate((element) => {
    const parse = (value: string) =>
      value
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const luminance = (color: string) => {
      const channels = parse(color)
        .map((channel) => channel / 255)
        .map((channel) =>
          channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
        );
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const foreground = luminance(getComputedStyle(element).color);
    const background = luminance(getComputedStyle(element).backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });

  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test("applies and undoes a suggested contrast fix", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Starting system").selectOption("expressive");
  await page.getByLabel("Preview mode").selectOption("dark");
  await page.getByRole("button", { name: "Health" }).click();

  const applySuggestion = page.getByRole("button", { name: "Apply suggestion" });
  await expect(applySuggestion).toBeVisible();
  await expect(applySuggestion.locator("xpath=../..")).toContainText("color.neutral.panel");
  await expect(applySuggestion.locator("xpath=../..")).toContainText("6.34:1");
  await applySuggestion.click();

  const contrastChecks = page.getByRole("region", { name: "Contrast checks" });
  await expect(contrastChecks).toContainText("Passes 4.5:1");
  await expect(contrastChecks).toContainText("6.34:1");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(contrastChecks).toContainText("2.53:1");
});

test("guides a first CSS import and remembers the guide preference", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Import CSS" }).click();

  const guide = page.getByRole("region", { name: "From stylesheet to tokens" });
  await expect(guide.getByRole("listitem")).toHaveCount(3);
  await expect(guide).toContainText("never executed");
  await expect(guide).toContainText("one change");

  const expandedPaddingTop = await guide.evaluate(
    (element) => getComputedStyle(element).paddingTop,
  );
  await guide.getByRole("button", { name: "Hide guide" }).click();
  const collapsedPaddingTop = await guide.evaluate(
    (element) => getComputedStyle(element).paddingTop,
  );
  expect(collapsedPaddingTop).toBe(expandedPaddingTop);
  await page.reload();
  await page.getByRole("button", { name: "Import CSS" }).click();
  await expect(guide.getByRole("button", { name: "Show guide" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await guide.getByRole("button", { name: "Show guide" }).click();
  await expect(guide.getByRole("listitem")).toHaveCount(3);
  await page.setViewportSize({ width: 512, height: 760 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth === document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.getByLabel(/Choose a CSS file/i).setInputFiles({
    name: "brand.css",
    mimeType: "text/css",
    buffer: Buffer.from(":root { --color-brand-600: #c2415d; }"),
  });
  await expect(page.getByRole("button", { name: "Apply 1" })).toBeEnabled();
  await page.getByRole("button", { name: "Apply 1" }).click();
  await expect(page.getByRole("status").filter({ hasText: "one undo step" })).toContainText(
    "1 token change applied as one undo step",
  );
  await page.getByRole("button", { name: "Undo" }).click();
  await page.getByRole("button", { name: "Back to preview" }).click();
  await expect(page.getByTestId("preview-root")).toHaveCSS(
    "--tl-preview-action-primary-background",
    "#3157D5",
  );
});

test("rejects invalid and oversized CSS without changing the project", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Import CSS" }).click();
  const fileInput = page.locator('input[type="file"]');

  await fileInput.setInputFiles({
    name: "brand.css",
    mimeType: "text/css",
    buffer: Buffer.from(":root { --color-brand-600: #c2415d; }"),
  });
  await page.getByRole("button", { name: "Apply 1" }).click();
  await expect(page.getByRole("status").filter({ hasText: "one undo step" })).toContainText(
    "1 token change applied as one undo step",
  );

  await fileInput.setInputFiles({
    name: "invalid.css",
    mimeType: "text/css",
    buffer: Buffer.from("not CSS"),
  });
  await expect(page.getByRole("alert")).toContainText("No CSS rules were found");
  await expect(page.getByText("1 reusable values")).toBeVisible();

  await fileInput.setInputFiles({
    name: "oversized.css",
    mimeType: "text/css",
    buffer: Buffer.alloc(1024 * 1024 + 1, 97),
  });
  await expect(page.getByRole("alert")).toContainText("smaller than 1 MB");
  await expect(page.getByText("1 reusable values")).toBeVisible();

  await page.getByRole("button", { name: "Back to preview" }).click();
  await expect(page.getByTestId("preview-root")).toHaveCSS(
    "--tl-preview-action-primary-background",
    "#C2415D",
  );
});

test("keeps the active design system inspectable and responsive", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "System" }).click();

  await expect(page.getByRole("heading", { name: "From decision to interface." })).toBeVisible();
  await expect(page.getByText("4/4", { exact: true })).toBeVisible();
  expect(await page.locator("[data-select-control]").count()).toBe(
    await page.locator("select").count(),
  );
  const status = page.getByLabel("Status · default");
  await expect(status).toHaveValue("progress");
  await status.selectOption("complete");
  await expect(status).toHaveValue("complete");
  await expect(page.getByRole("checkbox", { name: "Email updates" })).toBeChecked();
  const unchecked = page.getByRole("checkbox", { name: "Product news" });
  await expect(unchecked).not.toBeChecked();
  await expect(unchecked).toHaveCSS("appearance", "none");
  await expect(page.getByRole("checkbox", { name: "Disabled option" })).toBeDisabled();
  await page.getByRole("radio", { name: "High priority" }).check();
  await expect(page.getByRole("radio", { name: "Standard" })).not.toBeChecked();
  await expect(page.getByRole("switch", { name: "Project reminders" })).toBeChecked();
  await page.getByRole("switch", { name: "Project reminders" }).uncheck();
  await expect(page.getByRole("switch", { name: "Project reminders" })).not.toBeChecked();
  await expect(page.getByLabel("Status · invalid")).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("button", { name: "Inspect color.neutral.canvas" }).click();
  await expect(
    page
      .getByRole("complementary", { name: "Token inspector" })
      .getByText("color.neutral.canvas", { exact: true }),
  ).toBeVisible();

  await page.setViewportSize({ width: 512, height: 760 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth === document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Canvas" }).click();
  await expect(page.getByRole("region", { name: "Design system" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth === document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("keeps History focused at high browser zoom", async ({ page }) => {
  await page.setViewportSize({ width: 512, height: 700 });
  await page.goto("/");
  await page.getByRole("button", { name: "History" }).click();

  await expect(page.getByRole("navigation", { name: "Canvas views" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Token library" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Saved baselines" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth === document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("keeps export cards readable across wide and narrow viewports", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("heading", { name: "Production-ready token files" })).toBeVisible();

  const wideCards = await page
    .locator("article")
    .filter({ has: page.getByRole("button", { name: /^Download tokenlab/ }) })
    .evaluateAll((cards) =>
      cards.map((card) => {
        const bounds = card.getBoundingClientRect();
        return { x: bounds.x, width: bounds.width };
      }),
    );
  expect(wideCards).toHaveLength(6);
  expect(Math.max(...wideCards.map(({ width }) => width))).toBeLessThan(380);
  expect(new Set(wideCards.slice(0, 3).map(({ x }) => Math.round(x))).size).toBe(3);

  await page.setViewportSize({ width: 512, height: 700 });
  const narrowCards = await page
    .locator("article")
    .filter({ has: page.getByRole("button", { name: /^Download tokenlab/ }) })
    .evaluateAll((cards) =>
      cards.map((card) => {
        const bounds = card.getBoundingClientRect();
        return { x: bounds.x, right: bounds.right };
      }),
    );
  expect(new Set(narrowCards.map(({ x }) => Math.round(x))).size).toBe(1);
  expect(narrowCards.every(({ x, right }) => x >= 0 && right <= 512)).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth === document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("keeps comparison actions reachable at high browser zoom", async ({ page }) => {
  await page.setViewportSize({ width: 512, height: 700 });
  await page.goto("/");
  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("button", { name: "Save first baseline" }).click();
  await page.getByRole("textbox", { name: "Snapshot name" }).fill("Zoom baseline");
  await page.getByRole("button", { name: "Save snapshot" }).click();
  await page.getByRole("button", { name: "Compare" }).click();

  await expect(page.getByRole("heading", { name: "Baseline and current system" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to history" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Restore baseline" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth === document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("summarizes release impact and downloads notes from a baseline comparison", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("button", { name: "Save first baseline" }).click();
  await page.getByRole("textbox", { name: "Snapshot name" }).fill("Before refresh");
  await page.getByRole("button", { name: "Save snapshot" }).click();
  await page.getByRole("button", { name: "Preview" }).click();
  await page.getByRole("textbox", { name: "Light value" }).fill("#C2415D");
  await page.getByRole("button", { name: "Apply" }).click();

  await page.setViewportSize({ width: 512, height: 700 });
  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.getByRole("heading", { name: "Patch bump recommended" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth === document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.getByText("Preview generated release notes").click();
  await expect(page.locator("details pre")).toContainText("Suggested version bump: PATCH");
  await expect(page.locator("details pre")).toContainText("color.brand.600");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download notes" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("tokenlab-release-notes.md");
});

test("keeps token categories and presets visible while the active category scrolls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 936, height: 624 });
  await page.goto("/");

  const tokenPanel = page.locator("aside[aria-label='Token library']");
  const openTokens = tokenPanel.getByRole("region", { name: "Foundations tokens" });
  const tokenRows = openTokens.locator(":scope > div");
  await expect(openTokens).toBeVisible();
  await expect
    .poll(() => tokenRows.evaluate((list) => list.scrollHeight > list.clientHeight))
    .toBe(true);
  await tokenRows.evaluate((list) => list.scrollTo(0, list.scrollHeight));

  const semanticSummary = tokenPanel.getByRole("button", { name: /Semantic/ });
  await semanticSummary.focus();
  await page.keyboard.press("Enter");
  await expect(semanticSummary).toHaveAttribute("aria-expanded", "true");
  await expect(tokenPanel.getByRole("button", { name: /Foundations/ })).toBeVisible();
  await expect(tokenPanel.getByRole("button", { name: /Feedback/ })).toBeVisible();
  await expect(tokenPanel.getByLabel("Starting system")).toBeVisible();
});
