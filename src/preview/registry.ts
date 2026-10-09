export const componentRegistry = [
  {
    key: "primary-button",
    label: "Primary button",
    location: "Projects header",
    tokenIds: [
      "color.brand.600",
      "action.primary.background",
      "action.primary.foreground",
      "component.control.radius",
      "typography.strong.weight",
    ],
  },
  {
    key: "project-card",
    label: "Project card",
    location: "Projects grid",
    tokenIds: [
      "surface.panel",
      "border.default",
      "component.card.radius",
      "component.card.shadow",
      "layout.card.gap",
      "text.primary",
      "text.muted",
    ],
  },
  {
    key: "recent-activity",
    label: "Recent activity",
    location: "Projects overview",
    tokenIds: [
      "surface.panel",
      "border.default",
      "component.card.radius",
      "layout.content.padding",
      "text.primary",
      "text.muted",
    ],
  },
  {
    key: "workspace-navigation",
    label: "Workspace navigation",
    location: "Forma sidebar",
    tokenIds: [
      "surface.panel",
      "action.primary.background",
      "component.control.radius",
      "space.small",
      "text.muted",
      "typography.strong.weight",
    ],
  },
  {
    key: "project-search",
    label: "Project search",
    location: "Projects toolbar",
    tokenIds: [
      "surface.panel",
      "border.default",
      "component.control.radius",
      "text.muted",
      "typography.body.size",
    ],
  },
  {
    key: "project-filters",
    label: "Project filters",
    location: "Projects toolbar",
    tokenIds: [
      "surface.panel",
      "border.default",
      "component.control.radius",
      "text.muted",
      "typography.body.size",
    ],
  },
  {
    key: "notification-control",
    label: "Notification control",
    location: "Forma topbar",
    tokenIds: ["surface.panel", "border.default", "component.control.radius", "text.muted"],
  },
  {
    key: "workspace-switcher",
    label: "Workspace switcher",
    location: "Forma sidebar",
    tokenIds: [
      "surface.panel",
      "border.default",
      "component.control.radius",
      "text.primary",
      "text.muted",
    ],
  },
  {
    key: "metric-card",
    label: "Overview metric",
    location: "Overview dashboard",
    tokenIds: [
      "surface.panel",
      "border.default",
      "component.card.radius",
      "layout.content.padding",
      "text.primary",
      "text.muted",
      "typography.strong.weight",
    ],
  },
  {
    key: "task-row",
    label: "Task row",
    location: "My tasks",
    tokenIds: [
      "surface.panel",
      "border.default",
      "layout.content.padding",
      "text.primary",
      "text.muted",
    ],
  },
  {
    key: "team-card",
    label: "Team member card",
    location: "Team directory",
    tokenIds: [
      "surface.panel",
      "border.default",
      "component.card.radius",
      "layout.content.padding",
      "text.primary",
      "text.muted",
    ],
  },
  {
    key: "overview-action",
    label: "Overview action",
    location: "Overview header",
    tokenIds: [
      "color.brand.600",
      "action.primary.background",
      "action.primary.foreground",
      "component.control.radius",
      "typography.strong.weight",
    ],
  },
] as const;

export type ComponentKey = (typeof componentRegistry)[number]["key"];

export function consumersForToken(tokenId: string) {
  return componentRegistry.filter((component) => component.tokenIds.includes(tokenId as never));
}
