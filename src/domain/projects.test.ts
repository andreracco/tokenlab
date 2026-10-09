import { describe, expect, it } from "vitest";
import { applyCommand, initialProject } from "./tokens";
import { buildReleaseReport, diffProjects, formatReleaseNotes } from "./projects";

describe("project comparison", () => {
  it("reports literal and alias changes deterministically", () => {
    const colorEdit = applyCommand(initialProject, {
      type: "set-color",
      tokenId: "color.brand.600",
      mode: "light",
      value: "#C2415D",
    });
    const aliasEdit = applyCommand(colorEdit, {
      type: "set-token-reference",
      tokenId: "action.primary.background",
      mode: "light",
      targetId: "color.neutral.text",
    });

    expect(diffProjects(initialProject, aliasEdit)).toEqual(
      expect.arrayContaining([
        { path: "color.brand.600", mode: "light", before: "#3157D5", after: "#C2415D" },
        {
          path: "action.primary.background",
          mode: "light",
          before: "→ color.brand.600",
          after: "→ color.neutral.text",
        },
      ]),
    );
  });

  it("recommends the highest-impact semver bump and drafts deduplicated release notes", () => {
    const report = buildReleaseReport([
      { path: "color.brand.600", mode: "light", before: "#3157D5", after: "#C2415D" },
      { path: "color.brand.600", mode: "dark", before: "#3157D5", after: "#C2415D" },
      { path: "color.brand.700", mode: "light", before: "Removed", after: "#A8324B" },
      { path: "color.neutral.muted", mode: "light", before: "#68717C", after: "Removed" },
      { path: "color.neutral.muted", mode: "dark", before: "#68717C", after: "Removed" },
    ]);

    expect(report).toEqual({
      bump: "major",
      addedTokens: ["color.brand.700"],
      removedTokens: ["color.neutral.muted"],
      updates: [
        { path: "color.brand.600", mode: "light", before: "#3157D5", after: "#C2415D" },
        { path: "color.brand.600", mode: "dark", before: "#3157D5", after: "#C2415D" },
      ],
    });
    expect(formatReleaseNotes("Spring baseline", report)).toContain(
      "Suggested version bump: MAJOR",
    );
    expect(
      formatReleaseNotes("Spring baseline", report).match(/color\.neutral\.muted/g),
    ).toHaveLength(1);
  });

  it("uses no release when the baseline is unchanged", () => {
    expect(buildReleaseReport([])).toEqual({
      bump: "none",
      addedTokens: [],
      removedTokens: [],
      updates: [],
    });
  });

  it("classifies additions and value updates as minor and patch", () => {
    expect(
      buildReleaseReport([
        { path: "color.brand.700", mode: "light", before: "Removed", after: "#A8324B" },
      ]).bump,
    ).toBe("minor");
    expect(
      buildReleaseReport([
        { path: "color.brand.600", mode: "light", before: "#3157D5", after: "#C2415D" },
      ]).bump,
    ).toBe("patch");
  });
});
