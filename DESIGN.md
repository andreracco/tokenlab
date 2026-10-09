---
version: alpha
name: "TokenLab"
description: "A calibrated design-token workbench that keeps technical editing precise while making the active visual system tangible."
colors:
  studio-ink: "#111722"
  studio-canvas: "#DFE3E6"
  studio-panel: "#F7F6F2"
  studio-panel-strong: "#FFFFFF"
  studio-border: "#CFD3D6"
  studio-text: "#17202A"
  studio-muted: "#68717C"
  studio-accent: "#265CF5"
  studio-signal: "#D7FF5F"
typography:
  interface:
    fontFamily: '"Avenir Next", Avenir, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  technical:
    fontFamily: "ui-monospace, SFMono-Regular, monospace"
rounded:
  sm: "0.25rem"
  control: "0.4375rem"
  panel: "0.625rem"
spacing:
  compact: "0.5rem"
  control: "0.75rem"
  panel: "1rem"
  canvas: "1.875rem"
components:
  studio-header: { }
  token-spectrum: { }
  panel: { }
  segmented-control: { }
  preview-stage: { }
  button: { }
  field: { }
---

# TokenLab Design System

## Overview

### Creative North Star

TokenLab should feel like a calibrated material-and-color instrument: part professional grading monitor, part physical swatch bench. The workspace is quiet, exact, and tool-like; the work under evaluation gets the visual attention.

### Product context and register

- **Audience and primary job:** Frontend developers and product designers shaping a reusable token system while judging it in a realistic application.
- **Target market and evidence:** Global English-language portfolio product; the repository product plan defines no market-specific workflow.
- **Locale and language policy:** English UI with system-native number and date output. No localization layer is currently present.
- **Usage scene:** Desktop-first, focused design sessions with dense controls; tablet and phone layouts preserve the core edit, inspect, and export path.
- **Register:** Product. Expressiveness belongs to the studio frame and active-token visualization, not routine controls.
- **Memorable signature:** The live Active spectrum rail derives from the current project’s primitive color tokens and changes with the selected preset or edits.
- **Restraint:** Editors, lists, dialogs, validation, and preview content retain familiar product patterns and high legibility.
- **Anti-references:** Generic white SaaS dashboards, decorative gradients unrelated to token data, glassmorphism, and oversized marketing typography inside the editor.
- **Token ownership/runtime mapping:** `src/styles.css` is the canonical source for fixed studio tokens. This file mirrors those exact values. Editable preview tokens remain owned by the versioned project document and flow through `createPreviewStyle` into scoped `--tl-preview-*` properties in `src/App.tsx`.

## Colors

The studio frame uses `studio-ink` for the header, mineral `studio-canvas` behind the preview, and warm `studio-panel` surfaces for tools. `studio-accent` owns selection, focus, and primary studio actions. `studio-signal` is reserved for small instrument-like status and brand moments; it is not a general action color. Editable preview color never leaks into fixed studio chrome except through the explicitly labeled Active spectrum visualization.

## Typography

The interface uses the installed-system `interface` stack for compact, readable controls. Token paths, values, spectrum labels, and draft metadata use `technical`. Headings rely on tighter tracking and weight rather than a separate downloaded display font, keeping rendering fast and stable.

## Layout

The desktop workbench is a three-panel grid: compact library, elastic canvas, comfortable inspector. The preview stage uses a 24px calibration grid and a 30px breathing zone. Below 1100px the inspector becomes the existing drawer; below 760px the existing panel navigation keeps one task surface visible at a time. Scroll ownership remains inside each panel.

## Elevation & Depth

Borders and tonal contrast organize the fixed controls. The preview is the one substantially elevated object because it represents the artifact under inspection. Dialogs use functional elevation; static editor panels do not.

## Shapes

Controls use a compact 7px radius, panels about 10px, and technical elements 4px. Pills are reserved for status badges. The spectrum rail is a small rectangular strip so its colors read as swatches rather than decoration.

## Components

### Foundational visual states

Hover is tonal, focus uses a 2px `studio-accent` ring, active segmented controls invert to `studio-ink`, and disabled controls preserve geometry at reduced opacity. Errors remain textual and adjacent to their fields. Reduced-motion preference removes decorative transition duration.

### Buttons and actions

Primary studio actions use `studio-accent`; neutral controls use white or transparent surfaces. Destructive styling remains separate. Icon-only history controls keep accessible names and tooltips.

### Navigation and data display

Selected token rows combine a left accent rule, tint, and border so selection never depends on color alone. Segmented controls use dark selected states for faster scanning. Token counts and paths remain compact technical metadata.

### Forms and overlays

Fields use native controls where platform popup ownership is acceptable. Search fields expose a keyboard-accessible clear action when non-empty. Dialogs retain native modal semantics, labeled headings, Escape behavior, and focus restoration.

### Iconography

Lucide outlined icons use consistent 1.8px strokes. Ambiguous icon-only controls retain visible tooltips or accessible names; primary actions pair icons with text.

### Motion

Motion is short state feedback only: selection, hover, and preview-card lift. No ambient animation competes with visual evaluation, and reduced motion is respected globally.

### Content and data visualization

Copy is direct and operational. Action labels name the result. The active spectrum and preview charts use token data, and contrast reporting always states the tested pair, ratio, and threshold.

## Do's and Don'ts

- **Do:** Let the user’s token system provide the changing color story through scoped preview variables and the labeled spectrum rail.
- **Do:** Keep studio chrome visually stable when preview tokens change.
- **Don't:** add decorative color that could be mistaken for editable token output or semantic status.
- **Don't:** turn dense editing surfaces into oversized portfolio marketing sections.
