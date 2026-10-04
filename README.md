# StudyOS

StudyOS is the WS26/27 retention and exam-readiness system for the THIEPN ecosystem. The application keeps raw university material in a dedicated Google Drive account, structured academic state in Supabase, and daily review/exam-readiness workflows in a Next.js frontend.

## Current phase: P7

Implemented through P4:

- Next.js 16 App Router + Supabase SSR authentication
- THIEPN Account shared identity with isolated `study_*` application data
- fixed-budget spaced review engine and interactive review sessions
- idempotent/offline-safe attempt recording
- resource versioning, extraction candidates, explicit human approval, and source provenance
- a **separate StudyOS Google Drive OAuth connection** that can use a different Google account from ChatGPT or THIEPN Account
- Google account chooser, encrypted server-side refresh-token storage, disconnect/switch-account support
- StudyOS-owned Drive tree creation (`Semester OS/WS26-27/...`)
- Drive scanning and deterministic course/type/week classification
- deduplicated Drive intake ledger
- candidate validation/conflict detection before material can enter the active study map
- derived weekly course-health states: `empty`, `needs_processing`, `source_only`, `learning`, `fragile`, `retained`
- editable real course/exam/workload configuration without changing stable course IDs
- an enforced weekly loop: lecture retrieval → independent exercise attempt → solution reconciliation → repair → checkpoint
- solution-reconciliation findings that can schedule mapped skills into immediate repair review
- resource-count snapshots that automatically reopen a milestone when additional material is released
- GitHub Actions qualification: tests → TypeScript → Next.js production build

## Google Drive account model

StudyOS does **not** reuse the Google account used to sign in to THIEPN Account and does not depend on the Google Drive account connected to ChatGPT. `/resources` has its own **Connect Google Drive** flow and Google displays an account chooser.

The recommended setup for the user's dedicated study Drive is `GOOGLE_DRIVE_SCOPE_MODE=readonly`. The OAuth request combines `drive.file` (to create and manage the StudyOS tree) with read-only access so files manually dropped into the StudyOS folders can be discovered. StudyOS still scans only the configured Semester OS tree. If every file is uploaded/selected through StudyOS instead, `file` mode can be used for narrower authorization.

Google refresh tokens are encrypted before persistence. `SUPABASE_SERVICE_ROLE_KEY`, the Google OAuth secret, and `STUDY_DRIVE_TOKEN_KEY` are server-only Vercel environment variables and must never be exposed with `NEXT_PUBLIC_` prefixes.

## Study flow

```text
Drive file
  -> scan/discovery ledger
  -> course/type/week classification
  -> structured extraction candidate
  -> validation/conflict checks
  -> explicit approval
  -> topic + skill + question + provenance
  -> review queue
  -> attempt evidence
  -> weekly health / exam readiness
```

Extraction candidates remain inert until accepted. Blocking validation errors prevent acceptance.

## Environment

Copy `.env.example` to `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ORIGIN=http://localhost:3000
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
STUDY_DRIVE_TOKEN_KEY=
GOOGLE_DRIVE_SCOPE_MODE=readonly
```

The Google OAuth redirect URI is:

```text
https://YOUR-STUDYOS-DOMAIN/api/integrations/google-drive/callback
```

## Commands

```bash
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

## Repository

Canonical repository: `thiepn/studyOS`.


## P5 weekly operating rule

Do not treat reading or solution comparison as mastery. A normal week should move through:

```text
source approved
→ reconstruct lecture from memory
→ solve sheet before solution
→ compare against official solution
→ record discrepancies
→ independently repair them
→ short mixed checkpoint
→ scheduled retention reviews
```

Open `Courses` to configure the real course names and use each course page as the operational weekly view.


## P6 production readiness

P6 adds:
- the six real WS26/27 course names at first-run initialization;
- an authenticated `/setup` readiness center;
- a public, non-sensitive `/api/health` liveness endpoint;
- explicit separation between infrastructure readiness and first-material end-to-end readiness;
- preferred Vercel compute region `dub1` to keep dynamic work in Europe near the shared Supabase project;
- modern `SUPABASE_SECRET_KEY` support with legacy `SUPABASE_SERVICE_ROLE_KEY` fallback;
- noindex/nofollow metadata for this private personal application;
- the first repository-captured StudyOS Supabase migration.

### Remaining external activation

The repository is deployable, but live activation still requires:
1. Vercel connector authorization for the account's default scope;
2. production environment variables;
3. a Google OAuth client whose authorized redirect includes `/api/integrations/google-drive/callback`;
4. signing in to StudyOS and selecting the dedicated Study Google account.

Dependency resolution is now deterministic: `package-lock.json` is committed and CI uses `npm ci`.

Full end-to-end material certification intentionally remains pending until a real lecture/source exists.


## P7 source-grounded processing

StudyOS now has a no-paid-API semantic processing path:

```text
queued source
→ copy course-specific processing brief
→ process the PDF in ChatGPT
→ paste candidate JSON
→ provenance/quality validation
→ explicit acceptance
→ Course Master Map
→ review engine
```

P7 also retires questions generated from superseded source versions and requires source anchors for every extracted skill/question.
