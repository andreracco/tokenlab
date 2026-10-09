import {
  projectSchema,
  upgradeProject,
  type ProjectDocument,
  type Token,
  type TokenMode,
} from "./tokens";
import type { ProjectSnapshot } from "./projects";

export type ExportArtifact = { filename: string; mimeType: string; content: string };

export function buildExports(
  document: ProjectDocument,
  snapshots: ProjectSnapshot[],
): ExportArtifact[] {
  return [
    { filename: "tokenlab.css", mimeType: "text/css", content: exportCss(document) },
    {
      filename: "tokenlab.light.tokens.json",
      mimeType: "application/json",
      content: exportDtcg(document, "light"),
    },
    {
      filename: "tokenlab.dark.tokens.json",
      mimeType: "application/json",
      content: exportDtcg(document, "dark"),
    },
    { filename: "tokenlab.tailwind.css", mimeType: "text/css", content: exportTailwind(document) },
    {
      filename: "tokenlab.project.json",
      mimeType: "application/json",
      content: exportProject(document, snapshots),
    },
  ];
}

export function exportCss(document: ProjectDocument): string {
  assertUniqueNames(document);
  const light = document.tokens
    .map((token) => `  --${cssName(token.path)}: ${cssDefinition(document, token, "light")};`)
    .join("\n");
  const dark = document.tokens
    .filter((token) => token.values.dark)
    .map((token) => `  --${cssName(token.path)}: ${cssDefinition(document, token, "dark")};`)
    .join("\n");
  return `:root {\n${light}\n}\n\n[data-theme="dark"] {\n${dark}\n}\n`;
}

export function exportDtcg(document: ProjectDocument, mode: TokenMode): string {
  const output: Record<string, unknown> = {};
  for (const token of document.tokens) {
    const value = token.values[mode] ?? token.values.light;
    setNested(output, token.path.split("."), {
      $type: dtcgType(token.type),
      $description: token.description,
      $value:
        value.kind === "reference"
          ? `{${document.tokens.find((candidate) => candidate.id === value.tokenId)?.path ?? value.tokenId}}`
          : value.value,
    });
  }
  return `${JSON.stringify(output, null, 2)}\n`;
}

export function exportTailwind(document: ProjectDocument): string {
  return `${exportCss(document)}\n@theme inline {\n  --color-primary: var(--action-primary-background);\n  --color-surface: var(--surface-page);\n  --color-panel: var(--surface-panel);\n  --color-foreground: var(--text-primary);\n  --font-sans: var(--typography-body-family);\n  --radius-card: var(--component-card-radius);\n  --shadow-card: var(--component-card-shadow);\n}\n`;
}

export function exportProject(document: ProjectDocument, snapshots: ProjectSnapshot[]): string {
  return `${JSON.stringify({ format: "tokenlab", version: 1, document, snapshots }, null, 2)}\n`;
}

export function parseProjectFile(input: string): {
  document: ProjectDocument;
  snapshots: ProjectSnapshot[];
} {
  let data: { format?: unknown; version?: unknown; document?: unknown; snapshots?: unknown };
  try {
    data = JSON.parse(input) as typeof data;
  } catch {
    throw new Error("Project file is not valid JSON.");
  }
  if (data.format !== "tokenlab" || data.version !== 1)
    throw new Error("Unsupported TokenLab project file.");
  const document = upgradeProject(projectSchema.parse(data.document));
  if (!Array.isArray(data.snapshots)) throw new Error("Project snapshots must be an array.");
  const snapshots = data.snapshots.map((snapshot) => {
    const candidate = snapshot as Partial<ProjectSnapshot>;
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.name !== "string" ||
      typeof candidate.createdAt !== "string"
    )
      throw new Error("Invalid project snapshot.");
    return {
      id: candidate.id,
      name: candidate.name,
      createdAt: candidate.createdAt,
      document: upgradeProject(projectSchema.parse(candidate.document)),
    };
  });
  return { document, snapshots };
}

function cssDefinition(document: ProjectDocument, token: Token, mode: TokenMode): string {
  const value = token.values[mode] ?? token.values.light;
  if (value.kind === "reference") {
    const target = document.tokens.find((candidate) => candidate.id === value.tokenId);
    if (!target) throw new Error(`Missing export reference: ${value.tokenId}`);
    return `var(--${cssName(target.path)})`;
  }
  if (token.type === "dimension") {
    const dimension = value.value as { value: number; unit: "px" | "rem" };
    return `${dimension.value}${dimension.unit}`;
  }
  if (token.type === "shadow") {
    const shadow = value.value as {
      offsetX: number;
      offsetY: number;
      blur: number;
      spread: number;
      color: string;
    };
    return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`;
  }
  return String(value.value);
}

function assertUniqueNames(document: ProjectDocument) {
  const names = new Set<string>();
  for (const token of document.tokens) {
    const name = cssName(token.path);
    if (names.has(name)) throw new Error(`Generated CSS name collision: --${name}`);
    names.add(name);
  }
}

function cssName(path: string) {
  return path
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function dtcgType(type: Token["type"]) {
  return type === "fontFamily" ? "fontFamily" : type === "fontWeight" ? "fontWeight" : type;
}

function setNested(target: Record<string, unknown>, path: string[], value: unknown) {
  const final = path.pop()!;
  let current = target;
  for (const segment of path) {
    if (!current[segment]) current[segment] = {};
    current = current[segment] as Record<string, unknown>;
  }
  current[final] = value;
}
