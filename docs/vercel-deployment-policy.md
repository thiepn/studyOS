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

## V3 owner approval and Hobby rollback checklist (no live operation)
- This PR's SHA256-pinned actionlint source QA and actual preflight acceptance/denial tests must pass at the final exact PR SHA. That does **not** establish an activated production release workflow.
- Independently confirm enforceable protection of `main` (PR-only changes, exact-SHA required checks, no force pushes) and a **real**, main-only, required-human-reviewer GitHub environment named `thiepn-vercel-production`. The workflow's environment reference does not itself create reviewer protection.
- Verify, without disclosing any credential, the necessary least-privilege environment-scoped `VERCEL_TOKEN`, a reviewed exact `VERCEL_CLI_VERSION`, and a disabled-by-default `THIEPN_RELEASES_ENABLED` variable. These must remain disabled/unconfigured during V3.
- A later owner-authorized **merge** suppresses all automatic Git deployments; it does not authorize staging or promotion. When separately authorized, record the exact current `main` SHA and successful CI run, the *currently serving* Vercel production deployment ID, correct domain aliases, app health and rollback candidate. Do not use the project's latest deployment when it is a preview.
- **Stage approval:** owner explicitly dispatches `stage` with exact main SHA and `STAGE <sha>` confirmation. Verify that the resulting prebuilt production candidate `--skip-domain` has no live aliases. Independently acceptance-test Next.js routes, sessions, auth, environment settings, protected endpoints and user-data compatibility.
- **Promote approval (separate):** owner explicitly dispatches `promote` with the same main SHA, the exact staged production URL and `PROMOTE <sha>`; reverify source and Vercel project identity, watch live custom domain, logs and functional health. Never assume a green source-only QA authorizes promotion.
- **Hobby rollback:** only the immediately preceding production deployment is eligible. With separate owner authorization and confirmed project scope, use `vercel rollback --scope thiepn-project`, then `vercel rollback status --scope thiepn-project`; verify live aliases and continuity. A code rollback does not undo Supabase/database migrations or user-data changes. Rollback temporarily disables automatic alias assignment; do not re-enable Git deployments as a workaround.
- Stop on any missing environment protection, unverified prebuilt output, Vercel quota exhaustion or main-SHA drift; no repeated retries.

Sources: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments ; https://vercel.com/docs/cli/rollback
