import { z } from "zod";

export const colorValueSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color.");
const presetIdSchema = z.enum(["editorial", "product", "expressive"]);
const dimensionValueSchema = z.object({ value: z.number(), unit: z.enum(["px", "rem"]) });
const shadowValueSchema = z.object({
  offsetX: z.number(),
  offsetY: z.number(),
  blur: z.number().nonnegative(),
  spread: z.number(),
  color: colorValueSchema,
});
const fontFamilyValueSchema = z.enum(["Inter", "Georgia", "Avenir Next"]);
const referenceValueSchema = z.object({ kind: z.literal("reference"), tokenId: z.string().min(1) });

function valuesSchema<T extends z.ZodType>(literalSchema: T) {
  const literalValueSchema = z.object({ kind: z.literal("literal"), value: literalSchema });
  const tokenValueSchema = z.union([literalValueSchema, referenceValueSchema]);
  return z.object({ light: tokenValueSchema, dark: tokenValueSchema.optional() });
}

const tokenBaseSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  layer: z.enum(["primitive", "semantic"]),
  description: z.string(),
});

const tokenSchema = z.discriminatedUnion("type", [
  tokenBaseSchema.extend({ type: z.literal("color"), values: valuesSchema(colorValueSchema) }),
  tokenBaseSchema.extend({ type: z.literal("dimension"), values: valuesSchema(dimensionValueSchema) }),
  tokenBaseSchema.extend({ type: z.literal("fontFamily"), values: valuesSchema(fontFamilyValueSchema) }),
  tokenBaseSchema.extend({ type: z.literal("fontWeight"), values: valuesSchema(z.number().int().min(100).max(900)) }),
  tokenBaseSchema.extend({ type: z.literal("number"), values: valuesSchema(z.number()) }),
  tokenBaseSchema.extend({ type: z.literal("shadow"), values: valuesSchema(shadowValueSchema) }),
]);

const projectBaseSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  presetId: presetIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tokens: z.array(tokenSchema),
});

export const projectSchema = projectBaseSchema.superRefine((document, context) => {
  const tokensById = new Map(document.tokens.map((token) => [token.id, token]));
  const ids = new Set<string>();
  const paths = new Set<string>();

  document.tokens.forEach((token, index) => {
    if (ids.has(token.id)) context.addIssue({ code: "custom", message: `Duplicate token ID: ${token.id}`, path: ["tokens", index, "id"] });
    if (paths.has(token.path)) context.addIssue({ code: "custom", message: `Duplicate token path: ${token.path}`, path: ["tokens", index, "path"] });
    ids.add(token.id);
    paths.add(token.path);
  });

  document.tokens.forEach((token, index) => {
    (["light", "dark"] as const).forEach((mode) => {
      const visited = new Set([token.id]);
      let current = token;

      while (true) {
        const value = current.values[mode] ?? current.values.light;
        if (value.kind === "literal") break;

        const target = tokensById.get(value.tokenId);
        if (!target) {
          context.addIssue({ code: "custom", message: `Missing token reference: ${value.tokenId}`, path: ["tokens", index, "values", mode] });
          break;
        }
        if (target.type !== current.type) {
          context.addIssue({ code: "custom", message: `Incompatible ${current.type} reference: ${value.tokenId}`, path: ["tokens", index, "values", mode] });
          break;
        }
        if (visited.has(target.id)) {
          context.addIssue({ code: "custom", message: `Circular token reference: ${target.id}`, path: ["tokens", index, "values", mode] });
          break;
        }

        visited.add(target.id);
        current = target;
      }
    });
  });
});

export type ProjectDocument = z.infer<typeof projectSchema>;
export type Token = ProjectDocument["tokens"][number];
export type TokenMode = "light" | "dark";
export type PresetId = z.infer<typeof presetIdSchema>;
export type ResolvedTokenValue = string | number | z.infer<typeof dimensionValueSchema> | z.infer<typeof shadowValueSchema>;

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

// ponytail: keep preset fixture values here until their corresponding editors consume typed tokens.
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
  if (token.type !== "color" || token.layer !== "primitive") throw new Error("Only primitive colors are directly editable.");

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
): ResolvedTokenValue {
  if (visited.has(tokenId)) throw new Error(`Circular token reference: ${tokenId}`);

  const token = document.tokens.find((candidate) => candidate.id === tokenId);
  if (!token) throw new Error(`Unknown token reference: ${tokenId}`);

  const value = token.values[mode] ?? token.values.light;
  if (value.kind === "literal") return value.value;

  const target = document.tokens.find((candidate) => candidate.id === value.tokenId);
  if (!target || target.type !== token.type) throw new Error(`Invalid token reference: ${value.tokenId}`);

  return resolveToken(document, value.tokenId, mode, new Set(visited).add(tokenId));
}

export function resolveColorToken(document: ProjectDocument, tokenId: string, mode: TokenMode = "light"): string {
  const token = document.tokens.find((candidate) => candidate.id === tokenId);
  if (token?.type !== "color") throw new Error(`Not a color token: ${tokenId}`);
  return resolveToken(document, tokenId, mode) as string;
}
