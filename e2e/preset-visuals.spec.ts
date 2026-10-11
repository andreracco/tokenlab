import { expect, test } from "@playwright/test";
import { gotoPreview } from "./helpers";

const presets = ["product", "editorial", "expressive"] as const;
const modes = ["light", "dark"] as const;

for (const preset of presets) {
  for (const mode of modes) {
    test(`${preset} preview in ${mode} mode`, async ({ page }) => {
      await gotoPreview(page);
      await expect(page.getByRole("status").filter({ hasText: "Saved locally" })).toBeVisible();
      await page.getByLabel("Starting system").selectOption(preset);
      await page.getByLabel("Preview mode").selectOption(mode);
      await page.getByLabel("Preview width").selectOption("720");
      await page.getByRole("button", { name: "Inspect", exact: true }).click();

      await expect(page.getByTestId("preview-root")).toHaveScreenshot(`${preset}-${mode}.png`, {
        maxDiffPixelRatio: 0.025,
      });
    });
  }
}
