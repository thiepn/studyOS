# StudyOS

StudyOS is the WS26/27 retention and exam-readiness system for the THIEPN ecosystem. The application keeps raw university material in a dedicated Google Drive account, structured academic state in Supabase, and daily review/exam-readiness workflows in a Next.js frontend.

## Current phase: P27

Implemented through P27; the foundation includes:

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


## P17 semester decision layer and outcome readiness

StudyOS now has a cross-course decision layer above the individual learning engines.

- each course receives an evidence-gated StudyOS readiness index, confidence band, uncertainty range, trajectory, and exam runway;
- the readiness index is explicitly not an exam-score prediction or pass probability;
- courses with insufficient evidence remain unclassified rather than receiving false precision;
- readiness combines coverage, durable mastery, exam-ready skills, recent independent success, calibration, and verified timed-paper transfer;
- P8 risk, P14 drift, and P15 structural failure can conservatively reduce the current readiness call;
- P16 method response informs strategy/trajectory without becoming fake mastery;
- P9 remains authoritative in transition/exam mode;
- every course receives one bounded highest-value next action and a decision-priority score;
- the new /outlook surface provides a semester-wide decision queue and credit-weighted readiness summary;
- Today surfaces the highest-priority P17 decision while P10 remains the daily capacity authority.

The next phase is **P18 — Semester Scenario Planning, Capacity Trade-offs & Exam-Period Allocation**.


## P18 semester scenario planning and capacity trade-offs

StudyOS can now model a fixed weekly capacity across all active courses without inventing more time.

- baseline weekly capacity comes from the configured P10 default budget and is capped by real seven-day P11 Calendar free time when connected;
- explicit commitments due this week are reserved first;
- retention uses the existing P10 review-to-total budget ratio rather than a separate policy;
- every active course gets an explainable protection floor based on P17 readiness, exam runway, trajectory, and retake status;
- mandatory-work deficits and course-floor shortfalls are surfaced explicitly instead of hidden by overbooking;
- allocation uses 15-minute blocks with diminishing returns after each course floor;
- four objectives are available: Protect passes, Balanced, Target 80+, and Exam period;
- a trade-off matrix shows where minutes move when the objective changes;
- a 75% / baseline / 125% capacity stress test shows what breaks first;
- counterfactual capacity above current Calendar free time is clearly marked as requiring time to be freed;
- post-exam courses receive no allocation;
- P18 never treats allocated study minutes as predicted exam-score gains;
- P9 remains the exam-action authority and P10 remains the daily-capacity authority.

The next phase is **P19 — Weekly Commitment, Scenario-to-Plan Translation & Rolling Reallocation**.


## P19 weekly commitment and rolling reallocation

StudyOS can now turn a P18 scenario into a durable operational commitment for the remainder of the current calendar week.

- weekly plans persist the chosen objective, fixed capacity/reserves, revision, and scenario snapshot;
- per-course allocations preserve both original committed minutes and the current target;
- progress is derived from recorded study sessions plus conservative workflow milestone credit, using the larger signal per course to avoid double counting;
- each course is classified as not started, behind, on track, ahead, or met;
- P19 changes only discretionary course-work priority inside P10; commitments, P9 exam strategy, and retention are untouched;
- if a committed course has no ordinary candidate, P19 may add one bounded fallback pointing to its current P17 action;
- rolling reallocation detects lost capacity, material P17 priority shifts, and meaningful pace problems;
- proposals are automatic but application is explicit, preserving the original weekly commitment for audit;
- rebalancing can shrink targets when the week genuinely loses capacity but cannot silently manufacture additional workload;
- the new /week dashboard shows progress, evidence sources, original/current/proposed targets, and the live remaining-week capacity;
- P18 scenarios link directly into weekly commitment;
- live Supabase schema changes use owner RLS and were checked with security/performance advisors.

The next phase is **P20 — Weekly Execution Quality, Plan Adherence & Allocation Calibration**.


## P20 weekly execution quality and allocation calibration

StudyOS now evaluates whether its weekly planning heuristics match actual semester execution instead of leaving P18/P19 fixed forever.

- completed P19 weeks are reconstructed from the existing weekly plans, allocations, study sessions, and workflow milestones;
- current partial weeks never influence calibration;
- whole-week capacity realism is separated from course-specific allocation quality;
- a missed course target is only called overallocated when the rest of the week was executed reasonably well;
- repeated extra work can identify an underallocated course;
- repeated protection-floor sacrifice is tracked even if a later P19 rebalance recovers the target;
- paired planned/actual session minutes detect systematic estimate bias after at least four samples;
- fewer than three completed course-weeks can never change a P18 protection floor;
- supported floor corrections move only in 15-minute blocks and are capped at ±30 minutes;
- weak-readiness courses are protected against automatic floor reductions based only on missed execution;
- P18 browser and server scenarios use the same calibrated floor map;
- new P19 commitments and rolling reallocations inherit the P20 floor corrections;
- whole-week capacity suggestions are advisory only and never mutate P10 daily capacity;
- /quality exposes adherence, sacrifice, rebalance, estimate-bias, and calibration evidence;
- /week shows the current P20 evidence state;
- P20 adds no new persistence or Supabase authorization surface.

The next phase is **P21 — Closed-Loop Weekly Review, Next-Week Handoff & Semester Adaptation**.


## P21 closed-loop weekly review and next-week handoff

StudyOS now has an explicit boundary between one committed week and the next.

- /handoff reconstructs the prior P19 week with the same session/workflow evidence used by the weekly runtime;
- unfinished course-envelope minutes expire at week end and never become debt minutes;
- unresolved real assignments/deadlines remain the same P10 commitments with their original IDs, dates, estimates and priorities;
- unresolved commitments from before next Monday plus commitments due in the target week are reserved as mandatory next-week work;
- P21 can evaluate an arbitrary Monday→Sunday P11 calendar runway instead of relying on a rolling today+6-day window;
- previous/current P17 readiness snapshots are compared course by course;
- the next P18 objective is recommended from exam runway, pass risk, prior sacrifice and the 80+ readiness gap;
- P20 calibrated protection floors are carried directly into the handoff scenario;
- a well-supported P20 over-commitment signal may produce a conservative lower course-work trial, while mandatory work and retention stay protected;
- P20 under-commitment advice never lets P21 expand beyond the P10/P11 ceiling automatically;
- an existing prior P19 week must finish and be explicitly closed before its normal successor can be committed;
- closing a week uses the existing P19 status=completed state; no parallel review ledger was introduced;
- committing the handoff writes an ordinary P19 plan/allocation set, which automatically becomes active when its Monday arrives;
- no new database schema or authorization surface is introduced.

The next phase is **P22 — Exam-Period Command Center, Multi-Exam Conflict Resolution & Final-Runway Scheduling**.


## P22 exam-period command center and multi-exam conflict resolution

StudyOS can now coordinate several simultaneous P9 exam strategies without creating a second exam-method engine.

- active P9 transition/exam courses receive an explainable cross-exam command rank;
- command rank combines runway urgency with existing P17 readiness/priority context but never becomes another readiness score;
- P22 adds bounded priority pressure only to P10 exam-strategy candidates;
- single-exam mode does not add conflict pressure;
- exam-day preparation is withheld;
- heavy exam work is withheld inside the final 24 hours;
- recent timed simulations receive a roughly 36-hour recovery cooldown;
- only one heavy exam action may own Today during a collision, and an oversized high-rank action cannot block a smaller heavy action that actually fits;
- a seven-day preview places only each course's current P9 action and is rebuilt after P9 changes;
- preview capacity protects P10 retention, real commitments and P11 free-time limits before allocating exam work;
- heavy exam actions are separated by a clear calendar day when possible;
- impossible actions remain visible as conflicts rather than being silently replaced;
- P11 arbitrary runway calculations now clip Today after the current clock;
- /exam-command exposes command rank, conflicts, P9 action identity, P10 selection state and the protected seven-day preview;
- Today surfaces the leading exam command state whenever active;
- P22 adds no database schema or authorization surface.

The next phase is **P23 — Exam-Day Operations, Post-Exam Closure & Cross-Exam Recovery**.


## P23 exam-day operations, post-exam closure and cross-exam recovery

StudyOS now handles the operational boundary around each configured semester exam.

- exam start and scheduled exam end are treated as separate boundaries;
- pre-exam discretionary work freezes as soon as the exam starts;
- explicit real commitments for that course remain intact;
- post-exam course skills are removed from the active retention queue;
- closure becomes eligible only after the configured exam duration has ended;
- the first 4 hours after an exam create a full competing-exam recovery shield;
- hours 4–12 allow lighter exam work but continue to block heavy actions;
- P22 resumes normal multi-exam pressure after the recovery window;
- /exam-day exposes exam state, weekly release, calendar cleanup and recovery;
- closing an exam cancels obsolete StudyOS-owned calendar blocks through the existing P11 cancellation path;
- unused active P19 course minutes are released down to credited work rather than carried as debt;
- if another exam is inside a compressed runway, the released weekly capacity is rebalanced under the existing exam-period objective;
- the total P19 course budget cannot expand during closure;
- P19 records exam_closure:<course_id> as the rebalance reason for auditability;
- Today surfaces only active/recent exam-boundary states and unresolved releases;
- P23 adds no new database schema or authorization surface.

The next phase is **P24 — Exam Result Intake, Outcome Reconciliation & Retake/Completion Decisions**.


## P24 exam result intake, reconciliation and retake decisions

StudyOS now has durable state for real university exam outcomes.

- study_exam_results stores actual attempts separately from P9 practice simulations;
- result rows are owner-only under RLS and tied to the owning course/semester;
- provisional outcomes are informational and cannot structurally close or retake a course;
- official passes deactivate the course without deleting evidence;
- official non-passes require an explicit pending/planned/declined retake decision;
- pending retake decisions pause discretionary P10 and retention work while preserving real commitments;
- planned retakes reactivate the existing StudyOS pipeline through a future exam_at and course_kind=retake;
- declined retakes close allocation without falsely marking the course passed;
- the result write and course-state update are atomic through study_record_exam_result;
- the original P17 readiness index/band/decision priority are snapshotted on first intake and preserved;
- outcome reconciliation is directional only and never treats P17 as a predicted grade/pass probability;
- official writes invoke P23 calendar/weekly cleanup best-effort, but cleanup failure cannot block the academic result;
- duplicate result intake is suppressed once an official completed attempt is resolved;
- /exam-results provides intake, reconciliation, structural state and attempt history;
- Today surfaces result-ready exams and unresolved retake decisions.

The next phase is **P25 — Semester Completion Ledger, Credit/Pass Progress & End-of-Semester Review**.


## P25 semester completion ledger and end-of-semester review

StudyOS now aggregates actual P24 outcomes into a semester-level academic ledger without introducing another durable source of truth.

- /semester shows terminal-course progress and credit/pass progress;
- credits are counted once per course, never once per exam attempt;
- planned retakes, pending retake decisions, missing/provisional results, ongoing courses, passes, and closed-without-pass courses remain distinct;
- completed retake exams move to awaiting-result state through the P23 boundary model;
- courses with unknown credits are surfaced and excluded from the credit denominator rather than guessed;
- complete attempt history remains visible;
- first-attempt passes and eventual later-attempt passes are distinguished;
- P17 snapshots are reconciled directionally only: aligned, positive surprise, negative surprise, mixed, or insufficient evidence;
- no grade prediction, pass-probability calibration, or readiness-minus-grade metric is introduced;
- P19/P20 weekly adherence, capacity calibration, rebalances, protection sacrifices, and course allocation signals feed the end-of-semester execution review;
- the retrospective derives supported strengths, open concerns, and bounded next-semester actions;
- semester completion is flagged incomplete if the semester has ended while active/unresolved academic state remains;
- P25 adds no new database schema or persistence.

The next phase is **P26 — Semester Archive, New-Semester Rollover & Retake Carry-Forward**.


## P26 semester archive, rollover and retake carry-forward

StudyOS can now transition cleanly from one semester to the next.

- the active workspace is resolved from study_semesters.active instead of the old hard-coded ws26_27 key;
- at most one semester may be active for a user;
- archived semesters receive archived_at and explicit previous_semester_id lineage;
- rollover is an atomic database transaction;
- open real commitments block archive instead of being silently dropped or copied;
- missing/provisional outcomes block archive;
- pending retake decisions block archive and must be resolved first;
- only explicitly planned retakes with future exam dates are copied into the new semester;
- P10 capacity defaults and P11 calendar-planning preferences carry as configuration, with standard defaults created if no prior preference row exists;
- carried retakes receive fresh course rows and fresh operational state;
- weekly plans, unfinished study minutes, sessions, calendar planning, Drive semester folders and other stale execution state never carry;
- remaining active P19 plan state is closed at archive time;
- stale future Google Calendar StudyOS blocks are cancelled after the academic transaction and can be retried from Semester History if the external deletion fails;
- P24 retake attempt history follows the explicit semester ancestry chain plus stable course identity, so attempt numbering continues without duplicating old result rows;
- archived P25 ledgers freeze their time boundary at archived_at so historical state cannot mutate as future retake dates pass;
- /semesters lists active and archived workspaces;
- /semester/rollover provides preflight + rollover;
- /semester/archive/[semesterId] provides read-only historical context;
- P26 version is 0.24.0.

The next phase is **P27 — New-Semester Course Intake, Curriculum Bootstrap & Historical Prior Transfer**.


## P27 new-semester course intake, curriculum bootstrap and historical priors

StudyOS can now turn a clean P26 rollover workspace into an operational semester without restoring stale mastery.

- /semester/bootstrap provides active-semester course intake and certification;
- study_create_course generalizes course creation beyond the fixed WS26/27 roster;
- Drive provisioning and scanning now resolve the active semester rather than ws26_27;
- the active semester owns its own semester-folder and inbox pointers;
- study_course_historical_priors stores explicit archived-course relationships with owner-only RLS;
- direct carried retakes receive a same-key historical prior automatically;
- archived result/readiness/error context is advisory only and never restores mastery;
- historical priors are surfaced in retake diagnostics to prioritize what should be re-checked;
- every current course still needs fresh verified source material, active skills, and active questions;
- every retake needs a fresh baseline;
- study_certify_semester_bootstrap validates the bootstrap contract in the database;
- uncertified rollover semesters retain real commitments but block ordinary discretionary P10 work and P19 weekly-plan commitment;
- P12 activation now scales to the actual semester roster instead of assuming six courses / four majors / two retakes;
- the already-operational pre-P26 semester is grandfathered as certified to avoid a deployment regression;
- version 0.25.0.

The next phase is **P28 — Cross-Semester Transfer Validation, Prior Calibration & Longitudinal Learning Profile**.


### P27 invariant hardening

- switching the Study Drive account now resets the active semester's Drive tree rather than a hard-coded historical semester;
- switching or disconnecting Study Drive clears P27 certification until the active-semester Drive requirements are restored and certified again;
- direct writes to historical-prior rows are database-guarded: source snapshots and identity are immutable and canonicalized from archived owner data;
- archived historical priors are read-only;
- direct course-roster insert/delete operations invalidate bootstrap certification as a database invariant.
