import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTokenLabStore } from "./app/store";
import { initialProject } from "./domain/tokens";
import { App } from "./App";

afterEach(cleanup);

beforeEach(() => {
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
    expect(preview.style.getPropertyValue("--tl-preview-action-primary-background")).toBe("#C2415D");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(preview.style.getPropertyValue("--tl-preview-action-primary-background")).toBe("#3157D5");

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(preview.style.getPropertyValue("--tl-preview-action-primary-background")).toBe("#C2415D");
  });

  it("switches presets as one undoable document change", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Starting system"), { target: { value: "editorial" } });

    const preview = screen.getByTestId("preview-root");
    expect(preview.style.getPropertyValue("--tl-preview-action-primary-background")).toBe("#A34B32");
    expect(preview.style.getPropertyValue("--tl-preview-font-family")).toContain("Georgia");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(preview.style.getPropertyValue("--tl-preview-action-primary-background")).toBe("#3157D5");
    expect(screen.getByLabelText("Starting system")).toHaveProperty("value", "product");
  });

  it("filters tokens by path and shows an empty state", () => {
    render(<App />);
    const search = screen.getByRole("searchbox", { name: "Search tokens" });

    fireEvent.change(search, { target: { value: "radius.control" } });
    expect(screen.getByRole("button", { name: /radius\.control/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /color\.brand\.600/i })).toBeNull();

    fireEvent.change(search, { target: { value: "missing token" } });
    expect(screen.getByText("No matching tokens.")).toBeTruthy();
  });

  it("renders specimens and switches the canvas to dark mode", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Specimens" }));
    expect(screen.getByText("Forma component specimens")).toBeTruthy();
    expect(screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-font-family")).toContain("sans-serif");

    fireEvent.change(screen.getByLabelText("Preview mode"), { target: { value: "dark" } });
    expect(screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-surface")).toBe("#15171C");
  });

  it("opens the create project dialog when inspection is off", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Inspect on" }));
    const dialog = screen.getByRole("heading", { name: "Create project", hidden: true }).closest("dialog")!;
    dialog.showModal = () => { dialog.open = true; };

    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(dialog.open).toBe(true);
    expect(screen.getByRole("textbox", { name: "Project name" })).toBeTruthy();
  });

  it("edits a dimension token and inspects registered card dependencies", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /space\.medium/i }));
    fireEvent.change(screen.getByLabelText("Light value"), { target: { value: "20px" } });
    fireEvent.keyDown(screen.getByLabelText("Light value"), { key: "Enter" });
    expect(screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-card-padding")).toBe("20px");

    expect(fireEvent.keyDown(screen.getByRole("button", { name: "Inspect Mobile app refresh project card" }), { key: " " })).toBe(false);
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
    expect(screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-card-padding")).toBe("18px");
  });

  it("compares against a snapshot and restores it as one undoable action", () => {
    render(<App />);
    const dialog = screen.getByRole("heading", { name: "Name snapshot", hidden: true }).closest("dialog")!;
    dialog.showModal = () => { dialog.open = true; };
    fireEvent.click(screen.getByRole("button", { name: "Snapshot" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Snapshot name" }), { target: { value: "Before brand refresh" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save snapshot" }).closest("form")!);
    fireEvent.change(screen.getByLabelText("Light value"), { target: { value: "#C2415D" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));

    expect(screen.getByText("1 token changes")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Before brand refresh" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Restore baseline" }));
    expect(screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-action-primary-background")).toBe("#3157D5");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-action-primary-background")).toBe("#C2415D");
  });

  it("shows downloadable production formats", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByText("tokenlab.css")).toBeTruthy();
    expect(screen.getByText("tokenlab.light.tokens.json")).toBeTruthy();
    expect(screen.getByText("tokenlab.project.json")).toBeTruthy();
  });
});
