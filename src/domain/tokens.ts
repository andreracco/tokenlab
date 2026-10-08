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
  | { type: "set-token-value"; tokenId: string; mode: TokenMode; value: ResolvedTokenValue }
  | { type: "set-token-reference"; tokenId: string; mode: TokenMode; targetId: string }
  | { type: "select-preset"; presetId: PresetId };

type PresetSpec = {
  id: PresetId;
  name: string;
  description: string;
  values: {
    brand: [string, string];
    canvas: [string, string];
    panel: [string, string];
    border: [string, string];
    text: [string, string];
    muted: [string, string];
    spacing: [number, number, number];
    radius: [number, number];
    fontFamily: "Inter" | "Georgia" | "Avenir Next";
    fontSize: number;
    weights: [number, number];
    lineHeight: number;
    shadow: z.infer<typeof shadowValueSchema>;
  };
};

export const presetSpecs: Record<PresetId, PresetSpec> = {
  editorial: {
    id: "editorial",
    name: "Editorial",
    description: "Warm, spacious, and typographic.",
    values: {
      brand: ["#A34B32", "#D9876F"], canvas: ["#FFFCF7", "#211D19"], panel: ["#FFFFFF", "#2B2520"],
      border: ["#E7DED2", "#4A4037"], text: ["#2D2925", "#F7F0E8"], muted: ["#796F65", "#BFB2A5"],
      spacing: [12, 17, 34], radius: [3, 4], fontFamily: "Georgia", fontSize: 14, weights: [400, 700], lineHeight: 1.55,
      shadow: { offsetX: 0, offsetY: 1, blur: 0, spread: 0, color: "#E7DED2" },
    },
  },
  product: {
    id: "product",
    name: "Product",
    description: "Balanced, clear, and familiar.",
    values: {
      brand: ["#3157D5", "#7592F3"], canvas: ["#FBFBFC", "#15171C"], panel: ["#FFFFFF", "#20232A"],
      border: ["#E4E7EB", "#353A44"], text: ["#20242A", "#F4F5F7"], muted: ["#6B7280", "#AAB0BA"],
      spacing: [10, 14, 28], radius: [7, 9], fontFamily: "Inter", fontSize: 14, weights: [500, 700], lineHeight: 1.45,
      shadow: { offsetX: 0, offsetY: 0, blur: 0, spread: 0, color: "#E4E7EB" },
    },
  },
  expressive: {
    id: "expressive",
    name: "Expressive",
    description: "Bold, compact, and highly rounded.",
    values: {
      brand: ["#8B3FD1", "#C58AF2"], canvas: ["#FCF9FF", "#19131E"], panel: ["#FFFFFF", "#281D30"],
      border: ["#E8DDF0", "#4A3658"], text: ["#281D30", "#F9F2FD"], muted: ["#7C6788", "#C2AECF"],
      spacing: [9, 13, 24], radius: [12, 16], fontFamily: "Avenir Next", fontSize: 14, weights: [500, 800], lineHeight: 1.4,
      shadow: { offsetX: 0, offsetY: 8, blur: 24, spread: 0, color: "#E8DDF0" },
    },
  },
};

export const presetOptions = Object.values(presetSpecs);

const createdAt = new Date().toISOString();

function createPresetTokens(preset: PresetSpec) {
  const literal = (value: unknown, dark?: unknown) => ({
    light: { kind: "literal" as const, value },
    ...(dark === undefined ? {} : { dark: { kind: "literal" as const, value: dark } }),
  });
  const reference = (tokenId: string) => ({ light: { kind: "reference" as const, tokenId } });
  const [small, medium, large] = preset.values.spacing;
  const [controlRadius, panelRadius] = preset.values.radius;
  const [regularWeight, strongWeight] = preset.values.weights;

  return [
    { id: "color.brand.600", path: "color.brand.600", type: "color", layer: "primitive", description: "Core brand color.", values: literal(...preset.values.brand) },
    { id: "color.neutral.canvas", path: "color.neutral.canvas", type: "color", layer: "primitive", description: "Canvas neutral.", values: literal(...preset.values.canvas) },
    { id: "color.neutral.panel", path: "color.neutral.panel", type: "color", layer: "primitive", description: "Panel neutral.", values: literal(...preset.values.panel) },
    { id: "color.neutral.border", path: "color.neutral.border", type: "color", layer: "primitive", description: "Border neutral.", values: literal(...preset.values.border) },
    { id: "color.neutral.text", path: "color.neutral.text", type: "color", layer: "primitive", description: "Primary text neutral.", values: literal(...preset.values.text) },
    { id: "color.neutral.muted", path: "color.neutral.muted", type: "color", layer: "primitive", description: "Muted text neutral.", values: literal(...preset.values.muted) },
    { id: "color.white", path: "color.white", type: "color", layer: "primitive", description: "Text on strong colors.", values: literal("#FFFFFF") },
    { id: "color.error.text", path: "color.error.text", type: "color", layer: "primitive", description: "Error text color.", values: literal("#B42318", "#FDA29B") },
    { id: "color.error.surface", path: "color.error.surface", type: "color", layer: "primitive", description: "Error surface color.", values: literal("#FEF3F2", "#3B1515") },
    { id: "space.small", path: "space.small", type: "dimension", layer: "primitive", description: "Compact spacing.", values: literal({ value: small, unit: "px" }) },
    { id: "space.medium", path: "space.medium", type: "dimension", layer: "primitive", description: "Component spacing.", values: literal({ value: medium, unit: "px" }) },
    { id: "space.large", path: "space.large", type: "dimension", layer: "primitive", description: "Content spacing.", values: literal({ value: large, unit: "px" }) },
    { id: "radius.control", path: "radius.control", type: "dimension", layer: "primitive", description: "Control corner radius.", values: literal({ value: controlRadius, unit: "px" }) },
    { id: "radius.panel", path: "radius.panel", type: "dimension", layer: "primitive", description: "Panel corner radius.", values: literal({ value: panelRadius, unit: "px" }) },
    { id: "font.family.ui", path: "font.family.ui", type: "fontFamily", layer: "primitive", description: "Interface typeface.", values: literal(preset.values.fontFamily) },
    { id: "font.size.body", path: "font.size.body", type: "dimension", layer: "primitive", description: "Body text size.", values: literal({ value: preset.values.fontSize, unit: "px" }) },
    { id: "font.weight.regular", path: "font.weight.regular", type: "fontWeight", layer: "primitive", description: "Regular text weight.", values: literal(regularWeight) },
    { id: "font.weight.strong", path: "font.weight.strong", type: "fontWeight", layer: "primitive", description: "Strong text weight.", values: literal(strongWeight) },
    { id: "line-height.body", path: "line-height.body", type: "number", layer: "primitive", description: "Body line height.", values: literal(preset.values.lineHeight) },
    { id: "shadow.card", path: "shadow.card", type: "shadow", layer: "primitive", description: "Card elevation.", values: literal(preset.values.shadow) },
    { id: "action.primary.background", path: "action.primary.background", type: "color", layer: "semantic", description: "Primary action background.", values: reference("color.brand.600") },
    { id: "action.primary.foreground", path: "action.primary.foreground", type: "color", layer: "semantic", description: "Primary action label.", values: reference("color.white") },
    { id: "surface.page", path: "surface.page", type: "color", layer: "semantic", description: "Page surface.", values: reference("color.neutral.canvas") },
    { id: "surface.panel", path: "surface.panel", type: "color", layer: "semantic", description: "Panel surface.", values: reference("color.neutral.panel") },
    { id: "border.default", path: "border.default", type: "color", layer: "semantic", description: "Default border.", values: reference("color.neutral.border") },
    { id: "text.primary", path: "text.primary", type: "color", layer: "semantic", description: "Primary text.", values: reference("color.neutral.text") },
    { id: "text.muted", path: "text.muted", type: "color", layer: "semantic", description: "Muted text.", values: reference("color.neutral.muted") },
    { id: "feedback.error.text", path: "feedback.error.text", type: "color", layer: "semantic", description: "Error message text.", values: reference("color.error.text") },
    { id: "feedback.error.surface", path: "feedback.error.surface", type: "color", layer: "semantic", description: "Error message surface.", values: reference("color.error.surface") },
    { id: "layout.content.padding", path: "layout.content.padding", type: "dimension", layer: "semantic", description: "Page content padding.", values: reference("space.large") },
    { id: "layout.card.gap", path: "layout.card.gap", type: "dimension", layer: "semantic", description: "Card grid gap.", values: reference("space.small") },
    { id: "component.control.radius", path: "component.control.radius", type: "dimension", layer: "semantic", description: "Control radius.", values: reference("radius.control") },
    { id: "component.card.radius", path: "component.card.radius", type: "dimension", layer: "semantic", description: "Card radius.", values: reference("radius.panel") },
    { id: "component.card.shadow", path: "component.card.shadow", type: "shadow", layer: "semantic", description: "Card shadow.", values: reference("shadow.card") },
    { id: "typography.body.family", path: "typography.body.family", type: "fontFamily", layer: "semantic", description: "Body family.", values: reference("font.family.ui") },
    { id: "typography.body.size", path: "typography.body.size", type: "dimension", layer: "semantic", description: "Body size.", values: reference("font.size.body") },
    { id: "typography.body.weight", path: "typography.body.weight", type: "fontWeight", layer: "semantic", description: "Body weight.", values: reference("font.weight.regular") },
    { id: "typography.strong.weight", path: "typography.strong.weight", type: "fontWeight", layer: "semantic", description: "Strong weight.", values: reference("font.weight.strong") },
    { id: "typography.body.line-height", path: "typography.body.line-height", type: "number", layer: "semantic", description: "Body line height.", values: reference("line-height.body") },
  ];
}

export const initialProject = projectSchema.parse({
  schemaVersion: 1,
  id: "local-draft",
  name: "Product — Local draft",
  presetId: "product",
  createdAt,
  updatedAt: createdAt,
  tokens: createPresetTokens(presetSpecs.product),
});

export function upgradeProject(document: ProjectDocument): ProjectDocument {
  const tokenIds = new Set(document.tokens.map((token) => token.id));
  const missingTokens = createPresetTokens(presetSpecs[document.presetId]).filter((token) => !tokenIds.has(token.id));
  return missingTokens.length === 0 ? document : projectSchema.parse({ ...document, tokens: [...document.tokens, ...missingTokens] });
}

export function applyCommand(document: ProjectDocument, command: TokenCommand): ProjectDocument {
  if (command.type === "select-preset") {
    const preset = presetSpecs[command.presetId];
    return projectSchema.parse({
      ...document,
      name: `${preset.name} — Local draft`,
      presetId: preset.id,
      updatedAt: new Date().toISOString(),
      tokens: createPresetTokens(preset),
    });
  }

  if (command.type === "set-token-reference") {
    const token = document.tokens.find((candidate) => candidate.id === command.tokenId);
    const target = document.tokens.find((candidate) => candidate.id === command.targetId);
    if (!token || !target || token.type !== target.type) throw new Error("Alias target must have a compatible type.");

    return projectSchema.parse({
      ...document,
      updatedAt: new Date().toISOString(),
      tokens: document.tokens.map((candidate) => candidate.id === token.id
        ? { ...candidate, values: { ...candidate.values, [command.mode]: { kind: "reference", tokenId: target.id } } }
        : candidate),
    });
  }

  if (command.type === "set-token-value") {
    if (!document.tokens.some((candidate) => candidate.id === command.tokenId)) throw new Error(`Unknown token: ${command.tokenId}`);
    return projectSchema.parse({
      ...document,
      updatedAt: new Date().toISOString(),
      tokens: document.tokens.map((candidate) => candidate.id === command.tokenId
        ? { ...candidate, values: { ...candidate.values, [command.mode]: { kind: "literal", value: command.value } } }
        : candidate),
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

export function resolveCssValue(document: ProjectDocument, tokenId: string, mode: TokenMode = "light"): string {
  const token = document.tokens.find((candidate) => candidate.id === tokenId);
  if (!token) throw new Error(`Unknown token: ${tokenId}`);
  const value = resolveToken(document, tokenId, mode);

  if (token.type === "dimension") return `${(value as z.infer<typeof dimensionValueSchema>).value}${(value as z.infer<typeof dimensionValueSchema>).unit}`;
  if (token.type === "shadow") {
    const shadow = value as z.infer<typeof shadowValueSchema>;
    return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`;
  }
  return String(value);
}

export function parseTokenInput(type: Token["type"], input: string): ResolvedTokenValue {
  if (type === "color") return colorValueSchema.parse(input).toUpperCase();
  if (type === "fontFamily") return fontFamilyValueSchema.parse(input);
  if (type === "fontWeight") return z.coerce.number().int().min(100).max(900).parse(input);
  if (type === "number") return z.coerce.number().parse(input);
  if (type === "dimension") {
    const match = input.trim().match(/^(-?\d+(?:\.\d+)?)(px|rem)$/);
    if (!match) throw new Error("Use a number followed by px or rem.");
    return dimensionValueSchema.parse({ value: Number(match[1]), unit: match[2] });
  }

  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(#[0-9a-fA-F]{6})$/);
  if (!match) throw new Error("Use: xpx ypx blurpx spreadpx #RRGGBB.");
  return shadowValueSchema.parse({ offsetX: Number(match[1]), offsetY: Number(match[2]), blur: Number(match[3]), spread: Number(match[4]), color: match[5].toUpperCase() });
}

// ponytail: primitive-only alias targets avoid cycles; broaden when chained alias editing is needed.
export function getAliasTargets(document: ProjectDocument, tokenId: string): Token[] {
  const token = document.tokens.find((candidate) => candidate.id === tokenId);
  return token ? document.tokens.filter((candidate) => candidate.id !== token.id && candidate.layer === "primitive" && candidate.type === token.type) : [];
}
