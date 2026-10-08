import { describe, expect, it } from "vitest";
import { applyCommand, initialProject } from "./tokens";
import { diffProjects } from "./projects";

describe("project comparison", () => {
  it("reports literal and alias changes deterministically", () => {
    const colorEdit = applyCommand(initialProject, { type: "set-color", tokenId: "color.brand.600", mode: "light", value: "#C2415D" });
    const aliasEdit = applyCommand(colorEdit, { type: "set-token-reference", tokenId: "action.primary.background", mode: "light", targetId: "color.neutral.text" });

    expect(diffProjects(initialProject, aliasEdit)).toEqual(expect.arrayContaining([
      { path: "color.brand.600", mode: "light", before: "#3157D5", after: "#C2415D" },
      { path: "action.primary.background", mode: "light", before: "→ color.brand.600", after: "→ color.neutral.text" },
    ]));
  });
});
