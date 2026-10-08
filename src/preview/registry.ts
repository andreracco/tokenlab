export const componentRegistry = [
  {
    key: "primary-button",
    label: "Primary button",
    location: "Projects header",
    tokenIds: ["color.brand.600", "action.primary.background", "action.primary.foreground", "component.control.radius", "typography.strong.weight"],
  },
  {
    key: "project-card",
    label: "Project card",
    location: "Projects grid",
    tokenIds: ["surface.panel", "border.default", "component.card.radius", "component.card.shadow", "layout.card.gap", "text.primary", "text.muted"],
  },
] as const;

export type ComponentKey = (typeof componentRegistry)[number]["key"];

export function consumersForToken(tokenId: string) {
  return componentRegistry.filter((component) => component.tokenIds.includes(tokenId as never));
}
