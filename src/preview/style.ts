import type { CSSProperties } from "react";
import {
  resolveColorToken,
  resolveCssValue,
  resolveToken,
  type ProjectDocument,
  type TokenMode,
} from "../domain/tokens";

export type PreviewStyle = CSSProperties & {
  "--tl-preview-viewport-width"?: string;
  "--tl-preview-action-primary-background": string;
  "--tl-preview-action-primary-foreground": string;
  "--tl-preview-feedback-error-text": string;
  "--tl-preview-feedback-error-surface": string;
  "--tl-preview-feedback-success-text": string;
  "--tl-preview-feedback-success-surface": string;
  "--tl-preview-font-family": string;
  "--tl-preview-font-size": string;
  "--tl-preview-font-weight": string;
  "--tl-preview-strong-weight": string;
  "--tl-preview-line-height": string;
  "--tl-preview-content-padding": string;
  "--tl-preview-card-padding": string;
  "--tl-preview-card-gap": string;
  "--tl-preview-control-radius": string;
  "--tl-preview-card-radius": string;
  "--tl-preview-card-shadow": string;
  "--tl-preview-surface": string;
  "--tl-preview-panel": string;
  "--tl-preview-border": string;
  "--tl-preview-text": string;
  "--tl-preview-muted": string;
};

export function createPreviewStyle(document: ProjectDocument, mode: TokenMode): PreviewStyle {
  const fontFamily = resolveCssValue(document, "typography.body.family", mode);
  return {
    "--tl-preview-action-primary-background": resolveColorToken(
      document,
      "action.primary.background",
      mode,
    ),
    "--tl-preview-action-primary-foreground": resolveCssValue(
      document,
      "action.primary.foreground",
      mode,
    ),
    "--tl-preview-feedback-error-text": resolveColorToken(document, "feedback.error.text", mode),
    "--tl-preview-feedback-error-surface": resolveColorToken(
      document,
      "feedback.error.surface",
      mode,
    ),
    "--tl-preview-feedback-success-text": resolveColorToken(
      document,
      "feedback.success.text",
      mode,
    ),
    "--tl-preview-feedback-success-surface": resolveColorToken(
      document,
      "feedback.success.surface",
      mode,
    ),
    "--tl-preview-font-family":
      fontFamily === "Georgia"
        ? "Georgia, serif"
        : `${fontFamily}, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    "--tl-preview-font-size": resolveCssValue(document, "typography.body.size", mode),
    "--tl-preview-font-weight": resolveCssValue(document, "typography.body.weight", mode),
    "--tl-preview-strong-weight": resolveCssValue(document, "typography.strong.weight", mode),
    "--tl-preview-line-height": resolveCssValue(document, "typography.body.line-height", mode),
    "--tl-preview-content-padding": resolveCssValue(document, "layout.content.padding", mode),
    "--tl-preview-card-padding": resolveCssValue(document, "space.medium", mode),
    "--tl-preview-card-gap": resolveCssValue(document, "layout.card.gap", mode),
    "--tl-preview-control-radius": resolveCssValue(document, "component.control.radius", mode),
    "--tl-preview-card-radius": resolveCssValue(document, "component.card.radius", mode),
    "--tl-preview-card-shadow": resolvePreviewShadow(document, mode),
    "--tl-preview-surface": resolveCssValue(document, "surface.page", mode),
    "--tl-preview-panel": resolveCssValue(document, "surface.panel", mode),
    "--tl-preview-border": resolveCssValue(document, "border.default", mode),
    "--tl-preview-text": resolveCssValue(document, "text.primary", mode),
    "--tl-preview-muted": resolveCssValue(document, "text.muted", mode),
  };
}

function resolvePreviewShadow(document: ProjectDocument, mode: TokenMode): string {
  const value = resolveToken(document, "component.card.shadow", mode);
  if (mode !== "dark" || typeof value !== "object" || !value || !("blur" in value)) {
    return resolveCssValue(document, "component.card.shadow", mode);
  }

  // Dark previews soften opaque shadow tokens until the token model supports alpha.
  const offsetY = Math.sign(value.offsetY) * Math.min(Math.abs(value.offsetY), 4);
  const blur = Math.round(value.blur * 0.65);
  return `${value.offsetX}px ${offsetY}px ${blur}px ${value.spread}px color-mix(in srgb, ${value.color} 14%, transparent)`;
}
