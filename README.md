# StudyOS

StudyOS is the WS26/27 retention and exam-readiness system for the THIEPN ecosystem. The application keeps raw university material in a dedicated Google Drive account, structured academic state in Supabase, and daily review/exam-readiness workflows in a Next.js frontend.

## Current phase: P8

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


## P8 longitudinal semester control

StudyOS now diagnoses retention and course danger over time instead of only showing current mastery.

- one 45–60 minute cumulative checkpoint rotates across the four major courses: DGL → Stochastik → TheoInf → AMP;
- per-course weekly checkpoints are no longer demanded, preventing checkpoint workload from multiplying by course count;
- checkpoint selection favors older material while allowing weak, lapsed, prerequisite-heavy, and exam-important skills to override age;
- retention diagnostics distinguish untested, maintained, due, overdue, lapsed, and relearning skills;
- course risk is an explainable 0–100 heuristic composed from retention, overdue reviews, recent lapses, workflow backlog, unresolved errors, and exam-readiness gap;
- exam dates automatically switch a course from semester mode → transition mode → exam mode;
- exam mode uses the intended 65% exam practice / 25% weakness repair / 10% pure recall mix;
- ordinary daily retention remains capped rather than expanding with backlog.

Live Vercel/Study Drive activation from P6 remains deferred independently of this development work.


## P9 Altklausur intelligence and timed exam simulation

StudyOS now treats past exams as evidence, not prophecy.

- accepted `exam` resources create numbered past-paper questions linked to real course skills;
- `exam_solution` resources attach grading rubrics to an existing paper by stable exam key;
- solution authority is explicit: missing → unverified → verified → official;
- old or syllabus-mismatched papers can be down-weighted with `syllabus_relevance` instead of being deleted;
- historical frequency is recency/relevance weighted, while unseen syllabus topics retain nonzero priority;
- the Exam Blueprint combines historical occurrence/point share, course exam importance, current exam-readiness gap, and certified simulation performance;
- full timed simulations snapshot the original paper, hide solutions until submission, track total/question time, and require point-loss diagnosis;
- provisional self-grades are stored for diagnostics but cannot create mastery evidence;
- verified/official grading can create `exam`-dimension attempt evidence;
- exam strategy recommends the next action and a first-pass / return-pass / final-check time split.

Live Vercel/Study Drive activation remains independent of P9.


## P10 semester autopilot and recovery-safe workload planning

StudyOS now converts all previously collected evidence into a bounded daily study plan.

- the Today page has an explicit independent-study capacity rather than an unbounded backlog;
- Normal, Light, Recovery, Intensive, and one-day Custom capacity modes are available;
- Recovery Mode defaults to 45 total minutes, a 20-minute retention ceiling, and at most two focus items;
- ordinary mode defaults remain configurable rather than hard-coded to the user forever;
- overdue work changes priority but never expands the configured daily capacity;
- deadlines/assignments can be registered with course, due time, estimate, and priority;
- the planner combines retention, course workflow, commitments, the weekly checkpoint, P8 course risk, and P9 exam strategy;
- urgent deadlines can outrank ordinary work;
- a dynamic same-course penalty prevents one subject from monopolizing a balanced daily plan;
- splittable work may receive a partial block when it is the best use of the remaining time;
- heavy optional work such as full timed exams/checkpoints is suppressed in Recovery Mode unless genuinely urgent;
- deferred work remains visible but never becomes punitive “debt minutes” on the next day.

The planner remains deterministic and does not require a paid AI API.
