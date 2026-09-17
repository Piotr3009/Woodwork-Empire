# Report: Turn 18

Easy and friendly. Built in Claude Code, cloud, on branch `claude/festive-ramanujan-9p66nw`,
17.09.2026.

Base: the branch's own head, which carried `APP_VERSION` `v25` and `STATE_VERSION` 15, the brief's
precondition. The report is written as the turn is built: one entry per task, in the order the task
queue of section 4 names them.

---

## 0. Blockers, and where the session did not follow the brief to the letter

**Nothing stopped the build.** Filled in at the end of the session.

---

## Tasks

- **T18-01 Housekeeping and v26.** `docs/turn-17-brief.md` is the root `CLAUDE.md` of the Turn 17
  merge commit (`fa5131d`), byte for byte, 19,209 bytes, checked with `cmp`; the README's briefs
  line names it and its reports line reaches `REPORT-T18.md`; `APP_VERSION` is `'v26'` and
  `STATE_VERSION` stays 15.
  Done: the two version assertions (`tests/ui/version.test.ts`, `tests/ui/saveCheck.test.ts`) read
  `v26`, and the third still finds the string in `constants.ts` and nowhere else in `src`.
