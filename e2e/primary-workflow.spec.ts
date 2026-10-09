import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("edits, compares, and exports a token system", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "Saved locally" })).toBeVisible();

  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("button", { name: "Save first baseline" }).click();
  await page.getByRole("textbox", { name: "Snapshot name" }).fill("Before brand refresh");
  await page.getByRole("button", { name: "Save snapshot" }).click();
  await page.getByRole("button", { name: "Preview" }).click();

  await page.getByRole("textbox", { name: "Light value" }).fill("#C2415D");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByTestId("preview-root")).toHaveCSS("--tl-preview-action-primary-background", "#C2415D");
  await page.getByRole("button", { name: "Inspect", exact: true }).click();
  await page.getByRole("button", { name: "Create project; inspect action.primary.background" }).click();
  await expect(page.getByText("Primary button tokens")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Primary button selected" })).toBeAttached();

  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.getByText("1 token change")).toBeVisible();
  await expect(page.getByRole("region", { name: "Living Canvas" }).getByText("color.brand.600", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to history" }).click();

  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("heading", { name: "Production-ready token files" })).toBeVisible();
  await expect(page.getByText("tokenlab.css", { exact: true })).toBeVisible();
  await expect(page.getByText("tokenlab.project.json", { exact: true })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download tokenlab.css" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("tokenlab.css");
  const css = await readFile(await download.path(), "utf8");
  expect(css).toContain("--action-primary-background: var(--color-brand-600)");

  await page.setContent(`<style>${css}</style><button id="consumer" style="background:var(--action-primary-background);color:var(--action-primary-foreground);border-radius:var(--component-control-radius)">Create project</button>`);
  await expect(page.locator("#consumer")).toHaveCSS("background-color", "rgb(194, 65, 93)");
  await expect(page.locator("#consumer")).toHaveCSS("border-radius", "7px");
});
