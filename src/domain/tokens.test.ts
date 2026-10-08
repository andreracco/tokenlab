import { describe, expect, it } from "vitest";
import { applyCommand, initialProject, presetOptions, resolveToken } from "./tokens";

describe("token commands", () => {
  it("updates a primitive, resolves its alias, and leaves the original document intact", () => {
    const edited = applyCommand(initialProject, {
      type: "set-color",
      tokenId: "color.brand.600",
      mode: "light",
      value: "#c2415d",
    });

    expect(resolveToken(edited, "action.primary.background")).toBe("#C2415D");
    expect(resolveToken(initialProject, "action.primary.background")).toBe("#3157D5");
  });

  it("provides three visually distinct starting systems", () => {
    expect(new Set(presetOptions.map((preset) => preset.primaryColor)).size).toBe(3);
    expect(new Set(presetOptions.map((preset) => preset.preview.fontFamily)).size).toBe(3);
    expect(new Set(presetOptions.map((preset) => preset.preview.radius)).size).toBe(3);
  });
});
