import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StyleImportGuide } from "./StyleImportGuide";

afterEach(cleanup);
beforeEach(() => localStorage.clear());

describe("CSS import guide", () => {
  it("can be dismissed, remembered, and reopened", async () => {
    const { unmount } = render(<StyleImportGuide />);

    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.getByText("Choose a stylesheet")).toBeTruthy();
    expect(screen.getByText("Review the matches")).toBeTruthy();
    expect(screen.getByText("Apply as one change")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Hide guide" }));
    await waitFor(() => expect(screen.queryByRole("list")).toBeNull());
    expect(localStorage.getItem("tokenlab:css-import-guide-dismissed:v1")).toBe("true");

    unmount();
    const nextView = render(<StyleImportGuide />);
    expect(nextView.getByRole("button", { name: "Show guide" }).getAttribute("aria-expanded")).toBe(
      "false",
    );
    fireEvent.click(nextView.getByRole("button", { name: "Show guide" }));
    expect(screen.getByRole("list")).toBeTruthy();
    expect(localStorage.getItem("tokenlab:css-import-guide-dismissed:v1")).toBeNull();
  });
});
