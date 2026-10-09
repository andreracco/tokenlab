import { parseTokenInput, type Token, type TokenCommand, type TokenMode } from "./tokens";

export type StyleCandidate = {
  id: string;
  type: Token["type"];
  value: string;
  occurrences: number;
  sources: string[];
};

export type StyleScanResult = {
  declarationCount: number;
  variableCount: number;
  unsupportedCount: number;
  unsupported: UnsupportedStyleValue[];
  candidates: StyleCandidate[];
};

export type UnsupportedStyleValue = {
  id: string;
  source: string;
  value: string;
  occurrences: number;
  reason: string;
};

export type StyleMapping = { candidate: StyleCandidate; tokenId: string };

const supportedFontFamilies = new Set(["Inter", "Georgia", "Avenir Next"]);

export function scanStylesheet(css: string): StyleScanResult {
  // shortcut: simple declarations exclude full CSS grammar, use a parser before expanding syntax support.
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const structure = withoutComments.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "");
  if (!structure.includes("{"))
    throw new Error("No CSS rules were found. Choose a stylesheet with rules and values.");
  let depth = 0;
  for (const character of structure) {
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth < 0) throw new Error("CSS has a closing brace without a matching opening brace.");
  }
  if (depth !== 0)
    throw new Error("CSS has an unclosed rule. Check its opening and closing braces.");

  const declarationSource = withoutComments.replace(/@[\w-]+[^{}]*\{/g, "");
  const declarations = [
    ...declarationSource.matchAll(/(--[\w-]+|[a-zA-Z-]+)\s*:\s*([^;{}]+)(?:;|(?=\}))/g),
  ];
  if (declarations.length === 0)
    throw new Error("No CSS declarations were found. Choose a stylesheet with rules and values.");
  const candidates = new Map<string, StyleCandidate>();
  const unsupported = new Map<string, UnsupportedStyleValue>();

  for (const declaration of declarations) {
    const source = declaration[1].toLowerCase();
    const match = classifyValue(source, declaration[2].trim());
    if (!match) {
      const value = declaration[2].trim();
      const id = `${source}:${value}`;
      const existing = unsupported.get(id);
      if (existing) existing.occurrences += 1;
      else
        unsupported.set(id, {
          id,
          source,
          value: truncate(value),
          occurrences: 1,
          reason: unsupportedReason(value),
        });
      continue;
    }

    const id = `${match.type}:${match.value.toLowerCase()}`;
    const existing = candidates.get(id);
    if (existing) {
      existing.occurrences += 1;
      if (!existing.sources.includes(source)) existing.sources.push(source);
    } else {
      candidates.set(id, { id, ...match, occurrences: 1, sources: [source] });
    }
  }

  const values = [...candidates.values()].sort(
    (a, b) => b.occurrences - a.occurrences || a.value.localeCompare(b.value),
  );
  return {
    declarationCount: declarations.length,
    variableCount: declarations.filter((declaration) => declaration[1].startsWith("--")).length,
    unsupportedCount: [...unsupported.values()].reduce(
      (total, item) => total + item.occurrences,
      0,
    ),
    unsupported: [...unsupported.values()].sort(
      (a, b) => b.occurrences - a.occurrences || a.source.localeCompare(b.source),
    ),
    candidates: values,
  };
}

export function createStyleImportCommand(
  { candidate, tokenId }: StyleMapping,
  mode: TokenMode,
): TokenCommand {
  const value = parseTokenInput(candidate.type, candidate.value);
  return candidate.type === "color"
    ? { type: "set-color", tokenId, mode, value: value as string }
    : { type: "set-token-value", tokenId, mode, value };
}

function classifyValue(
  source: string,
  rawValue: string,
): Pick<StyleCandidate, "type" | "value"> | null {
  const color = normalizeHex(rawValue);
  if (color) return { type: "color", value: color };

  if (/^-?\d+(?:\.\d+)?(?:px|rem)$/.test(rawValue)) return valid("dimension", rawValue);
  if ((source === "font-weight" || source.includes("weight")) && /^\d{3}$/.test(rawValue))
    return valid("fontWeight", rawValue);
  if (
    (source === "line-height" || source.includes("line-height")) &&
    /^-?\d+(?:\.\d+)?$/.test(rawValue)
  )
    return valid("number", rawValue);

  const fontFamily = rawValue.replace(/^['"]|['"]$/g, "");
  if (
    (source === "font-family" || source.includes("font")) &&
    supportedFontFamilies.has(fontFamily)
  )
    return valid("fontFamily", fontFamily);
  if ((source === "box-shadow" || source.includes("shadow")) && rawValue.includes("#"))
    return valid("shadow", rawValue);

  return null;
}

function valid(type: Token["type"], value: string) {
  try {
    parseTokenInput(type, value);
    return { type, value };
  } catch {
    return null;
  }
}

function normalizeHex(value: string) {
  const match = value.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;
  const hex =
    match[1].length === 3
      ? [...match[1]].map((character) => character.repeat(2)).join("")
      : match[1];
  return `#${hex.toUpperCase()}`;
}

function unsupportedReason(value: string) {
  if (/\b(?:var|calc|min|max|clamp)\(/i.test(value)) return "Computed values aren't resolved.";
  if (/^(?:rgb|rgba|hsl|hsla|oklch|color)\(/i.test(value))
    return "Convert this color to six-digit hex.";
  if (/\s/.test(value)) return "Composite values aren't split automatically.";
  return "This value type isn't supported yet.";
}

function truncate(value: string) {
  return value.length > 120 ? `${value.slice(0, 117)}…` : value;
}
