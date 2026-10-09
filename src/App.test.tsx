import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTokenLabStore } from "./app/store";
import { initialProject } from "./domain/tokens";
import { App } from "./App";

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
  useTokenLabStore.setState({
    document: initialProject,
    selectedTokenId: "color.brand.600",
    history: [],
    future: [],
    snapshots: [],
  });
});

describe("TokenLab first slice", () => {
  it("applies a color to the preview and restores it with undo", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Light value"), { target: { value: "#C2415D" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    const preview = screen.getByTestId("preview-root");
    expect(preview.style.getPropertyValue("--tl-preview-action-primary-background")).toBe(
      "#C2415D",
    );

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(preview.style.getPropertyValue("--tl-preview-action-primary-background")).toBe(
      "#3157D5",
    );

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(preview.style.getPropertyValue("--tl-preview-action-primary-background")).toBe(
      "#C2415D",
    );
  });

  it("edits the font family without an overlay menu", () => {
    useTokenLabStore.setState({ selectedTokenId: "font.family.ui" });
    render(<App />);

    const choices = screen.getByRole("group", { name: "Light value" });
    expect(choices.querySelectorAll('input[type="radio"]')).toHaveLength(3);
    fireEvent.click(screen.getByRole("radio", { name: "Georgia" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(
      screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-font-family"),
    ).toContain("Georgia");
  });

  it("switches presets as one undoable document change", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Starting system"), { target: { value: "editorial" } });

    const preview = screen.getByTestId("preview-root");
    expect(preview.style.getPropertyValue("--tl-preview-action-primary-background")).toBe(
      "#A34B32",
    );
    expect(preview.style.getPropertyValue("--tl-preview-font-family")).toContain("Georgia");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(preview.style.getPropertyValue("--tl-preview-action-primary-background")).toBe(
      "#3157D5",
    );
    expect(screen.getByLabelText("Starting system")).toHaveProperty("value", "product");
  });

  it("groups tokens and filters them by path", () => {
    render(<App />);
    expect(screen.getByText("Foundations")).toBeTruthy();
    expect(screen.getByText("Semantic")).toBeTruthy();
    expect(screen.getByText("Feedback")).toBeTruthy();
    const search = screen.getByRole("searchbox", { name: "Search tokens" });

    fireEvent.change(search, { target: { value: "radius.control" } });
    expect(screen.getByRole("button", { name: /radius\.control/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /color\.brand\.600/i })).toBeNull();

    fireEvent.change(search, { target: { value: "missing token" } });
    expect(screen.getByText("No matching tokens.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear token search" }));
    expect(search).toHaveProperty("value", "");
    expect(screen.getByRole("button", { name: /color\.brand\.600/i })).toBeTruthy();
  });

  it("defaults to interaction and clearly labels deliberate inspection", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Interact" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.queryByText(/select a preview element/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Inspect$/ }));
    expect(screen.getByText(/select a preview element/i)).toBeTruthy();
  });

  it("switches mobile workspace panels and opens selections in the inspector", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Tokens" }));
    expect(screen.getByRole("button", { name: "Tokens" }).getAttribute("aria-pressed")).toBe(
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: /radius\.control/i }));
    expect(screen.getByRole("button", { name: "Inspector" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("opens and closes the tablet inspector drawer", () => {
    render(<App />);
    const open = screen.getByRole("button", { name: "Open inspector" });
    expect(open.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(open);
    expect(open.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Close inspector" }));
    expect(open.getAttribute("aria-expanded")).toBe("false");
  });

  it("documents the active system and opens its tokens in the inspector", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "System" }));
    expect(
      await screen.findByRole("heading", { name: "From decision to interface." }),
    ).toBeTruthy();
    expect(screen.getByText("39")).toBeTruthy();
    expect(screen.getByText("4/4")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Inspect color.neutral.canvas" }));
    expect(screen.getByText("color.neutral.canvas", { selector: "strong" })).toBeTruthy();
    expect(
      screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-font-family"),
    ).toContain("sans-serif");

    fireEvent.change(screen.getByLabelText("Preview mode"), { target: { value: "dark" } });
    expect(screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-surface")).toBe(
      "#15171C",
    );
    fireEvent.change(screen.getByLabelText("Preview width"), { target: { value: "720" } });
    expect(
      screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-viewport-width"),
    ).toBe("720px");
  });

  it("opens the create project dialog in the default interaction mode", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Projects" })).toBeTruthy();
    const dialog = screen
      .getByRole("heading", { name: "Create project", hidden: true })
      .closest("dialog")!;
    dialog.showModal = () => {
      dialog.open = true;
    };
    const opener = screen.getByRole("button", { name: "Create project" });

    fireEvent.click(opener);

    expect(dialog.open).toBe(true);
    fireEvent(dialog, new Event("close"));
    expect(document.activeElement).toBe(opener);
    fireEvent.change(screen.getByRole("textbox", { name: "Project name" }), {
      target: { value: "Client portal" },
    });
    fireEvent.submit(dialog.querySelector("form")!);
    expect(screen.getByRole("heading", { name: "Client portal" })).toBeTruthy();
    expect(screen.getByText("4 projects")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "System" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByRole("heading", { name: "Client portal" })).toBeTruthy();
  });

  it("makes preview navigation, search, filters, and notifications interactive", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Overview" }));
    expect(screen.getByRole("heading", { name: "Overview" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "View projects" }));

    fireEvent.change(screen.getByRole("textbox", { name: "Search projects" }), {
      target: { value: "missing" },
    });
    expect(screen.getByText("No matching projects")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("3 projects")).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox", { name: "Project status" }), {
      target: { value: "review" },
    });
    expect(screen.getByText("1 project")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(screen.getByText("Design system moved to review")).toBeTruthy();
  });

  it("edits a dimension token and inspects registered card dependencies", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /space\.medium/i }));
    fireEvent.change(screen.getByLabelText("Light value"), { target: { value: "20px" } });
    fireEvent.keyDown(screen.getByLabelText("Light value"), { key: "Enter" });
    expect(
      screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-card-padding"),
    ).toBe("20px");

    fireEvent.click(screen.getByRole("button", { name: /^Inspect$/ }));
    expect(
      fireEvent.keyDown(
        screen.getByRole("button", { name: "Inspect Mobile app refresh project card" }),
        { key: " " },
      ),
    ).toBe(false);
    expect(screen.getByText("Project card tokens")).toBeTruthy();
  });

  it("cancels numeric drafts with Escape and commits them on blur", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /space\.medium/i }));
    const input = screen.getByLabelText("Light value");

    fireEvent.change(input, { target: { value: "20px" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveProperty("value", "14px");

    fireEvent.change(input, { target: { value: "18px" } });
    fireEvent.blur(input);
    expect(
      screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-card-padding"),
    ).toBe("18px");
  });

  it("keeps an unnamed snapshot dialog open with actionable validation", async () => {
    render(<App />);
    const dialog = screen
      .getByRole("heading", { name: "Name snapshot", hidden: true })
      .closest("dialog")!;
    dialog.showModal = () => {
      dialog.open = true;
    };
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save first baseline" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Snapshot name" }), {
      target: { value: "" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Save snapshot" }).closest("form")!);
    expect(screen.getByRole("alert").textContent).toBe("Enter a snapshot name.");
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Snapshot name" }));
    expect(useTokenLabStore.getState().snapshots).toHaveLength(0);
  });

  it("compares against a snapshot and restores it as one undoable action", async () => {
    render(<App />);
    const dialog = screen
      .getByRole("heading", { name: "Name snapshot", hidden: true })
      .closest("dialog")!;
    dialog.showModal = () => {
      dialog.open = true;
    };
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    fireEvent.click(await screen.findByRole("button", { name: "Save first baseline" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Snapshot name" }), {
      target: { value: "Before brand refresh" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Save snapshot" }).closest("form")!);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    fireEvent.change(await screen.findByLabelText("Light value"), {
      target: { value: "#C2415D" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    fireEvent.click(await screen.findByRole("button", { name: "Compare" }));

    expect(await screen.findByText("1 token change")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Before brand refresh" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Restore baseline" }));
    await screen.findByTestId("preview-root");
    expect(
      screen
        .getByTestId("preview-root")
        .style.getPropertyValue("--tl-preview-action-primary-background"),
    ).toBe("#3157D5");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      screen
        .getByTestId("preview-root")
        .style.getPropertyValue("--tl-preview-action-primary-background"),
    ).toBe("#C2415D");
  });

  it("shows downloadable production formats", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(await screen.findByText("tokenlab.css")).toBeTruthy();
    expect(screen.getByText("tokenlab.light.tokens.json")).toBeTruthy();
    expect(screen.getByText("tokenlab.project.json")).toBeTruthy();
  });

  it("preserves the project after a malformed import and allows retrying the file", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    const input = (await screen.findByLabelText("Import TokenLab project")) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [{ text: async () => "{" }] } });

    expect(await screen.findByText("Project file is not valid JSON.")).toBeTruthy();
    await waitFor(() => expect(input.value).toBe(""));
    expect(useTokenLabStore.getState().document).toEqual(initialProject);
  });

  it("reviews and applies mapped CSS variables as one undo step", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Import CSS" }));

    const input = (await screen.findByLabelText(/Choose a CSS file/i)) as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [
          {
            name: "brand.css",
            size: 82,
            text: async () => ":root { --color-brand-600: #c2415d; --space-medium: 18px; }",
          },
        ],
      },
    });

    expect((await screen.findAllByText("#C2415D")).length).toBeGreaterThan(0);
    expect(screen.getByRole("checkbox", { name: "Select #C2415D" })).toHaveProperty(
      "checked",
      true,
    );
    expect(screen.getByRole("checkbox", { name: "Select 18px" })).toHaveProperty("checked", true);
    expect(
      screen
        .getAllByRole("combobox", { name: "Map to" })
        .map((select) => (select as HTMLSelectElement).value),
    ).toEqual(["color.brand.600", "space.medium"]);
    expect(
      (screen.getAllByRole("combobox", { name: "Map to" })[0] as HTMLSelectElement)
        .selectedOptions[0].text,
    ).toBe("color.brand.600");
    fireEvent.click(screen.getByRole("button", { name: "Apply 2" }));
    expect(screen.getByText("2 token changes applied as one undo step.")).toBeTruthy();
    expect(useTokenLabStore.getState().history).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Back to preview" }));
    await screen.findByTestId("preview-root");
    expect(
      screen
        .getByTestId("preview-root")
        .style.getPropertyValue("--tl-preview-action-primary-background"),
    ).toBe("#C2415D");
    expect(
      screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-card-padding"),
    ).toBe("18px");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      screen
        .getByTestId("preview-root")
        .style.getPropertyValue("--tl-preview-action-primary-background"),
    ).toBe("#3157D5");
    expect(
      screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-card-padding"),
    ).toBe("14px");
  });

  it("flags newly failing registered contrast pairs before stylesheet changes are applied", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Import CSS" }));
    fireEvent.change(await screen.findByLabelText(/Choose a CSS file/i), {
      target: {
        files: [
          {
            name: "low-contrast.css",
            size: 42,
            text: async () => ":root { --color-brand-600: #ffffff; }",
          },
        ],
      },
    });

    expect(await screen.findByText("1 new contrast issue")).toBeTruthy();
    expect(screen.getByText(/Primary button label: 1:1, requires 4.5:1/)).toBeTruthy();
    expect(useTokenLabStore.getState().history).toHaveLength(0);
  });

  it("lets users disable and restore safe automatic stylesheet mappings", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Import CSS" }));
    fireEvent.change(await screen.findByLabelText(/Choose a CSS file/i), {
      target: {
        files: [
          {
            name: "brand.css",
            size: 44,
            text: async () => ":root { --color-brand-600: #c2415d; }",
          },
        ],
      },
    });

    const autoMap = await screen.findByRole("checkbox", { name: "Auto-map obvious matches" });
    const target = screen.getByRole("combobox", { name: "Map to" });
    expect(target).toHaveProperty("value", "color.brand.600");

    fireEvent.click(autoMap);
    expect(target).toHaveProperty("value", "");
    expect(screen.getByRole("checkbox", { name: "Select #C2415D" })).toHaveProperty(
      "disabled",
      true,
    );

    fireEvent.click(autoMap);
    expect(target).toHaveProperty("value", "color.brand.600");
    expect(screen.getByRole("checkbox", { name: "Select #C2415D" })).toHaveProperty(
      "checked",
      true,
    );
  });

  it("triages large stylesheet results by search, group, and unsupported reason", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Import CSS" }));
    fireEvent.change(await screen.findByLabelText(/Choose a CSS file/i), {
      target: {
        files: [
          {
            name: "mixed.css",
            size: 110,
            text: async () =>
              ":root { --color-brand-600: #c2415d; } .card { padding: 18px; border-color: #abc; color: rgb(1 2 3); }",
          },
        ],
      },
    });

    expect((await screen.findAllByText("Spacing & sizing")).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("combobox", { name: "Import group" }), {
      target: { value: "spacing" },
    });
    expect(screen.getAllByText("18px")).toHaveLength(2);
    expect(screen.queryByText("#C2415D")).toBeNull();

    fireEvent.change(screen.getByRole("combobox", { name: "Import status" }), {
      target: { value: "unsupported" },
    });
    expect(screen.getByText("rgb(1 2 3)")).toBeTruthy();
    expect(screen.getByText("Convert this color to six-digit hex.")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Import group" })).toHaveProperty("disabled", true);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search imported styles" }), {
      target: { value: "missing" },
    });
    expect(screen.getByText("No unsupported values match")).toBeTruthy();
  });

  it("shows the token health report and opens a finding in the inspector", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Health" }));

    expect(await screen.findByRole("heading", { name: "Token health" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Contrast pairs" })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Inspect pair" })[6]);

    const inspector = await screen.findByLabelText("Token inspector");
    expect(screen.getByLabelText("Preview mode")).toHaveProperty("value", "dark");
    const contrastDisclosure = within(inspector).getByRole("button", { name: /Contrast checks/ });
    expect(contrastDisclosure.getAttribute("aria-expanded")).toBe("true");
    const contrastRegion = inspector.querySelector('[aria-labelledby="contrast-checks-trigger"]');
    expect(contrastRegion?.textContent).toContain("Primary button label");
    expect(contrastRegion?.textContent).not.toContain("Body text on page");
  });

  it("applies a mode-specific contrast suggestion as one undoable edit", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Starting system"), {
      target: { value: "expressive" },
    });
    fireEvent.change(screen.getByLabelText("Preview mode"), { target: { value: "dark" } });
    fireEvent.click(screen.getByRole("button", { name: "Health" }));

    const applySuggestion = await screen.findByRole("button", { name: "Apply suggestion" });
    expect(applySuggestion.parentElement?.textContent).toContain("color.neutral.panel");
    expect(applySuggestion.parentElement?.textContent).toContain("6.34:1");
    fireEvent.click(applySuggestion);

    expect(screen.getByLabelText("Preview mode")).toHaveProperty("value", "dark");
    const inspector = await screen.findByLabelText("Token inspector");
    const contrastRegion = inspector.querySelector('[aria-labelledby="contrast-checks-trigger"]');
    expect(contrastRegion?.textContent).toContain("Passes 4.5:1");
    expect(contrastRegion?.textContent).toContain("6.34:1");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(contrastRegion?.textContent).toContain("2.53:1");
  });
});
