# Design

The look and behaviour come from the design reference in `design-docnew/` (Classical design system plus the BuildIt prototype). It is a reference, not code to copy, and not the feature list.

- **Rules** for tokens, type, icons, motion, accessibility and the per-screen comparison are in `CLAUDE.md` ("Design").
- **Tokens** are generated from the design system: `npm run tokens` in `apps/mobile` writes `src/theme/tokens.generated.ts`; a test fails if it drifts.
- **Strings** (English and Arabic) are generated from the prototype: `npm run strings` in `apps/mobile`.
- **Restyle tables and material colours** for the engine are generated: `npm run design` in `packages/core`.
- **Comparing a screen** with the prototype: `npm run design:compare` in `apps/mobile` (see `CLAUDE.md`).
- **Where the design is silent**, build in the same scheme (hairlines, outlined buttons, gold as stroke, narrated progress) and log the gap in `OPEN_ISSUES.md`.
