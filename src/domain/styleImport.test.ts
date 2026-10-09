import { describe, expect, it } from "vitest";
import { scanStylesheet } from "./styleImport";

describe("scanStylesheet", () => {
  it("extracts and counts compatible reusable values without evaluating CSS", () => {
    const result = scanStylesheet(`
      /* #BAD should be ignored */
      :root { --color-brand-600: #3157d5; --space-medium: 14px; --font-body: "Inter"; }
      .button { color: #3157D5; padding: 14px; font-weight: 700; line-height: 1.5; }
      .card { color: var(--color-brand-600); border-color: #abc; }
    `);

    expect(result.declarationCount).toBe(9);
    expect(result.variableCount).toBe(3);
    expect(result.unsupportedCount).toBe(1);
    expect(result.unsupported).toEqual([
      expect.objectContaining({
        source: "color",
        value: "var(--color-brand-600)",
        reason: "Computed values aren't resolved.",
      }),
    ]);
    expect(result.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "color", value: "#3157D5", occurrences: 2 }),
        expect.objectContaining({ type: "dimension", value: "14px", occurrences: 2 }),
        expect.objectContaining({ type: "fontFamily", value: "Inter", occurrences: 1 }),
        expect.objectContaining({ type: "fontWeight", value: "700", occurrences: 1 }),
        expect.objectContaining({ type: "number", value: "1.5", occurrences: 1 }),
        expect.objectContaining({ type: "color", value: "#AABBCC", occurrences: 1 }),
      ]),
    );
  });

  it("ignores unsupported and computed values", () => {
    const result = scanStylesheet(
      `.thing { color: rgb(1 2 3); padding: calc(1rem + 2px); color: var(--brand); }`,
    );
    expect(result.candidates).toEqual([]);
    expect(result.unsupportedCount).toBe(3);
    expect(result.unsupported.map((item) => item.reason)).toEqual([
      "Convert this color to six-digit hex.",
      "Computed values aren't resolved.",
      "Computed values aren't resolved.",
    ]);
  });

  it("scans declarations inside media rules without treating conditions or quoted braces as values", () => {
    const result = scanStylesheet(`
      /* } comments don't affect rule balance */
      @media (min-width: 40rem) {
        :root { --space-medium: 16px; }
        .card::after { content: "brace }"; color: #3157D5; }
      }
    `);

    expect(result.declarationCount).toBe(3);
    expect(result.variableCount).toBe(1);
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "dimension", value: "16px" }),
        expect.objectContaining({ type: "color", value: "#3157D5" }),
      ]),
    );
  });

  it.each(["", "not CSS", "color: #fff;"])("rejects input without CSS rules: %s", (css) => {
    expect(() => scanStylesheet(css)).toThrow("No CSS rules were found");
  });

  it("rejects rules without declarations", () => {
    expect(() => scanStylesheet(".button { color #fff; }")).toThrow(
      "No CSS declarations were found",
    );
  });

  it.each([".button { color: #fff;", ".button { color: #fff; } }"])(
    "rejects unbalanced CSS rules: %s",
    (css) => {
      expect(() => scanStylesheet(css)).toThrow(/brace/);
    },
  );
});
