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

  it("renders specimens and switches the canvas to dark mode", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Specimens" }));
    expect(screen.getByText("Forma component specimens")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Preview mode"), { target: { value: "dark" } });
    expect(screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-surface")).toBe("#15171C");
  });

  it("edits a dimension token and inspects registered card dependencies", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /space\.medium/i }));
    fireEvent.change(screen.getByLabelText("Light value"), { target: { value: "20px" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByTestId("preview-root").style.getPropertyValue("--tl-preview-card-padding")).toBe("20px");

    fireEvent.click(screen.getByRole("button", { name: "Inspect Mobile app refresh project card" }));
    expect(screen.getByText("Project card tokens")).toBeTruthy();
  });

  it("compares against a snapshot and restores it as one undoable action", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Snapshot" }));
    fireEvent.change(screen.getByLabelText("Light value"), { target: { value: "#C2415D" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));

    expect(screen.getByText("1 token changes")).toBeTruthy();
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
