import { describe, expect, it } from "vitest";
import { componentRegistry } from "../preview/registry";
import { applyCommand, initialProject } from "./tokens";
import { analyzeTokenHealth, suggestContrastFix } from "./tokenHealth";

describe("analyzeTokenHealth", () => {
  it("follows aliases when measuring registered preview usage", () => {
    const report = analyzeTokenHealth(initialProject, componentRegistry);

    expect(report.referencedTokenCount).toBeGreaterThan(0);
    expect(report.unusedTokens.map(({ id }) => id)).not.toContain("color.brand.600");
    expect(report.contrastChecks).toHaveLength(8);
  });

  it("groups duplicate literals by type and reports broken aliases", () => {
    const document = structuredClone(initialProject);
    const duplicate = structuredClone(document.tokens.find(({ id }) => id === "space.small")!);
    duplicate.id = "space.small.duplicate";
    duplicate.path = "space.small.duplicate";
    document.tokens.push(duplicate);
    const alias = document.tokens.find(({ id }) => id === "space.medium")!;
    alias.values.light = { kind: "reference", tokenId: "missing.color" };

    const report = analyzeTokenHealth(document, componentRegistry);

    expect(report.duplicateValues).toContainEqual(
      expect.objectContaining({
        type: "dimension",
        tokenIds: ["space.small", "space.small.duplicate"],
      }),
    );
    expect(report.aliasIssues).toContainEqual(
      expect.objectContaining({
        kind: "missing",
        mode: "light",
        tokenId: "space.medium",
        targetId: "missing.color",
      }),
    );
  });

  it("detects alias cycles independently in each mode", () => {
    const document = structuredClone(initialProject);
    const small = document.tokens.find(({ id }) => id === "space.small")!;
    const medium = document.tokens.find(({ id }) => id === "space.medium")!;
    small.values.light = { kind: "reference", tokenId: medium.id };
    medium.values.light = { kind: "reference", tokenId: small.id };

    const report = analyzeTokenHealth(document, componentRegistry);

    expect(report.aliasIssues).toContainEqual(
      expect.objectContaining({
        kind: "cycle",
        mode: "light",
        tokenIds: [small.id, medium.id].sort(),
      }),
    );
  });

  it("suggests the closest existing neutral that passes the selected contrast threshold", () => {
    const expressive = applyCommand(initialProject, {
      type: "select-preset",
      presetId: "expressive",
    });

    expect(suggestContrastFix(expressive, "dark", "primary")).toEqual({
      tokenId: "color.neutral.panel",
      tokenPath: "color.neutral.panel",
      projectedRatio: 6.34,
    });
    expect(suggestContrastFix(expressive, "light", "primary")).toBeUndefined();
  });
});
