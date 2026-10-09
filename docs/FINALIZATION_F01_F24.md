# StudyOS Finalization & Release (F01–F24)

Owner: thiepn/studyOS · Target: study.thiepn.dev · Start: 2026-10-09
This is a focused completion track after the historical P01–P40 implementation. No new speculative engine features until the core account, academic UI, Drive, Calendar, and release path work in a real browser.

## Observed baseline (2026-10-09)

- Base: PR #33 `fix/p34-study-api-error-disclosure` at `90997714e87860c113719dbe87ebcfd4a8f1c91f`, with passing GitHub Actions StudyOS CI run `37936555984` (unit tests, TypeScript, production build, server HTTP acceptance).
- Vercel `studyos` (project `prj_InmWzcVqFLAehnYX8i46hVhaII5i`) exists; latest observed preview is READY, but project metadata says `live=false`. Do not infer production works from a preview.
- The ChatGPT-connected Drive and Calendar are separate authorized Google accounts. Their connector credentials are NOT browser sessions or OAuth tokens usable by the StudyOS web application.
- On the user's selected connected Drive, a new `StudyOS/Wintersemester 2026-27/` folder hierarchy was created and independently re-listed on 2026-10-09. It contains `00_INBOX`, plus the four *optional* third-semester course-template folders and six category folders under each. This is **31 new Drive folders** in total (root 1, semester 1, inbox 1, courses 4, categories 24). IDs and account emails are deliberately omitted from this public repository.
- The app's current Drive provisioning routine uses exactly these course-folder and category names. Reconnect the app with the correct Drive account and adopt existing folders by name instead of creating a duplicate tree.
- Actual academic course enrollment, schedules, syllabus, exam times, OAuth success, runtime sessions, two-user privacy and mobile screenshots are **not** confirmed by creating Drive folders.

## 24 implementation phases

| Phase | Focus | Deliverable / acceptance |
|---|---|---|
| F01 | Connected Drive foundation and release baseline | Verify correct connector account, create/re-list app-compatible Drive hierarchy, record public-safe architecture and plan, open a stacked draft PR. |
| F02 | Account sign-in reliability | Repair real Google→Supabase OAuth redirect, cookies, return paths, loading/error states and sign-out; test canonical host and preview. |
| F03 | Account and recovery UX | Distinguish THIEPN identity from separate Study Drive/Calendar accounts; handle wrong-account, reauth, revoked consent, account switching and retry without lost progress. |
| F04 | Academic visual design system | Replace generic pill/card styling with a coherent study-workspace palette, typographic scale, density and accessible interaction tokens. Capture visual baseline before approval. |
| F05 | App shell and navigation | Rebuild desktop rails/top bar and compact mobile navigation with reliable selected-state, breadcrumbs and shortcuts. |
| F06 | Today dashboard | Make the first screen task-first: next action, today's bounded plan, deadlines, review backlog, study capacity, and calendar context; no filler. |
| F07 | Course workspace | Responsive courses overview and each course's week, syllabus, materials, weakness and deadline workflows. |
| F08 | Focus and practice | Distraction-free retrieval, worked proofs/maths, problems, evidence entry and independent attempt flow. |
| F09 | Resources and Drive UI | Searchable resources, Drive connection, inbox, provenance, scan state, intake preview and conflict resolution. |
| F10 | Progress, exams and analytics UI | Clear trend/evidence charts, exam readiness, simulations and actionable risk signals without fake precision. |
| F11 | Responsive and accessibility quality | Real 320–1440 px layout checks, mobile navigation, keyboard, focus, screen-reader labels, contrast and reduced motion. |
| F12 | Account isolation and safe session lifecycle | Validate owner-scoped Supabase reads/writes, session refresh, sign-out and account-switch cache/outbox purge. |
| F13 | StudyOS Drive OAuth and tree adoption | Connect correct Drive in app once; bind already-created StudyOS root to owner's active semester and reuse folders; guard wrong/stale roots. |
| F14 | Drive discovery and ingestion robustness | Idempotent scans, pagination/rate limits, renamed/moved files, duplicate detection, error recovery and read-only existing university files. |
| F15 | Source-backed learning pipeline | Accept/reject extraction candidates with provenance, citation anchors and stable mapping; prevent unverified content from affecting mastery. |
| F16 | Calendar OAuth and source selection | App-side Google Calendar consent/reconnect, selected-calendar read, busy/free import and visible account identity. |
| F17 | Calendar-aware scheduling | DST-safe Europe/Berlin free windows, academic workload limits, no overlap, optional events, explicit confirmation for writes. |
| F18 | Calendar synchronization recovery | Incremental sync and retries; canceled/edited event reconciliation without duplicating study blocks or modifying private non-StudyOS events. |
| F19 | First-use academic onboarding | Semester/course intake, template opt-in, real study requirements, data-empty states, no fabricated courses, dates or attempts. |
| F20 | Database and privacy certification | Verify migration compatibility, two-user Auth/RLS negative cases, security-definer/grant review, token encryption and least privilege. |
| F21 | Offline and cross-device resilience | Owner-scoped queued attempts, bounded outbox, safe replay, multi-tab behavior, online recovery and sign-out isolation. |
| F22 | Performance and error hardening | Eliminate slow fan-outs/blank crashes; check load time, API errors, tracing, access logs and deterministic regression tests. |
| F23 | Full staging release acceptance | All tests and exact-SHA preview, real browser desktop/mobile, account/Drive/Calendar journeys, anonymous denial, two-user privacy and rollback rehearsal. |
| F24 | Production launch and monitoring | Merge qualified changes, verify production deployed SHA, independent HTTPS and /api/health at study.thiepn.dev, OAuth and runtime, then defect-only release monitoring. |

## Execution policy

1. Implement changes in small reviewable branches/PRs. F01 stacks on PR #33 to preserve its verified API security fix.
2. Prioritize **working workflows and visual quality**; do not invent unnecessary approval ceremonies. Automated tests are required before merging. Human-only or device-only validation is reported honestly.
3. Reuse the existing THIEPN Account Supabase project. Never use THIEPN Core as a disposable test database.
4. Reuse the selected connected Google Drive folders. Never delete/migrate existing university content or expose private Drive IDs or OAuth credentials in this public repository.
5. Calendar reads may inform scheduling; writing user-calendar study blocks remains an explicit user-initiated operation.
6. Avoid additional Google Cloud setup unless the existing StudyOS Google OAuth client requires callbacks/scopes or secure server credentials. ChatGPT connector consent cannot be transferred into the web application.
7. Every finished phase report must include its exact code SHA, checks, remaining gaps and a clickable instruction to **start implementing** the next phase; not just a plan.

## F01 status

- [x] Identify correct connected Drive by provider profile.
- [x] Create folder hierarchy under that account.
- [x] Verify semester and all four course subfolder lists.
- [x] Inspect current StudyOS repository, PR #33, CI, Vercel project and app-side OAuth behavior.
- [ ] Confirm this branch's exact-head GitHub CI after the docs/code change.
- [ ] Real in-app OAuth and first-use account: F02/F03/F13/F16, not falsely marked completed here.

## Release definition

StudyOS is released only when the canonical HTTPS domain serves the exact qualified production commit, real sign-in persists a session, correctly authorized app-side Drive sees the new folder tree, Calendar reads the authorized account, personal study records remain owner-private, and ordinary study/review/semester flows work on desktop and mobile. Do not accept a green unit test or a static landing page as sufficient.
