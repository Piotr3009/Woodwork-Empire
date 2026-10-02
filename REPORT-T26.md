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

**T26-A2 The four mockups.** `docs/mockups/t26/` with its README: the day 53 hall before and after
2.1 and 2.2 and a man behind the moulder before and after 2.4, drawn with `renderHall` and shot in
headless Chromium, and the Pace sheet's head and the agency's card as HTML in the game's own
classes. The tree has no day 53 save, so `day53Hall` in `tests/helpers.ts` stands Piotr's hall of
01.10 up from his words (six joiners, a CNC, a pro saw, two edgebanders, a moulder, a booth, the
labourer, the office, and Nathan on a contract); it is the day 53 fixture wherever the brief names it.

**T26-A3 One kind of man, the labourer's name, the draftsman's grades, the admin's desk, STATE_VERSION
34.** The three trades are gone from `WorkerRole`, `HIRING_SPECS`, the tabs, the task tables, the
Output sheet and the answer skew, with `tradeFactor` and the three spray rates: a booth minute is
the man's grade times the hall's points. The site survey is the draftsman's (and the owner's), the
meeting his then the salesman's, the drawings his at 0.8, 1.0 or 1.2 by grade on his own gate
(15, 50, 90) and wages (2,400, 2,900, 3,400 [TUNE]); the take off and the orders are the admin's
at the owner's speed, Joinery Core's line counted for her. Two rules this needed and the brief did
not write: a draftsman takes a job's drawing only once its meeting and survey are done, and the
survey is created before the drawing, or he had the drawing in hand and no hand free for the
survey; and the draftsman moved to the Technical tab, which would otherwise hire nobody. Every
word a player reads says labourer (`helperOnDuty` and the `HELPER_*` names renamed too; the id
`helper` and the sheets stay). `liftToVersion34` does section 4. The three month playthrough now
goes to the bank on day 89 (no take off man's site measures, no quarter of answer skew).

**T26-B1 The crew limit is joiners.** `crewCount` counts the joiners and nobody else, the owner
included, and the line reads `Joiners 4 / 8, the unit takes 8 joiners`; `crewFull` is never true
for anybody but a joiner; the canteen's lockers, its plates and its hiring gate count the joiners
and the labourer only (`LOCKER_ROLES`), so the office and the manager pass eight on the books.
Two things the brief did not settle and this left as they were: the unit's bench slots (six on
very easy, four on easy and hard) refuse a seventh joiner at the hire card before the eight is
reached, and the eight lockers still hold eight joiners and labourers between them; T23's (nn),
nine men under a novice, is reachable through the hire card from tonight and is flipped to say so.

**T26-B2 Reputation is earned slower.** `changeReputation` books a gain at `REPUTATION_GAIN_FACTOR`
0.5 [TUNE] and a loss at its whole, and nowhere else; the log line is the points booked, and the
client's own rating on the delivery card is what he said. A month of eight on time jobs and two
late ones books 5 where it booked 17. Moved figures, one line each in the tests: thirty days on Easy
ends at 11.5 (23 at half), its lowest balance 2,741 (2,746) and the short handed month's -680 (-862);
the fan month is read by the value delivered, the big fan's standing taking bigger jobs; the three
month playthrough trades to day 92 again (months 7,350, 398, -12,999, an experienced manager on day 65).

**T26-B3 At most three standing contracts.** `CONTRACTS_MAX` 3 [PIOTR]: `offerContract` draws
nothing while three run, the weekly offer owed or not, and `acceptContractCheck` refuses a fourth
already on the board, the Contracts tab's card and the laptop's tile showing `3 contracts running:
the most the shop takes on` where the take button was (the one click of `takeContract` asks it
first). No scenario moved: none of them runs more than one contract.
