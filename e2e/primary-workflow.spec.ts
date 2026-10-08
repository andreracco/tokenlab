import { expect, test } from "@playwright/test";

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
});
