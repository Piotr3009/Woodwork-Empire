# Report, Turn 21: debt you can see, people who do not wait for you

Woodwork Empire, Turn 21. Built against `CLAUDE.md` of 19.09.2026 (first line "Turn 21").
Branch `claude/determined-tesla-e90ze6`. `APP_VERSION` v29 to v30, `STATE_VERSION` 17 to 18.

Two lines a task, in the order of section 5, each with the commit it sits in. Filled in as the
turn runs; section 0, the numbers chosen, the cross check and the pictures are written at the end.

## Tasks

**T21-A1 Housekeeping and v30.** The Turn 20 brief archived byte for byte from the Turn 20 merge
commit (`git show 7982787:CLAUDE.md > docs/turn-20-brief.md`, 25,868 bytes, `diff` silent), the
README's two lists brought up to date (the brief, `REPORT-T21.md`, `REQUESTS-T21.md`),
`APP_VERSION` `'v29'` to `'v30'` in `src/engine/constants.ts` with its two tests, and
`docs/art/REQUESTS-T21.md` written from section 9: the sprayer's four sheets, the helper's bench
sheet, nothing for the bubbles.
One baseline red was fixed with it, and it was not this turn's doing:
`tests/engine/rotate.test.ts` asserted that no `.r.png` had ever been delivered, and Piotr's own
commit `d26f66f` delivered `toolCabinet.standard.r.png`. The test now asserts what the code always
promised: the cabinet turned is drawn from its own file, every other class still mirrors.
