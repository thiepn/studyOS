# UX rescue review — 10 October 2026

Branch: `codex/studyos-ux-rescue`. Existing assistant changes preserved. Work remains uncommitted for review; no production changes or paid AI requests.

## Changes

| Previously | Implemented |
| --- | --- |
| Repeated page navigation and mobile menu | One persistent desktop sidebar and five direct mobile destinations; Assistant remains directly accessible |
| Analytics preceding daily work | Daily recommendation first; course links and upcoming deadlines; expandable planning and advanced insights |
| Empty account redirected into setup | Short welcome journey with one next setup action |
| Course cards with passive week markers | Searchable directory, clickable weeks and direct materials/practice/AI links |
| Course diagnostics mixed into coursework | Contextual section links, materials before weekly metrics, expandable overview, topics and exam tools |
| Material processing above files | Searchable materials first; course, week, type and verification filters; existing registration and approval controls retained |
| Prominent risk scores | Practice action and learning evidence first; scores in diagnostic details; untested exam readiness labeled Not assessed |
| Settings buried at end of tool index | Settings and Drive/Calendar connections first in More |
| Assistant availability discovered through failed requests | Spending-paused state before composition, course context retained, MathML and fenced code rendering |
| Focused question still surrounded by global destinations | Global shell hides during focused studying; existing Show navigation control restores it |

Actual source changes cover the shell, Today/welcome, Courses, course detail, teaching-week panel, materials, Progress, More, and Assistant. Active study uses the existing ReviewSession with new shell behavior. Auth, scoring, evidence rules, solution gating, offline custody and APIs are preserved. Materials add one authenticated, course-scoped teaching-week read; no schema change.

## Verification

- TypeScript passes.
- Production build and public browser configuration assertion pass. The assertion now loads local env through Next's loader, preserving CI precedence and all assertions.
- Full unit suite: 456/457 pass. Existing F16 source-custody symlink test fails with Windows EPERM; it was not skipped or weakened. F20 static contracts pass separately.
- Chromium: seven synthetic surfaces at 320, 375, 390, 430, 768 and 1280px without horizontal overflow. Fifteen separate candidate screenshots; no locked golden changed.
- Browser interactions: course search, week navigation, lecture/exercise discovery, hidden solution before independent work, material search/reset, course-to-assistant context, paused AI state, mocked mathematical/code reply, connection discovery, actual ReviewSession start/answer lock/grade/save, rejected-write error and successful mock confirmation.
- `.env.local` remains ignored. Exact OpenAI secret scan found no key in production browser assets. Spending remains disabled.

Synthetic fixtures reuse production components in `scripts/ux-preview`; they have no production middleware or server API routes. A deliberately invalid synthetic identity is used only in the browser fixture. Study/assistant requests are intercepted. This qualifies UI behavior, not provider acceptance or actual saved academic evidence.

Candidate images and machine-readable manifest: `C:/Users/junso/.codex/visualizations/2026/10/10/01a1274c-d4f1-7782-84d1-215df57f86c1/studyos-ux-candidates/`.

## Outstanding acceptance

The full sixteen-scenario acceptance requirement is not complete. Creating a semester/course, adding real material, actual persisted progress, and real deadlines need authenticated end-to-end browser checks. Today and Progress server compositions also need authenticated screenshots; synthetic Today uses shared components and does not render the real server orchestration. Drive, Calendar and THIEPN sign-in need owner acceptance. Physical-device keyboard/accessibility qualification remains open. No live RLS, OAuth, migrations or production records were exercised.

Highest-value remaining UX work: simplify the material registration/approval forms further, qualify the full first-use creation workflow, and inspect populated Today/Progress with authorized data. This is a substantial implemented redesign with qualified synthetic flows, not a claim that every production acceptance criterion is complete.
