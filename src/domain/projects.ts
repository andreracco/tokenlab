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

export type ReleaseBump = "major" | "minor" | "patch" | "none";

export type ProjectReleaseReport = {
  bump: ReleaseBump;
  addedTokens: string[];
  removedTokens: string[];
  updates: ProjectDiff[];
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

export function buildReleaseReport(changes: ProjectDiff[]): ProjectReleaseReport {
  const addedTokens = [
    ...new Set(
      changes.filter((change) => change.before === "Removed").map((change) => change.path),
    ),
  ];
  const removedTokens = [
    ...new Set(changes.filter((change) => change.after === "Removed").map((change) => change.path)),
  ];
  const updates = changes.filter(
    (change) => change.before !== "Removed" && change.after !== "Removed",
  );
  const bump: ReleaseBump =
    removedTokens.length > 0
      ? "major"
      : addedTokens.length > 0
        ? "minor"
        : updates.length > 0
          ? "patch"
          : "none";

  return { bump, addedTokens, removedTokens, updates };
}

export function formatReleaseNotes(baselineName: string, report: ProjectReleaseReport): string {
  const lines = [
    `# Token release notes`,
    `Baseline: ${baselineName}`,
    `Suggested version bump: ${report.bump.toUpperCase()}`,
    "",
  ];

  if (report.removedTokens.length > 0)
    lines.push("## Removed tokens", ...report.removedTokens.map((path) => `- \`${path}\``), "");
  if (report.addedTokens.length > 0)
    lines.push("## Added tokens", ...report.addedTokens.map((path) => `- \`${path}\``), "");
  if (report.updates.length > 0)
    lines.push(
      "## Updated values",
      ...report.updates.map(
        ({ path, mode, before, after }) => `- \`${path}\` (${mode}): \`${before}\` → \`${after}\``,
      ),
      "",
    );

  return `${lines.join("\n").trimEnd()}\n`;
}

function definition(document: ProjectDocument, tokenId: string, mode: TokenMode): string {
  const token = document.tokens.find((candidate) => candidate.id === tokenId)!;
  const value = token.values[mode] ?? token.values.light;
  return value.kind === "reference"
    ? `→ ${value.tokenId}`
    : resolveCssValue(document, tokenId, mode);
}
