import { expect, test } from "@playwright/test";

test("commits a preview edit within 100 ms", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "Saved locally" })).toBeVisible();
  await page.getByRole("textbox", { name: "Light value" }).fill("#C2415D");

  const result = await page.getByRole("button", { name: "Apply" }).evaluate(async (button) => {
    const start = performance.now();
    button.click();
    const preview = document.querySelector<HTMLElement>("[data-testid='preview-root']");
    while (preview && getComputedStyle(preview).getPropertyValue("--tl-preview-action-primary-background").trim() !== "#C2415D" && performance.now() - start < 100) {
      await new Promise(requestAnimationFrame);
    }
    return {
      elapsed: performance.now() - start,
      value: preview ? getComputedStyle(preview).getPropertyValue("--tl-preview-action-primary-background").trim() : "",
    };
  });

  expect(result.value).toBe("#C2415D");
  expect(result.elapsed).toBeLessThan(100);
});

test("honors reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const durations = await page.getByRole("button", { name: "Snapshot" }).evaluate((button) => {
    const style = getComputedStyle(button);
    return [Number.parseFloat(style.animationDuration), Number.parseFloat(style.transitionDuration)];
  });
  expect(durations).toEqual([0.00001, 0.00001]);
});
