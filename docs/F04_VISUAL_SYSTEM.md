# F04 — Academic Visual System

## Evidence inspected
- F03 PR #36 qualified exact head b4dfa08dd1dd12873aec1052be26fb91ef451329, CI run 38000358436.
- Actual existing `src/app/globals.css` was 139,836 bytes with numerous sequential phases of overrides. P30 already established a strong *paper, ink and course binder* direction. F04 deliberately extends rather than replaces it.
- Inspected rendered-route source for Today, Courses, Study, Progress, More and the F02/F03 account and sign-in surfaces.
- Legacy CSS is left intact to preserve deep academic flows. `academic-system.css` is an explicit final cascade layer and design contract; F05 may consolidate the oldest unused styles only after screen-by-screen evidence.

## Design decision
StudyOS uses an institutional study-ledger visual language: warm off-white paper, deep graphite/green ink, ruled divisions, book typography for headings and mathematical content, technical sans for actions, proportional density, and stable per-course spine accents. No generic rounded cards, colorful gradients, glows or decorative dashboards.

## Reusable tokens
The `--academic-*` namespace provides 17+ semantic colors, text, typography, spacing, control size and width parameters. Existing variable names map onto the new tokens. Typography uses bundled/system fallbacks only; no third-party font file or network dependency.

## Scope
- Semantic `AcademicPageHeading`, `AcademicSectionHeading`, and `AcademicEmptyState` primitives.
- Primary navigation keyboard/touch affordances and responsive non-pill current-link indicator.
- Today sequence, course register, proof/practice sheet, progress ledger and More index refinements.
- Consistent focus-visible (3px), disabled state, 44–48px responsive tap targets, reduced motion, forced colors, text wrapping and narrow-screen overflow handling.
- F02 login and F03 connection functions, Google Drive/Calendar callbacks, API schemas, academic state and release gates untouched.

## Qualification and limitations
- Static accessibility/design-contract assertions check tokens, main semantic landmarks, keyboard focus, reduced motion and responsive rules.
- Full Node tests, TypeScript, Next.js production build and built-server smoke required at exact head.
- **No screenshot comparison is asserted unless a real Chromium screenshot artifact is captured.** Existing CI has no Playwright/Chromium screenshot job, and Vercel preview creation may be build-rate-limited. Desktop/mobile visual approval remains an explicit F05/F11 gate.

## F05
Application shell and navigation refinement: persistent account-aware course context, semantic landmarks/skip link coverage, desktop/mobile route navigation, accessible command discovery, empty/error/loading state consistency and real-browser visual QA.
