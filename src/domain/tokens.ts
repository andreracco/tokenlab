import { z } from "zod";

export const colorValueSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color.");
const presetIdSchema = z.enum(["editorial", "product", "expressive"]);

const tokenValueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("literal"), value: colorValueSchema }),
  z.object({ kind: z.literal("reference"), tokenId: z.string().min(1) }),
]);

const tokenSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  type: z.literal("color"),
  layer: z.enum(["primitive", "semantic"]),
  description: z.string(),
  values: z.object({
    light: tokenValueSchema,
    dark: tokenValueSchema.optional(),
  }),
});

export const projectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  presetId: presetIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tokens: z.array(tokenSchema),
});

export type ProjectDocument = z.infer<typeof projectSchema>;
export type Token = ProjectDocument["tokens"][number];
export type TokenMode = "light" | "dark";
export type PresetId = z.infer<typeof presetIdSchema>;

export type TokenCommand =
  | { type: "set-color"; tokenId: string; mode: TokenMode; value: string }
  | { type: "select-preset"; presetId: PresetId };

type PresetSpec = {
  id: PresetId;
  name: string;
  description: string;
  primaryColor: string;
  preview: {
    fontFamily: string;
    contentPadding: string;
    cardPadding: string;
    cardGap: string;
    radius: string;
    shadow: string;
    surface: string;
    sidebar: string;
  };
};

// ponytail: preview-only values become typed tokens when those categories land in Milestone 2.
export const presetSpecs: Record<PresetId, PresetSpec> = {
  editorial: {
    id: "editorial",
    name: "Editorial",
    description: "Warm, spacious, and typographic.",
    primaryColor: "#A34B32",
    preview: {
      fontFamily: "Georgia, 'Times New Roman', serif",
      contentPadding: "32px 34px",
      cardPadding: "17px",
      cardGap: "16px",
      radius: "4px",
      shadow: "0 1px 0 rgba(73, 52, 38, .08)",
      surface: "#FFFCF7",
      sidebar: "#F4EEE5",
    },
  },
  product: {
    id: "product",
    name: "Product",
    description: "Balanced, clear, and familiar.",
    primaryColor: "#3157D5",
    preview: {
      fontFamily: "Inter, ui-sans-serif, sans-serif",
      contentPadding: "27px 28px",
      cardPadding: "14px",
      cardGap: "12px",
      radius: "9px",
      shadow: "none",
      surface: "#FBFBFC",
      sidebar: "#F7F8FA",
    },
  },
  expressive: {
    id: "expressive",
    name: "Expressive",
    description: "Bold, compact, and highly rounded.",
    primaryColor: "#8B3FD1",
    preview: {
      fontFamily: "'Avenir Next', 'Trebuchet MS', sans-serif",
      contentPadding: "23px 24px",
      cardPadding: "13px",
      cardGap: "10px",
      radius: "16px",
      shadow: "0 8px 24px rgba(83, 42, 120, .12)",
      surface: "#FCF9FF",
      sidebar: "#F3ECFA",
    },
  },
};

export const presetOptions = Object.values(presetSpecs);

const createdAt = new Date().toISOString();

function createPresetTokens(primaryColor: string) {
  return [
    {
      id: "color.brand.600",
      path: "color.brand.600",
      type: "color",
      layer: "primitive",
      description: "Core brand color used by prominent actions.",
      values: { light: { kind: "literal" as const, value: primaryColor } },
    },
    {
      id: "action.primary.background",
      path: "action.primary.background",
      type: "color",
      layer: "semantic",
      description: "Background for the primary product action.",
      values: { light: { kind: "reference" as const, tokenId: "color.brand.600" } },
    },
  ];
}

export const initialProject = projectSchema.parse({
  schemaVersion: 1,
  id: "local-draft",
  name: "Product — Local draft",
  presetId: "product",
  createdAt,
  updatedAt: createdAt,
  tokens: createPresetTokens(presetSpecs.product.primaryColor),
});

export function applyCommand(document: ProjectDocument, command: TokenCommand): ProjectDocument {
  if (command.type === "select-preset") {
    const preset = presetSpecs[command.presetId];
    return projectSchema.parse({
      ...document,
      name: `${preset.name} — Local draft`,
      presetId: preset.id,
      updatedAt: new Date().toISOString(),
      tokens: createPresetTokens(preset.primaryColor),
    });
  }

  const value = colorValueSchema.parse(command.value).toUpperCase();
  const token = document.tokens.find((candidate) => candidate.id === command.tokenId);

  if (!token) throw new Error(`Unknown token: ${command.tokenId}`);
  if (token.layer !== "primitive") throw new Error("Only primitive colors are directly editable.");

  return projectSchema.parse({
    ...document,
    updatedAt: new Date().toISOString(),
    tokens: document.tokens.map((candidate) =>
      candidate.id === command.tokenId
        ? { ...candidate, values: { ...candidate.values, [command.mode]: { kind: "literal", value } } }
        : candidate,
    ),
  });
}

export function resolveToken(
  document: ProjectDocument,
  tokenId: string,
  mode: TokenMode = "light",
  visited = new Set<string>(),
): string {
  if (visited.has(tokenId)) throw new Error(`Circular token reference: ${tokenId}`);

  const token = document.tokens.find((candidate) => candidate.id === tokenId);
  if (!token) throw new Error(`Unknown token reference: ${tokenId}`);

  const value = token.values[mode] ?? token.values.light;
  if (value.kind === "literal") return value.value;

  const target = document.tokens.find((candidate) => candidate.id === value.tokenId);
  if (!target || target.type !== token.type) throw new Error(`Invalid token reference: ${value.tokenId}`);

  return resolveToken(document, value.tokenId, mode, new Set(visited).add(tokenId));
}
