import { expect, test } from "@playwright/test";

test("commits a preview edit within 100 ms", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "Saved locally" })).toBeVisible();
  await page.getByRole("textbox", { name: "Light value" }).fill("#C2415D");

  const result = await page.getByRole("button", { name: "Apply" }).evaluate((button) => new Promise<{ elapsed: number; value: string }>((resolve) => {
    const preview = document.querySelector<HTMLElement>("[data-testid='preview-root']");
    const start = performance.now();
    const finish = () => {
      observer.disconnect();
      window.clearTimeout(timeout);
      resolve({
        elapsed: performance.now() - start,
        value: preview ? getComputedStyle(preview).getPropertyValue("--tl-preview-action-primary-background").trim() : "",
      });
    };
    const observer = new MutationObserver(finish);
    if (preview) observer.observe(preview, { attributes: true, attributeFilter: ["style"] });
    const timeout = window.setTimeout(finish, 500);
    button.click();
  }));

  expect(result.value).toBe("#C2415D");
  expect(result.elapsed).toBeLessThan(100);
});

test("honors reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const durations = await page.getByRole("button", { name: "Export" }).evaluate((button) => {
    const style = getComputedStyle(button);
    return [Number.parseFloat(style.animationDuration), Number.parseFloat(style.transitionDuration)];
  });
  expect(durations).toEqual([0.00001, 0.00001]);
});

test("keeps tablet zoom layouts inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 936, height: 624 });
  await page.goto("/");

  const toolbarFits = await page.locator("main > section > div").first().evaluate((toolbar) => {
    const controls = toolbar.lastElementChild?.getBoundingClientRect();
    const bounds = toolbar.getBoundingClientRect();
    return Boolean(controls && controls.left >= bounds.left && controls.right <= bounds.right);
  });
  expect(toolbarFits).toBe(true);

  const selectChrome = await page.getByRole("combobox").evaluateAll((selects) => selects.map((select) => {
    const style = getComputedStyle(select);
    return { appearance: style.appearance, backgroundPosition: style.backgroundPosition, paddingRight: style.paddingRight };
  }));
  expect(selectChrome.every(({ appearance, backgroundPosition, paddingRight }) => appearance === "none" && backgroundPosition === "calc(100% - 10px) 50%" && paddingRight === "32px")).toBe(true);

  const previewTabX = await page.getByRole("button", { name: "Preview" }).evaluate((button) => button.getBoundingClientRect().x);
  await page.getByRole("button", { name: "History" }).click();
  const focusedView = await page.evaluate(() => {
    const panel = document.querySelector("main > section > div:last-child")?.getBoundingClientRect();
    return {
      documentFits: document.documentElement.scrollWidth === document.documentElement.clientWidth,
      panelFits: Boolean(panel && panel.left >= 0 && panel.right <= window.innerWidth),
    };
  });
  expect(focusedView).toEqual({ documentFits: true, panelFits: true });
  const focusedPreviewTabX = await page.getByRole("button", { name: "Preview" }).evaluate((button) => button.getBoundingClientRect().x);
  expect(Math.abs(focusedPreviewTabX - previewTabX)).toBeLessThanOrEqual(1);
});

test("keeps token categories and presets visible while the active category scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 936, height: 624 });
  await page.goto("/");

  const tokenPanel = page.locator("aside[aria-label='Token library']");
  const openTokens = tokenPanel.getByRole("region", { name: "Foundations tokens" });
  await expect(openTokens).toBeVisible();
  expect(await openTokens.evaluate((list) => list.scrollHeight > list.clientHeight)).toBe(true);

  const semanticSummary = tokenPanel.getByRole("button", { name: /Semantic/ });
  await semanticSummary.focus();
  await page.keyboard.press("Enter");
  await expect(semanticSummary).toHaveAttribute("aria-expanded", "true");
  await expect(tokenPanel.getByRole("button", { name: /Foundations/ })).toBeVisible();
  await expect(tokenPanel.getByRole("button", { name: /Feedback/ })).toBeVisible();
  await expect(tokenPanel.getByLabel("Starting system")).toBeVisible();
});
