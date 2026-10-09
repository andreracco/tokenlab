import type { CSSProperties } from "react";
import { resolveColorToken, resolveCssValue, type ProjectDocument, type TokenMode } from "../domain/tokens";

export type PreviewStyle = CSSProperties & {
  "--tl-preview-viewport-width"?: string;
  "--tl-preview-action-primary-background": string;
  "--tl-preview-action-primary-foreground": string;
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
    "--tl-preview-action-primary-background": resolveColorToken(document, "action.primary.background", mode),
    "--tl-preview-action-primary-foreground": resolveCssValue(document, "action.primary.foreground", mode),
    "--tl-preview-font-family": fontFamily === "Georgia" ? "Georgia, serif" : `${fontFamily}, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    "--tl-preview-font-size": resolveCssValue(document, "typography.body.size", mode),
    "--tl-preview-font-weight": resolveCssValue(document, "typography.body.weight", mode),
    "--tl-preview-strong-weight": resolveCssValue(document, "typography.strong.weight", mode),
    "--tl-preview-line-height": resolveCssValue(document, "typography.body.line-height", mode),
    "--tl-preview-content-padding": resolveCssValue(document, "layout.content.padding", mode),
    "--tl-preview-card-padding": resolveCssValue(document, "space.medium", mode),
    "--tl-preview-card-gap": resolveCssValue(document, "layout.card.gap", mode),
    "--tl-preview-control-radius": resolveCssValue(document, "component.control.radius", mode),
    "--tl-preview-card-radius": resolveCssValue(document, "component.card.radius", mode),
    "--tl-preview-card-shadow": resolveCssValue(document, "component.card.shadow", mode),
    "--tl-preview-surface": resolveCssValue(document, "surface.page", mode),
    "--tl-preview-panel": resolveCssValue(document, "surface.panel", mode),
    "--tl-preview-border": resolveCssValue(document, "border.default", mode),
    "--tl-preview-text": resolveCssValue(document, "text.primary", mode),
    "--tl-preview-muted": resolveCssValue(document, "text.muted", mode),
  };
}
