# TokenLab

TokenLab is a design decision studio: change a token, see what it affects, and judge the result inside a realistic product.

The local-first MVP includes three starting systems, typed primitive and semantic tokens, light and dark modes, live Forma previews, bidirectional inspection, undo and redo, snapshots and comparison, contrast checks, project import, and CSS, DTCG JSON, Tailwind CSS, and project-file exports.

## Development

```sh
npm install
npm run dev
```

## Verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

GitHub Actions runs the same unit, build, and browser checks on Linux. Visual regression baselines cover every starting system in light and dark modes on macOS and Linux.

## Project documentation

Planning documents:

- [Product plan](PRODUCT-PLAN.md): concept, scope, differentiated UX, preview product, and studio design system.
- [Technical architecture](ARCHITECTURE.md): stack, boundaries, data model, persistence, interchange, and accessibility checks.
- [Implementation plan](IMPLEMENTATION-PLAN.md): milestones, estimates, acceptance criteria, and verification.
- [Build instructions](BUILD-INSTRUCTIONS.md): reusable instructions for a coding assistant.
- [Demo walkthrough](docs/DEMO-WALKTHROUGH.md): a 90-second portfolio presentation of the primary workflow.

Assumptions: solo developer, React/TypeScript, browser application, local persistence, no backend for the MVP.

Planning date: October 8, 2026.
