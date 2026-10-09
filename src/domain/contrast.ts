import { resolveColorToken, type ProjectDocument, type TokenMode } from "./tokens";

const pairs = [
  {
    id: "body",
    label: "Body text on page",
    foreground: "text.primary",
    background: "surface.page",
    threshold: 4.5,
    component: "Forma page",
  },
  {
    id: "muted",
    label: "Muted text on panel",
    foreground: "text.muted",
    background: "surface.panel",
    threshold: 4.5,
    component: "Project cards",
  },
  {
    id: "primary",
    label: "Primary button label",
    foreground: "action.primary.foreground",
    background: "action.primary.background",
    threshold: 4.5,
    component: "Primary button",
  },
  {
    id: "error",
    label: "Error text on surface",
    foreground: "feedback.error.text",
    background: "feedback.error.surface",
    threshold: 4.5,
    component: "Input error",
  },
  {
    id: "feedback-success",
    label: "Success message text",
    foreground: "feedback.success.text",
    background: "feedback.success.surface",
    threshold: 4.5,
    component: "System status alerts",
  },
  {
    id: "feedback-warning",
    label: "Warning message text",
    foreground: "feedback.warning.text",
    background: "feedback.warning.surface",
    threshold: 4.5,
    component: "System status alerts",
  },
  {
    id: "feedback-info",
    label: "Informational message text",
    foreground: "feedback.info.text",
    background: "feedback.info.surface",
    threshold: 4.5,
    component: "System status alerts",
  },
] as const;

export function checkContrast(document: ProjectDocument, mode: TokenMode) {
  return pairs.map((pair) => {
    const ratio = contrastRatio(
      resolveColorToken(document, pair.foreground, mode),
      resolveColorToken(document, pair.background, mode),
    );
    return { ...pair, ratio, passes: ratio >= pair.threshold };
  });
}

export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
