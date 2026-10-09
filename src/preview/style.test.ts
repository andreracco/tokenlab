import { describe, expect, it } from "vitest";
import { initialProject } from "../domain/tokens";
import { createPreviewStyle } from "./style";

describe("createPreviewStyle", () => {
  it("softens opaque card shadows only in dark previews", () => {
    const document = structuredClone(initialProject);
    const shadow = document.tokens.find(({ id }) => id === "shadow.card");
    if (!shadow || shadow.type !== "shadow") throw new Error("Missing card shadow token.");
    shadow.values.light = {
      kind: "literal",
      value: { offsetX: 0, offsetY: 8, blur: 24, spread: 0, color: "#E8DDF0" },
    };

    expect(createPreviewStyle(document, "light")["--tl-preview-card-shadow"]).toBe(
      "0px 8px 24px 0px #E8DDF0",
    );
    expect(createPreviewStyle(document, "dark")["--tl-preview-card-shadow"]).toBe(
      "0px 4px 16px 0px color-mix(in srgb, #E8DDF0 14%, transparent)",
    );
  });
});
