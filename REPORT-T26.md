# Report, Turn 26: one kind of man on the floor, and a hall that looks like a workshop

## The tasks

**T26-A0 The suite settled on v62.** On main as it stands the full suite failed 30 of 2,388: 27
were scenario and UI figures the v61 arithmetic (a man's grade times the hall's points) moved and
v61 did not re-pin, one was v62's Assign list of free men only (`v38.test.ts`), and two were the
turned sprite count, 67 and not 66, because `palletTruck.standard.png` and its `.r` (renamed
`forklift.used.*` in v54, listed in v61's DELETED.txt) are still on disk and the build's manifest
counts what is on disk; v59 already failed one side of that pair, the manifest's own test. Each was
re-pinned with one line of reason; nothing of the engine was touched, and `npm run check` is green.
Deleting the two pallet truck files was refused by this session's permissions, so they are left
for Piotr: deleting them and putting 66 back in `rotate.test.ts` and `spriteClasses.test.ts` closes it.

**T26-A1 Housekeeping and v63.** `docs/turn-25-brief.md` was already in `docs/` (Piotr's
`1a58cfb`) and `CLAUDE.md` is this turn's brief (first line "Turn 26"), so nothing was moved; the
README names the Turn 25 brief, `REPORT-T26.md` and `docs/art/REQUESTS-T26.md`, and `APP_VERSION`
goes v62 to v63 with the two tests that name it flipped (`STATE_VERSION` is phase A's).
`docs/art/REQUESTS-T26.md` takes the sprayer's four sheets off the list (2.6) and restates the
labourer's bench sheet, the backs of every floor family but the tool cabinet, and the seven recordings.
