import { expect, test } from "@playwright/test";

test("supports the core edit and dialog flow from the keyboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "Saved locally" })).toBeVisible();

  const valueInput = page.getByRole("textbox", { name: "Light value" });
  await valueInput.focus();
  await valueInput.fill("#C2415D");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("preview-root")).toHaveCSS("--tl-preview-action-primary-background", "#C2415D");

  const undo = page.getByRole("button", { name: "Undo" });
  await undo.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("preview-root")).toHaveCSS("--tl-preview-action-primary-background", "#3157D5");

  const inspect = page.getByRole("button", { name: "Inspect on" });
  await inspect.focus();
  await page.keyboard.press("Enter");
  const createProject = page.getByRole("button", { name: "Create project" });
  await createProject.focus();
  await page.keyboard.press("Enter");

  const projectName = page.getByRole("textbox", { name: "Project name" });
  await expect(projectName).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(projectName).toBeHidden();
  await expect(createProject).toBeFocused();
});
