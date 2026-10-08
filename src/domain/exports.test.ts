import { describe, expect, it } from "vitest";
import { contrastRatio, checkContrast } from "./contrast";
import { buildExports, exportCss, exportDtcg, exportProject, parseProjectFile } from "./exports";
import { initialProject } from "./tokens";

describe("shipping formats", () => {
  it("calculates registered contrast pairs", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBe(21);
    expect(checkContrast(initialProject, "light")).toHaveLength(4);
  });

  it("exports deterministic CSS and DTCG aliases", () => {
    expect(exportCss(initialProject)).toContain("--action-primary-background: var(--color-brand-600)");
    expect(exportDtcg(initialProject, "light")).toContain('"$value": "{color.brand.600}"');
    expect(buildExports(initialProject, [])).toHaveLength(5);
  });

  it("round-trips project files and rejects unsupported input", () => {
    const restored = parseProjectFile(exportProject(initialProject, []));
    expect(restored.document).toEqual(initialProject);
    expect(() => parseProjectFile('{"format":"other"}')).toThrow("Unsupported TokenLab project file");
  });
});
