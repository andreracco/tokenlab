import { expect, test } from "@playwright/test";

test("supports the core edit and dialog flow from the keyboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "Saved locally" })).toBeVisible();

  const valueInput = page.getByRole("textbox", { name: "Light value" });
  await valueInput.focus();
  await valueInput.fill("#C2415D");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("preview-root")).toHaveCSS(
    "--tl-preview-action-primary-background",
    "#C2415D",
  );

  const undo = page.getByRole("button", { name: "Undo" });
  await undo.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("preview-root")).toHaveCSS(
    "--tl-preview-action-primary-background",
    "#3157D5",
  );

  const inspect = page.getByRole("button", { name: "Inspect", exact: true });
  await inspect.focus();
  await page.keyboard.press("Enter");
  await expect(inspect).toHaveAttribute("aria-pressed", "true");
  const interact = page.getByRole("button", { name: "Interact" });
  await interact.focus();
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

test("announces focused views and returns focus after overlays", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status").filter({ hasText: "Saved locally" })).toBeVisible();

  const history = page.getByRole("button", { name: "History" });
  await history.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Saved baselines" })).toBeFocused();

  const saveFirstBaseline = page.getByRole("button", { name: "Save first baseline" });
  await saveFirstBaseline.focus();
  await page.keyboard.press("Enter");
  const snapshotName = page.getByRole("textbox", { name: "Snapshot name" });
  await expect(snapshotName).toBeFocused();
  await snapshotName.fill("");
  await page.keyboard.press("Enter");
  await expect(snapshotName).toBeFocused();
  await expect(snapshotName).toHaveAttribute("aria-invalid", "true");
  await page.keyboard.press("Escape");
  await expect(saveFirstBaseline).toBeFocused();

  const exportButton = page.getByRole("button", { name: "Export" });
  await exportButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Production-ready token files" })).toBeFocused();
  const back = page.getByRole("button", { name: "Back to preview" });
  await back.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Preview", exact: true })).toBeFocused();
});
