# THIEPN Vercel deployment policy — review candidate (2026-10-11)

Repository: `thiepn/studyOS`  
Vercel account: `thiepn-project`; project: `studyos`; production hostname: `study.thiepn.dev`.

## Objective and non-effects
- `vercel.json` disables automatic Git deployments on *all* branches, including `main`, using Vercel's documented `git.deploymentEnabled: false`. This does **not** delete, detach, replace, or promote any existing deployment.
- Existing routing, regions, environments, production aliases, backend storage, and current user data are unchanged.
- Existing GitHub CI continues running on PRs and pushes as before. CI is the default feedback loop; no Vercel preview on each Codex commit.
- The release workflow has **only** a manual `workflow_dispatch` trigger, with owner identity and exact-main-SHA checks, no scheduled or push-triggered deployment, and a repository enable flag defaulting to off.

## Prerequisites — must be reviewed before enabling
1. Merge only after reviewing CI evidence and verifying the Vercel configuration prevents branch previews. Do not turn on the workflow just by merging.
2. Establish protected `main` (required CI checks, PR-only updates, no force pushes) and a GitHub environment named `thiepn-vercel-production` restricted to `main`, with human reviewer protection if supported by the repository's plan. Existing main is presently unprotected; the PR does not change this.
3. Set `VERCEL_TOKEN` as a masked environment-scoped GitHub Actions secret (not a shared PR secret) granting only the Vercel operations required. Never place tokens in logs, source, or GitHub PR discussions.
4. Pin a reviewed exact numeric `VERCEL_CLI_VERSION` repository variable (example *format*, not an endorsed version: `42.0.0`).
5. Only after all protections have been verified, set the repository variable `THIEPN_RELEASES_ENABLED=true`. Without this, manual dispatch fails closed. If GitHub environment restrictions are not available, keep releases disabled and use a verified owner-operated alternative.
6. Validate Vercel prebuilt output for this application, including runtime environment variables, Vercel system variables and Next.js behavior, before first promotion. A successful staging build does not alone prove release readiness.

## Manual release (two explicit owner actions)
1. Wait for exact-`main` GitHub CI success and owner functional acceptance. Record SHA, current domain aliases and rollback target.
2. Manually run **THIEPN owner-gated Vercel release** on branch `main`, operation `stage`, exact 40-character `release_sha`, and confirmation `STAGE <sha>`. The job executes `vercel build --prod` and `vercel deploy --prebuilt --prod --skip-domain` for the fixed project ID. **Do not mistake a staged candidate for a live release.**
3. Inspect the staged deployment URL; test runtime behavior, auth, sessions, API routes, migrations and user-data compatibility. Capture evidence and confirm rollback target independently.
4. Manually run the workflow again with operation `promote`, the same exact current main SHA, the exact staged deployment URL, and confirmation `PROMOTE <sha>`. The workflow retrieves Vercel deployment data and verifies project ID, READY production target, exact URL and custom release SHA metadata before promoting.
5. Verify `study.thiepn.dev`, production routes, logs and account/data continuity. If validation fails, follow the existing approved rollback procedures; do not clear browser or Supabase data.

## Known blockers
- GitHub branch protection is not configured on `main`.
- GitHub environment rules and secret availability cannot currently be verified through the connected read-only API.
- Exact-head CI and runtime compatibility of the *new* manual workflow are unproven until its draft PR checks and a separately approved non-live stage run.
- Do not mix this change with redesigns, data migrations, custom-domain changes, or Vercel production-setting edits.

Official reference: https://vercel.com/docs/project-configuration/git-configuration
