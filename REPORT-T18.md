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
- **T18-02 A man walks slower, and the rack's number is a third of the size (2.1, 2.3).**
  `WALK_CELLS_PER_SECOND` is 1.0, one cell of the hall a second of real time at every speed in the
  game; nothing else about the walker is touched, and the walk test still reads the constant rather
  than a figure of its own, for its pace assertion and now for the cap on its own loop as well. The
  number over the rack is a third of the height, the stroke, the digit width and the padding Turn 17
  gave it, in the same place: `RACK_COUNT` is Turn 17's four figures over `RACK_COUNT_SHRINK`, and
  the stroke is written onto the text as a `font-size` attribute off the same constant, so the
  stylesheet no longer sets it and the plate and the glyph cannot be shrunk apart.
  Done: the new size test in `tests/render/views.test.ts` reads the plate's height and width and
  the glyph's `font-size` at a third of 26, 48 and 26, and checks the plate is still centred where
  it was; the new pace test in `tests/render/walkers.test.ts` pins the constant at 1.0.
- **T18-03 The date reads like a date (2.2).** One formatter, `formatCalendarDay(day)` in
  `src/engine/clock.ts`: the weekday, the day of its month and the month's name, `Mon 12 March`.
  `formatDate` calls it and puts the clock after it, and every one of the forty places that printed
  "day N" at the player calls it too, in the UI, in the renderer, in three engine strings and in the
  cloud save's note. Month names are `MONTH_NAMES` with `START_MONTH` [TUNE: March], twelve cycling,
  no year; `monthName(month)` is the second formatter and the three places that printed "Month N"
  (the month end's heading, the books' month chips, the books' empty month) call it.
  `state.clock.day`, `monthOfDay`, `dayOfMonth` and every engine figure are untouched: this is copy.
  Done: `tests/ui/calendarDate.test.ts`, five tests, of which the sweep opens the hall, the office,
  all eight screens, every page of the laptop and the day end and asserts that none of them matches
  `day N` for the current day, or `day` followed by any number at all; twenty-one existing tests
  moved onto the formatter rather than onto a new hard-coded string.
- **T18-04 One cross to close everything (2.5).** `closeButton(action)` in `src/ui/modal.ts` is the
  one helper and the one markup; the modal layer calls it for every skin and the Menu calls it with
  `closeMenu`. The disc itself is the one `.modal-close` rule in the stylesheet, lifted off the
  Company board: a cream face, a 3 px oak edge, the glyph in the title hand at the display size,
  54 px, hanging 11 px off the top right corner of whatever it shuts. The folder's small dark cross
  in the corner, the board's pale one, the screen's grey one and the Menu's own are gone, and the
  five figures behind the disc are tokens on `:root`, with one override each on the felt board and
  the Menu because their own frame is padding and an absolute child is placed against the padding
  box.
  Done: `tests/ui/oneCross.test.ts`, four tests: the openers table is checked against `MODAL_IS_FULL`
  so no `ModalId` can escape it, every one of the nine renders exactly one `.modal-close` whose
  outer HTML is `closeButton()` to the character and shuts on a click, the Menu's is the same helper
  with the one action that differs, and the stylesheet carries no per skin cross and the source
  spells the class in one file.
- **T18-05 Chips over tips (2.4).** `hallBottom` puts everything that stands under the hall in one
  column, bottom left: `.hall-bottom`, with the chips of T17 2.5 first and the first use tip last,
  both in the flow of that column. The chips are no longer placed on the view themselves, so a long
  tip pushes them up instead of being covered by them, and the column stops 76 px short of the right
  edge so a wide tip cannot run under the camera's three chips either. The tip is still `renderTip`
  through the one `withTip` helper, and the office, which has no hall to stand under, has neither.
  Done: `tests/ui/chipsOverTips.test.ts`, four tests: the DOM order of the column with a full bag
  store making a second chip, the same order with a tip forty sentences long, the camera's own
  corner, and neither of the two on the office.
