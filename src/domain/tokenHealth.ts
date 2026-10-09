import { checkContrast } from "./contrast";
import { applyCommand, type ProjectDocument, type Token, type TokenMode } from "./tokens";

type RegisteredComponent = { tokenIds: readonly string[] };

export type TokenHealthReport = {
  tokenCount: number;
  referencedTokenCount: number;
  unusedTokens: Token[];
  duplicateValues: DuplicateValueGroup[];
  aliasCount: number;
  aliasIssues: AliasIssue[];
  contrastChecks: {
    mode: TokenMode;
    result: ReturnType<typeof checkContrast>[number];
    suggestion?: ContrastSuggestion;
  }[];
};

export type ContrastSuggestion = {
  tokenId: string;
  tokenPath: string;
  projectedRatio: number;
};

export type DuplicateValueGroup = {
  type: Token["type"];
  value: string;
  tokenIds: string[];
  paths: string[];
  modes: TokenMode[];
};

export type AliasIssue =
  | { kind: "missing"; mode: TokenMode; tokenId: string; targetId: string }
  | { kind: "incompatible"; mode: TokenMode; tokenId: string; targetId: string }
  | { kind: "cycle"; mode: TokenMode; tokenIds: string[] };

const modes: TokenMode[] = ["light", "dark"];

export function analyzeTokenHealth(
  document: ProjectDocument,
  components: readonly RegisteredComponent[],
): TokenHealthReport {
  const tokensById = new Map(document.tokens.map((token) => [token.id, token]));
  const referencedTokenIds = new Set<string>();

  for (const mode of modes) {
    for (const component of components) {
      for (const tokenId of component.tokenIds) {
        let token = tokensById.get(tokenId);
        const visited = new Set<string>();

        while (token && !visited.has(token.id)) {
          visited.add(token.id);
          referencedTokenIds.add(token.id);
          const value = token.values[mode] ?? token.values.light;
          token = value.kind === "reference" ? tokensById.get(value.tokenId) : undefined;
        }
      }
    }
  }

  const unusedTokens = document.tokens.filter((token) => !referencedTokenIds.has(token.id));
  const duplicateValues = findDuplicateValues(document);
  const aliasIssues = findAliasIssues(document, tokensById);
  const contrastChecks = modes.flatMap((mode) =>
    checkContrast(document, mode).map((result) => ({
      mode,
      result,
      ...(!result.passes ? { suggestion: suggestContrastFix(document, mode, result.id) } : {}),
    })),
  );

  return {
    tokenCount: document.tokens.length,
    referencedTokenCount: referencedTokenIds.size,
    unusedTokens,
    duplicateValues,
    aliasCount: document.tokens.filter((token) =>
      modes.some((mode) => (token.values[mode] ?? token.values.light).kind === "reference"),
    ).length,
    aliasIssues,
    contrastChecks,
  };
}

export function suggestContrastFix(
  document: ProjectDocument,
  mode: TokenMode,
  pairId: string,
): ContrastSuggestion | undefined {
  const pair = checkContrast(document, mode).find((result) => result.id === pairId);
  const foreground = pair && document.tokens.find((token) => token.id === pair.foreground);
  if (
    !pair ||
    pair.passes ||
    !foreground ||
    foreground.type !== "color" ||
    foreground.layer !== "semantic"
  ) {
    return undefined;
  }

  return document.tokens
    .filter(
      (token): token is Extract<Token, { type: "color" }> =>
        token.type === "color" &&
        token.layer === "primitive" &&
        token.path.startsWith("color.neutral.") &&
        token.id !== foreground.id,
    )
    .flatMap((token) => {
      try {
        const candidate = applyCommand(document, {
          type: "set-token-reference",
          tokenId: foreground.id,
          mode,
          targetId: token.id,
        });
        const projected = checkContrast(candidate, mode).find((result) => result.id === pairId);
        return projected?.passes
          ? [{ tokenId: token.id, tokenPath: token.path, projectedRatio: projected.ratio }]
          : [];
      } catch {
        return [];
      }
    })
    .sort(
      (left, right) =>
        left.projectedRatio - right.projectedRatio || left.tokenPath.localeCompare(right.tokenPath),
    )[0];
}

function findDuplicateValues(document: ProjectDocument): DuplicateValueGroup[] {
  const groups = new Map<string, DuplicateValueGroup>();

  for (const mode of modes) {
    const values = new Map<string, Token[]>();
    for (const token of document.tokens) {
      const value = token.values[mode] ?? token.values.light;
      if (value.kind !== "literal") continue;

      const identity = `${token.type}:${stableValue(value.value)}`;
      values.set(identity, [...(values.get(identity) ?? []), token]);
    }

    for (const [identity, tokens] of values) {
      if (tokens.length < 2) continue;
      const orderedTokens = [...tokens].sort((left, right) => left.path.localeCompare(right.path));
      const tokenIds = orderedTokens.map((token) => token.id);
      const groupKey = `${identity}:${tokenIds.join("|")}`;
      const existing = groups.get(groupKey);
      if (existing) {
        existing.modes.push(mode);
      } else {
        const value = tokens[0].values[mode] ?? tokens[0].values.light;
        groups.set(groupKey, {
          type: tokens[0].type,
          value: value.kind === "literal" ? displayValue(value.value) : "",
          tokenIds,
          paths: orderedTokens.map((token) => token.path),
          modes: [mode],
        });
      }
    }
  }

  return [...groups.values()];
}

function findAliasIssues(document: ProjectDocument, tokensById: Map<string, Token>): AliasIssue[] {
  const issues = new Map<string, AliasIssue>();

  for (const mode of modes) {
    for (const start of document.tokens) {
      const visited = new Map<string, number>();
      const chain: string[] = [];
      let token: Token | undefined = start;

      while (token) {
        const cycleStart = visited.get(token.id);
        if (cycleStart !== undefined) {
          const tokenIds = chain.slice(cycleStart).sort();
          const key = `cycle:${mode}:${tokenIds.join("|")}`;
          issues.set(key, { kind: "cycle", mode, tokenIds });
          break;
        }

        visited.set(token.id, chain.length);
        chain.push(token.id);
        const value = token.values[mode] ?? token.values.light;
        if (value.kind === "literal") break;

        const target = tokensById.get(value.tokenId);
        if (!target || target.type !== token.type) {
          const kind = target ? "incompatible" : "missing";
          const key = `${kind}:${mode}:${token.id}:${value.tokenId}`;
          issues.set(key, { kind, mode, tokenId: token.id, targetId: value.tokenId });
          break;
        }
        token = target;
      }
    }
  }

  return [...issues.values()];
}

function stableValue(value: unknown): string {
  if (typeof value === "string") return value.toUpperCase();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
      ),
    );
  }
  return JSON.stringify(value);
}

function displayValue(value: unknown): string {
  if (typeof value !== "object" || value === null) return String(value);
  if ("value" in value && "unit" in value) return `${value.value}${value.unit}`;
  if (
    "offsetX" in value &&
    "offsetY" in value &&
    "blur" in value &&
    "spread" in value &&
    "color" in value
  ) {
    return `${value.offsetX}px ${value.offsetY}px ${value.blur}px ${value.spread}px ${value.color}`;
  }
  return JSON.stringify(value);
}
