# F01 — Connected Drive hierarchy acceptance

Date: 2026-10-09

## Concrete outcome

The user's **currently connected ChatGPT Google Drive**, not the previously removed account, contains a fresh `StudyOS` root and the following verified structure. These entries were created through the authenticated Drive connector and all semester/course child listings were re-read successfully.

```text
StudyOS/
  Wintersemester 2026-27/
    00_INBOX/
    10_Differentialgleichungen/
      00_COURSE/
      01_WEEKS/
      90_ALTKLAUSUREN/
      91_SCRIPT/
      92_REFERENCE/
      99_SYSTEM/
    20_Stochastik/
      [same six folders]
    30_Theoretische Informatik/
      [same six folders]
    40_Algorithmische Mathematik und Programmieren/
      [same six folders]
```

Count: 31 newly created folders = 1 root + 1 semester + 1 inbox + 4 course roots + 24 course subdirectories. No academic files were copied, moved or deleted. The names of the four optional templates must be reviewed against genuine course enrollment before course records are created.

## Matching the StudyOS web application

- Existing code creates/reuses `StudyOS` at the Drive account root; falls back to the legacy `Semester OS` if present.
- Existing code sanitizes semester name `Wintersemester 2026/27` to `Wintersemester 2026-27`.
- For active courses with sort orders 10, 20, 30 and 40 and the listed display names, it reuses the exact course root and category folder names.
- In the app, **select the same Google account as the connected Study Drive**. The ChatGPT connector's OAuth does not automatically supply tokens to StudyOS.
- The app's server-side credential and semester/course folder mappings remain private Supabase data; never write raw folder IDs or emails to this public GitHub repository.
- If the actual semester or course roster differs, do not silently force these folders onto different courses. Prefer verified mapping and explicit ownership; the structure itself is non-destructive.

## Release boundary

Provider-side folder existence is confirmed. In-app Drive OAuth, owner-scoped mapping persistence, first scan, course classification, and end-to-end owner isolation still require real application execution in F13–F15. Calendar is a separate connected account and requires its own StudyOS OAuth.

GitHub source plan: `docs/FINALIZATION_F01_F24.md`.
