import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("edits, compares, and exports a token system", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "Saved locally" })).toBeVisible();

  await page.getByRole("button", { name: "Snapshot" }).click();
  await page.getByRole("textbox", { name: "Snapshot name" }).fill("Before brand refresh");
  await page.getByRole("button", { name: "Save snapshot" }).click();

  await page.getByRole("textbox", { name: "Light value" }).fill("#C2415D");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByTestId("preview-root")).toHaveCSS("--tl-preview-action-primary-background", "#C2415D");

  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.getByText("1 token changes")).toBeVisible();
  await expect(page.getByRole("region", { name: "Living Canvas" }).getByText("color.brand.600", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("heading", { name: "Production-ready token files" })).toBeVisible();
  await expect(page.getByText("tokenlab.css", { exact: true })).toBeVisible();
  await expect(page.getByText("tokenlab.project.json", { exact: true })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByText("tokenlab.css", { exact: true }).locator("..").getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("tokenlab.css");
  await expect.poll(async () => readFile(await download.path(), "utf8")).toContain("--action-primary-background: var(--color-brand-600)");
});
