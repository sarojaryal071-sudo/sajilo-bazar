# Working Agreement — How This Repo Gets Built

This document governs how every coding session works on Sajilo Bazar. Read this file
first, every session, before touching code. It exists to keep usage/token spend low
and avoid redundant work across sessions that don't share memory.

## 1. Orient from the index, not the codebase

Before starting any task, read `docs/PROJECT_INDEX.md` — a maintained map of every
file/module and its one-line purpose — instead of globbing or reading through the
whole project to "understand the codebase." Only open the specific files the index
points you to for this task, plus whatever `.md` doc in `docs/` is directly relevant
(e.g. `ADMIN_BUILD_PLAN.md` for an admin round, `DATA_MODEL.md` if touching schema).
Do not re-derive architecture from scratch each session — it's already documented.

If the index seems stale or wrong for a file you're about to touch, trust the actual
file over the index, fix the index entry as part of your change, and move on — don't
stop to reconcile everything.

## 2. Testing: lightweight only, every time

- Do **not** run full test suites, multi-browser Playwright sweeps, or re-test
  unrelated parts of the app "just in case" after a change.
- One targeted check per task is enough: a `curl`/HTTP call against the specific
  endpoint you changed, a direct SQL query, `npm run build` for a frontend change,
  or a single screenshot of the specific screen touched. Pick whichever actually
  exercises the logic you changed.
- **All broader/manual testing is done by the user after the fact**, from your
  completion report. Do not ask "should I test X too?" — just ship the change with
  its one lightweight check and a clear list of what the user should click through.
- Reserve anything heavier (full browser automation, multi-step flow tests) only for
  logic that is genuinely unverifiable any other way (e.g. a race condition, a
  real-time socket flow) — and say explicitly why you're going heavier in that case.

## 3. Scope discipline

- Do exactly the task given. Don't refactor, rename, or "improve while I'm in here"
  anything outside the task's stated scope.
- If you spot a real bug or gap while working that's outside scope, note it in your
  completion report as a flagged item — don't fix it inline unless it blocks the task.
- Batch only *related* work in one round (shared pattern, shared files); don't bundle
  unrelated fixes into the same commit/PR just because they came up at the same time.

## 4. Git workflow

- Feature branch → PR → merge to `main`. Keep commits scoped to the task.
- Before pushing: `git status` to confirm only the expected files are staged, and a
  quick look for anything that looks like a committed secret.

## 5. Every task ends with these three things

1. **Update `docs/PROJECT_INDEX.md`** — add/update the entry for every file you
   created or meaningfully changed (one line: path → purpose). This is not optional
   and not a "later" step — a task isn't done until the index reflects it.
2. **Update the relevant spec doc if the change affects it** — e.g. a new column
   means a `DATA_MODEL.md` update, a new screen means `SCREENS.md`, in the same PR.
3. **A concise completion report** — bullet points only:
   - What changed (feature/fix, not a diff narration)
   - Files touched
   - The one lightweight check you ran and its result
   - A short manual-test checklist for the user (2-5 concrete steps, e.g. "log in as
     X, do Y, confirm Z") — this is how the user verifies it, so make it specific
     enough to follow without re-reading the code
   - Anything flagged as out-of-scope-but-noticed

## 6. Model/effort

Default to the lowest-cost model/effort that can competently do the task (see
`docs/PROJECT_BRIEF.md` if unsure of stack conventions) — reserve higher effort for
genuinely hard logic (race conditions, complex queries), not routine CRUD/UI work.
