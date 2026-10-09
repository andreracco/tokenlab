import { resolveCssValue, type ProjectDocument, type TokenMode } from "./tokens";

export type ProjectSnapshot = {
  id: string;
  name: string;
  createdAt: string;
  document: ProjectDocument;
};

export type ProjectDiff = {
  path: string;
  mode: TokenMode;
  before: string;
  after: string;
};

export function createSnapshot(document: ProjectDocument, name: string): ProjectSnapshot {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    document: structuredClone(document),
  };
}

export function diffProjects(before: ProjectDocument, after: ProjectDocument): ProjectDiff[] {
  const beforeTokens = new Map(before.tokens.map((token) => [token.id, token]));
  const afterTokens = new Map(after.tokens.map((token) => [token.id, token]));
  const ids = new Set([...beforeTokens.keys(), ...afterTokens.keys()]);
  const changes: ProjectDiff[] = [];

  for (const id of ids) {
    for (const mode of ["light", "dark"] as const) {
      const beforeToken = beforeTokens.get(id);
      const afterToken = afterTokens.get(id);
      const beforeValue = beforeToken ? definition(before, id, mode) : "Removed";
      const afterValue = afterToken ? definition(after, id, mode) : "Removed";
      if (beforeValue !== afterValue)
        changes.push({
          path: afterToken?.path ?? beforeToken?.path ?? id,
          mode,
          before: beforeValue,
          after: afterValue,
        });
    }
  }

  return changes;
}

function definition(document: ProjectDocument, tokenId: string, mode: TokenMode): string {
  const token = document.tokens.find((candidate) => candidate.id === tokenId)!;
  const value = token.values[mode] ?? token.values.light;
  return value.kind === "reference"
    ? `→ ${value.tokenId}`
    : resolveCssValue(document, tokenId, mode);
}
