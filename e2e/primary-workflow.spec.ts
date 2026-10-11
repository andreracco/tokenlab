import { expect, test } from "@playwright/test";
import { gotoPreview } from "./helpers";
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
  await expect(page.getByTestId("preview-root")).toHaveCSS(
    "--tl-preview-action-primary-background",
    "#C2415D",
  );
  await page.getByRole("button", { name: "Inspect", exact: true }).click();
  await page
    .getByRole("button", { name: "Create project; inspect action.primary.background" })
    .click();
  await expect(page.getByText("Primary button tokens")).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Primary button selected" }),
  ).toBeAttached();

  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.getByText("1 token change")).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Living Canvas" })
      .getByText("color.brand.600", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to history" }).click();

  await page.getByRole("button", { name: "Export" }).click();
  await expect(page.getByRole("heading", { name: "Production-ready token files" })).toBeVisible();
  await expect(page.getByText("tokenlab.css", { exact: true })).toBeVisible();
  await expect(page.getByText("tokenlab.project.json", { exact: true })).toBeVisible();
  await expect(page.getByText("tokenlab.design-system.md", { exact: true })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download tokenlab.css" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("tokenlab.css");
  const css = await readFile(await download.path(), "utf8");
  expect(css).toContain("--action-primary-background: var(--color-brand-600)");

  const handoffDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download tokenlab.design-system.md" }).click();
  const handoffDownload = await handoffDownloadPromise;
  expect(handoffDownload.suggestedFilename()).toBe("tokenlab.design-system.md");
  const handoff = await readFile(await handoffDownload.path(), "utf8");
  expect(handoff).toContain("Registered contrast checks");
  expect(handoff).toContain("Registered preview usage");
  expect(handoff).toContain("Primary button | Projects header");
  expect(handoff).toContain("→ color.brand.600");

  await page.setContent(
    `<style>${css}</style><button id="consumer" style="background:var(--action-primary-background);color:var(--action-primary-foreground);border-radius:var(--component-control-radius)">Create project</button>`,
  );
  await expect(page.locator("#consumer")).toHaveCSS("background-color", "rgb(194, 65, 93)");
  await expect(page.locator("#consumer")).toHaveCSS("border-radius", "7px");
});

test("project creation uses the active system's error and success feedback", async ({ page }) => {
  await gotoPreview(page);
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await page.getByRole("button", { name: "Create project", exact: true }).last().click();
  await expect(page.getByRole("alert")).toHaveText("Enter a project name.");
  await expect(page.getByRole("textbox", { name: "Project name" })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  const preview = page.getByTestId("preview-root");
  const errorColor = await preview.evaluate((element) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--tl-preview-feedback-error-text)";
    element.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await expect(page.getByRole("alert")).toHaveCSS("color", errorColor);

  await page.getByRole("textbox", { name: "Project name" }).fill("Portfolio refresh");
  await page.getByRole("button", { name: "Create project", exact: true }).last().click();
  const confirmation = page
    .getByRole("status")
    .filter({ hasText: "Portfolio refresh was created." });
  await expect(confirmation).toBeVisible();
  await expect(page.getByRole("heading", { name: "Portfolio refresh" })).toBeVisible();
  await expect(page.getByText("created project “Portfolio refresh”")).toBeVisible();
  const successColor = await preview.evaluate((element) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--tl-preview-feedback-success-text)";
    element.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await expect(confirmation).toHaveCSS("color", successColor);

  await preview.getByRole("button", { name: "Overview" }).click();
  await expect(page.getByText("created project “Portfolio refresh”")).toBeVisible();
  await preview.getByRole("button", { name: "Projects", exact: true }).click();

  const createdProjectCard = preview.getByRole("button", {
    name: "Open project: Portfolio refresh",
  });
  await createdProjectCard.focus();
  await page.keyboard.press("Enter");
  await expect(preview.getByRole("heading", { name: "Portfolio refresh" })).toBeFocused();
  await expect(
    preview.getByRole("progressbar", { name: "Portfolio refresh progress" }),
  ).toHaveAttribute("aria-valuenow", "0");
  await expect(
    preview
      .getByRole("region", { name: "Recent activity" })
      .getByText("created project “Portfolio refresh”"),
  ).toBeVisible();
  await preview.getByRole("combobox", { name: "Project status" }).selectOption("in-progress");
  await preview.getByRole("spinbutton", { name: "Project progress" }).fill("120");
  await preview.getByRole("button", { name: "Save changes" }).click();
  await expect(preview.getByRole("alert")).toHaveText("Enter a whole number from 0 to 100.");
  await expect(preview.getByRole("spinbutton", { name: "Project progress" })).toBeFocused();
  await preview.getByRole("spinbutton", { name: "Project progress" }).fill("35");
  await preview.getByRole("button", { name: "Save changes" }).click();
  await expect(
    preview.getByRole("progressbar", { name: "Portfolio refresh progress" }),
  ).toHaveAttribute("aria-valuenow", "35");
  await expect(
    preview.getByRole("region", { name: "Recent activity" }).getByText("updated Portfolio refresh"),
  ).toBeVisible();
  await preview.getByRole("button", { name: "Back to projects" }).click();
  await expect(preview.getByRole("heading", { name: "Projects", exact: true })).toBeFocused();
  const updatedProjectCard = preview.getByRole("article").filter({ hasText: "Portfolio refresh" });
  await expect(updatedProjectCard).toContainText("In progress");
  await expect(updatedProjectCard).toContainText("35%");
  await expect(page.getByText("Saved locally").first()).toBeVisible();
  await page.getByRole("button", { name: "Dismiss project confirmation" }).click();
  await expect(confirmation).toHaveCount(0);

  await page.reload();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await preview.getByRole("button", { name: "Open project: Portfolio refresh" }).click();
  await expect(
    preview.getByRole("progressbar", { name: "Portfolio refresh progress" }),
  ).toHaveAttribute("aria-valuenow", "35");
  await expect(preview.getByRole("combobox", { name: "Project status" })).toHaveValue(
    "in-progress",
  );
  await expect(
    preview.getByRole("region", { name: "Recent activity" }).getByText("updated Portfolio refresh"),
  ).toBeVisible();
  await preview.getByRole("button", { name: "Back to projects" }).click();

  await preview.getByRole("button", { name: "Open project: Mobile app refresh" }).click();
  await expect(
    preview.getByRole("progressbar", { name: "Mobile app refresh progress" }),
  ).toHaveAttribute("aria-valuenow", "72");
  await expect(
    preview
      .getByRole("region", { name: "Recent activity" })
      .getByText(/completed “Review navigation patterns”/),
  ).toBeVisible();
  await preview.getByRole("button", { name: "Back to projects" }).click();
});
