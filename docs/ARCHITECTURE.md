# StudyOS architecture

```text
THIEPN Account
  └─ identity

StudyOS Next.js / Vercel
  ├─ Today
  ├─ Courses
  ├─ Practice
  ├─ Resources
  └─ Progress
       │
       ├─ Supabase study_* domain
       │    ├─ resources / versions
       │    ├─ topics / skills / questions
       │    ├─ attempts / errors / review state
       │    ├─ sessions
       │    ├─ ingestion candidates
       │    ├─ Drive intake ledger
       │    └─ weekly health
       │
       └─ Separate StudyOS Google OAuth
            └─ dedicated Google Drive account
                 └─ Semester OS / WS26-27
```

## Trust boundaries

1. Raw academic source files stay in Google Drive.
2. Supabase stores structured state and provenance, not PDF binaries.
3. The browser never receives the Google refresh token or Supabase service-role key.
4. Semantic extraction candidates are inert until explicitly accepted.
5. Mastery is created from retrieval/problem-solving evidence, never from reading a solution.
6. ChatGPT conversations are workspaces, not canonical storage.
