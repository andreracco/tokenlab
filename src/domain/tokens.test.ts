import { describe, expect, it } from "vitest";
import { applyCommand, initialProject, presetOptions, projectSchema, resolveColorToken, resolveCssValue, resolveToken } from "./tokens";

describe("token commands", () => {
  it("updates a primitive, resolves its alias, and leaves the original document intact", () => {
    const edited = applyCommand(initialProject, {
      type: "set-color",
      tokenId: "color.brand.600",
      mode: "light",
      value: "#c2415d",
    });

    expect(resolveColorToken(edited, "action.primary.background")).toBe("#C2415D");
    expect(resolveColorToken(initialProject, "action.primary.background")).toBe("#3157D5");
  });

  it("provides three visually distinct starting systems", () => {
    const documents = presetOptions.map((preset) => applyCommand(initialProject, { type: "select-preset", presetId: preset.id }));
    expect(new Set(documents.map((document) => resolveColorToken(document, "action.primary.background"))).size).toBe(3);
    expect(new Set(documents.map((document) => resolveCssValue(document, "typography.body.family"))).size).toBe(3);
    expect(new Set(documents.map((document) => resolveCssValue(document, "component.card.radius"))).size).toBe(3);
  });

  it("resolves mode overrides through aliases and falls back to light", () => {
    const document = projectSchema.parse({
      ...initialProject,
      tokens: initialProject.tokens.map((token) => token.id === "color.brand.600"
        ? { ...token, values: { ...token.values, dark: { kind: "literal" as const, value: "#111827" } } }
        : token),
    });

    expect(resolveColorToken(document, "action.primary.background", "dark")).toBe("#111827");
    expect(resolveColorToken(initialProject, "action.primary.foreground", "dark")).toBe("#FFFFFF");
  });

  it("accepts every supported literal type", () => {
    const values = (value: unknown) => ({ light: { kind: "literal" as const, value } });
    const result = projectSchema.safeParse({
      ...initialProject,
      tokens: [
        { id: "color", path: "color", type: "color", layer: "primitive", description: "", values: values("#112233") },
        { id: "dimension", path: "dimension", type: "dimension", layer: "primitive", description: "", values: values({ value: 8, unit: "px" }) },
        { id: "family", path: "family", type: "fontFamily", layer: "primitive", description: "", values: values("Inter") },
        { id: "weight", path: "weight", type: "fontWeight", layer: "primitive", description: "", values: values(600) },
        { id: "number", path: "number", type: "number", layer: "primitive", description: "", values: values(1.5) },
        { id: "shadow", path: "shadow", type: "shadow", layer: "primitive", description: "", values: values({ offsetX: 0, offsetY: 4, blur: 12, spread: 0, color: "#112233" }) },
      ],
    });

    expect(result.success).toBe(true);
  });

  it.each([
    ["missing reference", [
      { id: "a", path: "a", type: "color", layer: "semantic", description: "", values: { light: { kind: "reference", tokenId: "missing" } } },
    ]],
    ["incompatible reference", [
      { id: "a", path: "a", type: "color", layer: "semantic", description: "", values: { light: { kind: "reference", tokenId: "b" } } },
      { id: "b", path: "b", type: "dimension", layer: "primitive", description: "", values: { light: { kind: "literal", value: { value: 8, unit: "px" } } } },
    ]],
    ["reference cycle", [
      { id: "a", path: "a", type: "color", layer: "semantic", description: "", values: { light: { kind: "reference", tokenId: "b" } } },
      { id: "b", path: "b", type: "color", layer: "semantic", description: "", values: { light: { kind: "reference", tokenId: "a" } } },
    ]],
  ])("rejects a %s", (_name, tokens) => {
    expect(projectSchema.safeParse({ ...initialProject, tokens }).success).toBe(false);
  });

  it("resolves typed non-color values", () => {
    const document = projectSchema.parse({
      ...initialProject,
      tokens: [
        { id: "space.4", path: "space.4", type: "dimension", layer: "primitive", description: "", values: { light: { kind: "literal", value: { value: 16, unit: "px" } } } },
        { id: "layout.gap", path: "layout.gap", type: "dimension", layer: "semantic", description: "", values: { light: { kind: "reference", tokenId: "space.4" } } },
      ],
    });

    expect(resolveToken(document, "layout.gap")).toEqual({ value: 16, unit: "px" });
  });
});
