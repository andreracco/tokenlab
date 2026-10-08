import { expect, test } from "@playwright/test";

const editedBrand = "#C2415D";

test("persists committed edits across reloads", async ({ page }) => {
  await page.goto("/");
  const status = page.getByRole("status").filter({ hasText: /Saved locally|Saving…/ });
  await expect(status).toContainText("Saved locally");

  await page.getByRole("textbox", { name: "Light value" }).fill(editedBrand);
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(status).toContainText("Saving…");
  await expect(status).toContainText("Saved locally");
  await page.reload();

  await expect(status).toContainText("Saved locally");
  await expect(page.getByRole("textbox", { name: "Light value" })).toHaveValue(editedBrand);
  await expect(page.getByTestId("preview-root")).toHaveCSS("--tl-preview-action-primary-background", editedBrand);
});

test("restores a snapshot as one undoable action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "Saved locally" })).toBeVisible();
  await page.getByRole("button", { name: "Snapshot" }).click();
  await page.getByRole("textbox", { name: "Snapshot name" }).fill("Original brand");
  await page.getByRole("button", { name: "Save snapshot" }).click();

  await page.getByRole("textbox", { name: "Light value" }).fill(editedBrand);
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("button", { name: "Compare" }).click();
  await page.getByRole("button", { name: "Restore baseline" }).click();
  await expect(page.getByTestId("preview-root")).toHaveCSS("--tl-preview-action-primary-background", "#3157D5");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("preview-root")).toHaveCSS("--tl-preview-action-primary-background", editedBrand);
});

test("retains the current project after a malformed import and permits retry", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "Saved locally" })).toBeVisible();
  await page.getByRole("textbox", { name: "Light value" }).fill(editedBrand);
  await page.getByRole("button", { name: "Apply" }).click();
  const malformedFile = { name: "broken.json", mimeType: "application/json", buffer: Buffer.from("{") };

  await page.getByRole("button", { name: "Export" }).click();
  await page.getByLabel("Import TokenLab project").setInputFiles(malformedFile);
  await expect(page.getByText("Project file is not valid JSON.")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByTestId("preview-root")).toHaveCSS("--tl-preview-action-primary-background", editedBrand);

  await page.getByRole("button", { name: "Export" }).click();
  await page.getByLabel("Import TokenLab project").setInputFiles(malformedFile);
  await expect(page.getByText("Project file is not valid JSON.")).toBeVisible();
});
