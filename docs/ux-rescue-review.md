# StudyOS redesign review — 10 October 2026

## Delivery and changes

Delivery target: `main`, based on `85f01f98b3f1de36eb35a40a41fca35a9948563d` (the previous production commit). No user changes were present before this implementation. No schema migrations, paid AI calls, or production academic writes were performed.

| Before | Implemented |
| --- | --- |
| Competing destinations and repeated page navigation | Five desktop destinations; five mobile destinations; connections/account first in Settings & tools |
| Dense course page loading exams and diagnostics together | URL-backed Overview, Weeks, Materials, Practice, Progress; exam intelligence and master map read only for their views |
| Week files buried under learning diagnostics | Current-week files in Overview, direct file rows in Weeks and Materials; source rules expandable; solution gates retained |
| Technical material form mixed with processing panels | Native Add material dialog using the existing authenticated Drive-registration handler; source details expandable; processing kept in a separate disclosure |
| Setup reference keys and certification competing with ordinary use | Name-first course form, generated reference key, next material action, separate certification details |
| Repeated workspace and evidence reads | Request-scoped authenticated client/workspace/roster/evidence snapshots; complete history retained; dedicated course directory summary loader |
| Partial prefetch leaving a visible route transition | Full prefetch for core destinations; advanced routes excluded; persistent shell and pending-link feedback |
| Inconsistent cream/green/serif visual rules | Shared slate/white/blue tokens, system sans-serif, restrained borders and corners; superseded declarations removed; login/account and legacy routes inherit the same foundation |
| Authorization denial could enter an offline retry path | SQL permission denial becomes a permanent 403; failed attempt never appears Recorded |

Existing planner, scoring, independence, OAuth, owner checks and offline receipt contracts remain intact. Calendar details stream independently from Today’s main content. No shared persistent cache of private records was introduced.

Source changes cover shell/navigation/loading, Today orchestration, Courses, course tabs/overview/materials, focused study context, Materials/registration, first use/semester setup, Settings & tools, Connections, Assistant styling, login/account styling and the shared visual foundation used by advanced routes. Progress retains its existing evidence-led composition with shared read deduplication.

## Verification

- TypeScript and production build pass with existing local configuration; browser public-configuration assertion passes.
- Unit suite: 461/462 pass on Windows. The unchanged source-custody symlink test cannot create a symlink (`EPERM`). Linux CI runs the complete suite without skipping it. F20 static release contracts pass separately.
- Existing anonymous built-server acceptance smoke passes, including login guards, denied unauthenticated writes, callback boundaries and sign-out origin checks.
- Actual production application routes against a loopback, stateful Supabase protocol double: 17 checks pass, no browser exceptions, 25 candidate screenshots. Six widths: 320, 375, 390, 430, 768, 1280px; no document overflow.
- Journeys include semester/course creation, search/rediscovery, Week 1 lecture/exercise discovery, material registration and rejected write, real session/attempt handlers, save retry, persisted progress, Today recommendation/deadline, course Assistant context, connections, mobile navigation, Back/Forward and legacy week hashes.
- Keyboard focus remains inside the native material dialog; Escape closes it. Reduced-motion browser context exercised. Refresh restores unfinished work; interrupted writes stay owner-bound and Queued rather than Recorded.
- Assistant failure/retry/success, mathematics and code are tested on the actual Assistant page through intercepted responses in a separate no-key local runtime. Main runtime remains spending-disabled.
- Candidate screenshots inspected for Today, Courses, course overview/tabs, Materials/dialog, focused study, Assistant, Progress, onboarding, settings and connections. Locked screenshot goldens unchanged.

These are synthetic provider results. They do not establish live Supabase RLS, Google consent or physical-device keyboard acceptance. Offline receipt replay is covered by existing contracts; this new browser check qualifies draft recovery and truthful queued status, not a live replay receipt.

## Performance

Five samples per route and navigation mode, Chromium desktop, production server, identical loopback fixture. Medians in milliseconds:

| Route | Baseline document | Redesign document | Baseline warm/prefetched | Redesign warm/prefetched |
| --- | ---: | ---: | ---: | ---: |
| Today | 417 | 395 | 842 | 62 |
| Courses | 98 | 380 | 70 | 68 |
| Course overview | 135 | 98 | — | — |
| Assistant | 75 | 70 | 66 | 71 |
| Progress | 87 | 80 | 74 | 69 |

Useful page headings/content are completion markers, never loading placeholders. Document measurements block background prefetch to isolate route work. Core warm useful content meets the controlled 200ms target; warm Today improves about 93%. Document loading has intermittent roughly 300ms rendering/streaming delays, notably Courses in this run; cold-load improvement is not established for every route. Document runs use a warm process, so first-process startup remains separately unqualified. Baseline required Webpack because its temporary dependency junction is unsupported by Turbopack; redesign uses the normal Turbopack build, limiting strict causal comparison.

Route provider GET counts: Today 40→37, Courses 9→3, course overview 12→8, Progress 14→13. Prefetched core clicks make zero provider reads in these samples. Authenticated provider latency is absent from loopback tests. Live anonymous login measured 140→131ms before this release; this is not authenticated production-navigation evidence or a post-release improvement claim.

Evidence: `C:/Users/junso/.codex/visualizations/2026/10/10/01a1274c-d4f1-7782-84d1-215df57f86c1/studyos-redesign/` and sibling `studyos-performance/`. Reproduce with `scripts/application-journey.mjs` and `scripts/navigation-performance.mjs`; set `PLAYWRIGHT_MODULE` when using the bundled Windows runtime. The isolated journey is also in Linux CI.

## Release and remaining acceptance

Push normally to main after checking remote ancestry, then observe GitHub CI and the existing Vercel production deployment. Exact deployed SHA is checked through `/api/health` and the existing read-only deployment qualification script. Previous production SHA above is the rollback reference for a normal revert; no force push or protection changes.

Highest-value remaining acceptance: authenticated owner timing and real Google consent, physical mobile keyboard/screen-reader use, intermittent document-rendering delay, and visual review of populated advanced administration/exam screens. Shared styling covers those routes, but they have not all received individual owner acceptance. Deployment/CI results are reported separately with the final release SHA.

## October 11: document workspace revision

Owner direction: a structured study workspace, like Notion. Replaced the blue-tinted canvas and prominent timeline with a white document surface, neutral gray sidebar, line icons, restrained typography and compact actions. Today now pairs the real planner recommendation and next tasks with courses/deadlines; optional planning is one disclosure with working schedule hashes. Course Overview pairs current files with the next study action, retains source/solution gates, and fixes desktop header flex sizing. Courses use quieter directory rows. Materials place real search/filters first and disclose source explanations. Progress removes the decorative spine and uses concise evidence columns. Settings exposes connections/account first and folds advanced groups. Assistant and active study remove nested heavy framing. Shared tokens propagate to existing routes; advanced screens still need individual owner visual acceptance.

Removed the superseded daily timeline declarations from globals/today CSS and introduced scoped daily-actions styles. No schema, authorization, learning algorithm, provider contract or spending-control changes.

Verification: production build and TypeScript pass. 19 isolated actual-route journey checks pass, with 25 candidate screenshots, six responsive widths (320/375/390/430/768/1280), zero page errors, real-handler success/failure, owner-separated fixtures, offline recovery, deep links, Back/Forward, native disclosures and mocked-only assistant calls. Screenshots inspected for Today, Courses, course detail, Materials, Progress, Settings, Assistant and active study. Candidate evidence: studyos-notion-final under the existing local evidence root. Unit tests: 465/466 pass on Windows; unchanged symlink-security test is blocked by Windows EPERM and remains required in Linux CI. F20 contracts pass. No locked visual goldens changed.

Rollback reference for this revision: previous production main 6d991e14147bb285a125877b6069974c1c3be894. Release SHA, Linux CI and exact production smoke verification are reported after normal push. Live Google consent, owner-specific production navigation timing and physical mobile keyboard/screen-reader acceptance remain separate from synthetic verification.

## October 11: visual polish

Retained the approved document-workspace structure and refined its visual identity: slate-blue action colors, a compact StudyOS mark, white active navigation with a location indicator, clearer title/section rhythm, contextual task icons, duration/date badges, finer borders and restrained surface depth. Course/file identities and active tabs are consistent; forms have explicit focus states and buttons have hover/pressed feedback. Mobile navigation includes the same icons. The Assistant has a defined composer and clearer conversation roles. Reduced-motion preferences remain enforced; no new dependency, font request, data query or learning-rule change.

Verification: local production build and TypeScript pass; 19 isolated browser journey checks pass with zero page errors and 25 candidate screenshots across six widths. Inspected desktop/mobile Today, course overview, Materials and Assistant. Windows unit results remain 465/466 with the unchanged symlink fixture blocked by EPERM; Linux CI will qualify all 466. F20 contracts pass. Evidence is in the studyos-polish-final sibling folder; locked goldens were preserved. Prior Vercel rate limiting may still prevent production delivery and is checked separately after normal push to main.
