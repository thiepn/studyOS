# StudyOS

StudyOS is the WS26/27 retention and exam-readiness system for the THIEPN ecosystem. The application keeps raw university material in a dedicated Google Drive account, structured academic state in Supabase, and daily review/exam-readiness workflows in a Next.js frontend.

## Current phase: P16

Implemented through P16; the foundation includes:

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


## P11 calendar-aware scheduling and weekly autopilot

StudyOS can now place P10's bounded plan into real free time without turning the calendar into another source of workload debt.

- Study Calendar uses an OAuth connection independent from ChatGPT and independent from the Study Drive token/account;
- only the primary calendar is selected on first connection; additional visible calendars are opt-in;
- selected calendars are cached as busy/free context, with cancelled and transparent events ignored by the scheduler;
- planning uses the semester timezone and handles daylight-saving changes;
- study-day start/end, minimum block size, event buffer, maximum block size, weekend use, and reminder lead time are configurable;
- P10's ordered tasks are placed into free windows without overlap;
- non-splittable work such as a full timed exam waits for one continuous block instead of being fragmented;
- tasks that do not fit remain unscheduled rather than displacing real commitments;
- the seven-day runway shows free calendar capacity, busy-event count, and due commitments;
- committing the proposal explicitly creates Google Calendar events with popup reminders;
- cancelling a committed StudyOS block removes the corresponding Google Calendar event and records the cancellation locally;
- StudyOS never silently imports or writes through the Google Calendar account connected to ChatGPT.

- calendar events explicitly classified as deadline / Abgabe / due are mirrored into P10 commitments with Google-event provenance;
- calendar-synced commitments preserve a user's completed status and existing estimate/priority on later syncs;
- detected lecture/exercise/exam/deadline events are surfaced in Today; exam events never silently replace the official course exam date.


## P12 live semester activation and first-week certification

P12 separates three states that must never be conflated:

1. **Platform certification** — deployment secrets, secure origin, Drive OAuth, Calendar OAuth.
2. **Pre-semester activation** — six-course workspace, intended Study Drive + folder tree, intended Study Calendar + successful sync, timetable coverage for all four major courses, and completed EiP/Mikro retake baselines.
3. **First-week certification** — every major course has verified Week-1 material, at least one source-grounded skill/question map, and at least one real attempt.

The Setup page is now the Activation Center and exposes the exact blocker for each layer.

Retake baselines are built from the user’s actual mapped old-course skills. StudyOS does not invent a generic syllabus when no prior material has been processed. Each skill is classified as Retained, Rusty, Weak, or Never mastered after a closed-book check. These labels affect only reactivation timing:

- Retained → low-frequency revisit (~21 days);
- Rusty → near-term revisit (~3 days);
- Weak / Never mastered → due immediately.

Baseline classification never creates mastery evidence and cannot make a skill Stable or Exam-ready.

If new skills are imported after a completed baseline, its effective status automatically reopens until the new skills are classified.

The first-week operational contract is deliberately per-course:

`Week-1 source in Study Drive → verified processing → skill/question map → closed-book attempt → P10/P11 planning`.

One successful course cannot certify the other three.


## P13 first-week evidence calibration

StudyOS now turns the first real Week-1 attempts into a guarded calibration profile without inventing a second mastery model.

- each major course tracks independent sample size, distinct skills, accuracy, confidence-vs-accuracy gap, pace, weakest repeated evidence dimension, and recurring error type;
- calibration remains broad until the sample is usable, preventing a few early successes or failures from over-personalizing the course;
- Practice exposes a bounded 20-minute / 5-question calibration set using existing verified questions;
- early sets prefer unattempted questions, under-sampled skills, under-sampled dimensions, and medium difficulty;
- once evidence is usable, adaptation is intentionally mild: one-step difficulty adjustment plus a preference for a weak dimension;
- Progress surfaces calibration maturity and the current recommendation beside longitudinal risk diagnostics;
- calibration itself never writes mastery evidence and never increases the daily workload budget.

The next phase is **P14 — Multi-Week Drift Detection, Workload/Performance Feedback & Automatic Plan Correction**.


## P14 multi-week drift detection and bounded plan correction

StudyOS now compares completed-week workload and performance instead of reacting to the unfinished current week.

- major courses receive a multi-week drift state: insufficient data, on track, watch, drifting, or critical;
- recent completed weeks are compared with the preceding completed-week window using independent accuracy, solving time, workflow lag, and unresolved errors;
- workload feedback distinguishes underinvestment from low-yield effort, so “do more” is not the default response;
- P14 rebalances P10 candidate priority inside the existing capacity ceiling;
- sustained performance/efficiency drift can inject one bounded targeted-practice candidate when verified questions exist;
- current deadlines, review limits, Recovery Mode, and P9 exam strategy remain authoritative;
- Today explains active automatic correction; Progress exposes the full drift evidence and drivers;
- P14 creates no mastery evidence and adds no second persistence model.

The next phase is **P15 — Semester-Level Learning Analytics & Intervention Validation**.


## P15 semester learning analytics and intervention validation

StudyOS now measures whether P14 corrections transfer into later independent performance instead of assuming that a completed repair worked.

- P14 targeted repairs run through a tagged drift-repair session so P15 can identify real interventions;
- intervention-session attempts are excluded from effectiveness scoring;
- baseline teaching weeks are compared with later completed teaching weeks using independent attempts only;
- interventions stay pending or insufficient until enough follow-up evidence exists;
- courses are classified as insufficient evidence, transient, responsive, persistent, or structural;
- structural difficulty requires repeated failed interventions plus continuing drift despite a non-underinvestment workload signal;
- Progress shows semester and per-course intervention effectiveness;
- Today surfaces persistent/structural cases;
- the daily planner stops repeating the same failed targeted-repair pattern and substitutes a bounded strategy-review item;
- P15 does not increase capacity and creates no new mastery model.

The next phase is **P16 — Strategy Escalation, Intervention Portfolio & Method-Level Experimentation**.


## P16 strategy escalation and method-level experimentation

Persistent/structural P15 cases now move into a controlled method portfolio instead of receiving the same repair repeatedly.

- seven distinct learning-method families target concept, method-selection, execution, transfer, prerequisite, pace, and explanation failures;
- P13/P14/P15 evidence selects the next method;
- P16 experiments are tagged relearning sessions and are judged only by later normal independent transfer;
- all intervention-session attempts are excluded from experiment evaluation;
- only one unresolved experiment may run per course at a time;
- methods become untested, testing, promising, proven, or retired;
- two evaluated failures with no successful transfer retire a method from automatic recommendation;
- multiple retired methods in a structural course trigger a source-change warning;
- exhausting the full in-app portfolio triggers external-support escalation rather than more solo practice;
- Today and Progress route persistent/structural courses directly to the Strategy Lab;
- all experiments remain inside the existing P10 study-capacity ceiling.

The next phase is **P17 — Semester Decision Layer, Course-Level Forecasting & Exam Outcome Readiness**.
