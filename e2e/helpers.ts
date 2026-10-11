import { expect, type Page } from "@playwright/test";

/** The app opens on the System view; open the editable preview for tests that exercise it. */
export async function gotoPreview(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByText("Forma design system")).toBeHidden();
  await expect(page.getByTestId("preview-root")).toBeVisible();
}
