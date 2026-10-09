import { describe, expect, it } from "vitest";
import { contrastRatio, checkContrast } from "./contrast";
import {
  buildExports,
  exportCss,
  exportDesignSystemMarkdown,
  exportDtcg,
  exportProject,
  exportTailwind,
  parseProjectFile,
} from "./exports";
import { initialProject } from "./tokens";
import { componentRegistry } from "../preview/registry";

describe("shipping formats", () => {
  it("calculates registered contrast pairs", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBe(21);
    const checks = checkContrast(initialProject, "light");
    expect(checks).toHaveLength(4);
    expect(checks.every((check) => check.passes)).toBe(true);
  });

  it("exports deterministic CSS and DTCG aliases", () => {
    expect(exportCss(initialProject)).toContain(
      "--action-primary-background: var(--color-brand-600)",
    );
    expect(exportDtcg(initialProject, "light")).toContain('"$value": "{color.brand.600}"');
    expect(buildExports(initialProject, [], componentRegistry)).toHaveLength(6);
  });

  it("exports a deterministic design-system handoff with aliases and registered checks", () => {
    const output = exportDesignSystemMarkdown(initialProject, componentRegistry);

    expect(output).toBe(exportDesignSystemMarkdown(initialProject, componentRegistry));
    expect(output).toContain(`# ${initialProject.name}`);
    expect(output).toContain("`action.primary.background`");
    expect(output).toContain("→ color.brand.600");
    expect(output).toContain("Body text on page (Forma page)");
    expect(output).toContain("`action.primary.background` | Primary button | Projects header |");
    expect(output).toContain("do not describe arbitrary applications");
    expect(output).toContain("4.5:1");
    expect(output).toContain("not a full accessibility certification");
  });

  it("emits CSS and Tailwind references that resolve in a consumer", () => {
    const output = exportTailwind(initialProject);
    const declared = new Set([...output.matchAll(/^\s*--([^:]+):/gm)].map((match) => match[1]));
    const references = [...output.matchAll(/var\(--([^)]+)\)/g)].map((match) => match[1]);

    expect(references.length).toBeGreaterThan(0);
    expect(references.filter((name) => !declared.has(name))).toEqual([]);
  });

  it("round-trips project files and rejects unsupported input", () => {
    const restored = parseProjectFile(exportProject(initialProject, []));
    expect(restored.document).toEqual(initialProject);
    expect(() => parseProjectFile('{"format":"other"}')).toThrow(
      "Unsupported TokenLab project file",
    );
    expect(() => parseProjectFile("{")).toThrow("Project file is not valid JSON.");
  });
});
