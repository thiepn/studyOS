# GPT-6 Luna in StudyOS — shared service integration

Status: **unmerged candidate, disabled by default, no live model calls made**.

`/assistant` is the StudyOS UI for GPT-6 Luna. The existing `/api/study/assistant` endpoint uses the authenticated THIEPN Account session. It reads only owner-matched active courses, approved skill/prompt map entries and verified resource titles, then calls the shared `thiepn/ai` `study.explain` capability through a server-only HMAC bridge. Full PDFs are not sent; source links remain local to the response. It never writes study progress or awards mastery.

The old direct OpenAI endpoint has been removed. No `OPENAI_API_KEY` or model selector is required in StudyOS, preventing bypass of shared budget guardrails. `THIEPN_AI_APP_SECRET` is never sent to the client. The shared service, not StudyOS, owns the actual provider key, model, token reservations and budget enforcement.

## Deployment configuration (not activated)

- StudyOS: `STUDYOS_AI_ENABLED=false` (keep off without explicit budget authorization), `THIEPN_AI_BASE_URL=https://ai.thiepn.dev`, `THIEPN_AI_APP_SECRET` (unique secret, 32+ characters).
- Shared AI service: matching `studyos` secret entry in `THIEPN_AI_APP_SECRETS_JSON`, plus working persistent guardrails and approved monthly spending limits.
- Both changes must be qualified and merged independently, with the service deployed before StudyOS is enabled.
- Run a real signed mock request first, then budget-capped live acceptance **only with owner approval**.

## Data, functionality, and limitations

The UI supports explanations, proof outlines, hints and self-test suggestions with up to eight recent conversation messages (10,000 total characters), optionally with a selected course. Model responses are ephemeral guidance and are not automatically inserted as academic evidence. StudyOS does not currently perform retrieval of actual PDF passages, so do not treat its resource list as citations to text the model has read.

StudyOS additionally restricts account/course access and input size. The shared service separately controls caller authorization, HMAC replay prevention, request quotas and persistent monthly spend. Production remains inactive until the required security and budget checks succeed.
