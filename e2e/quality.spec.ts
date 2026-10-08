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
