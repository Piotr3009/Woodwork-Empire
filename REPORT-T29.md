# Report, Turn 29: the production line, the five axis CNC, the timber stores, and four to a contract

Woodwork Empire, Turn 29. Built against `CLAUDE.md` of 05.10.2026 (first line "Turn 29").
Branch `turn-29-the-line` off `5b05355`, the tree `origin/main` stands on (v83, STATE_VERSION 41).

## The tasks

**T29-A0 The suite on v83.** On main as it stands `npm run check` is green on its own exit code:
lint, the build and 2,652 tests in 278 files, none failing and none skipped, so nothing moved and
nothing was changed; no commit.

**T29-A1 Housekeeping and v84.** `docs/turn-28-brief.md` was already in `docs/` and `CLAUDE.md` is
this turn's brief (first line "Turn 29"), so nothing was moved; the README names the Turn 28 brief,
`REPORT-T29.md` and `docs/art/REQUESTS-T29.md`. `APP_VERSION` goes v83 to v84 with the two tests
that name it flipped (`version.test.ts`, `saveCheck.test.ts`); `STATE_VERSION` is B3's.

**T29-A2 The mockups.** Six pages of section 9 into `docs/mockups/t29/` with a README, each the
game's own markup by its own renderers beside the same screen today: four to a contract and the
trimmed save's card; the five axis CNC and the robot; the Production line tab; the engineer and the
strip; the timber stores; the sash window contract. (7), the logo, is not drawn: no
`docs/logo-incoming/` on main.

**T29-B1 The glass the next working day.** `GLASS_DELIVERY_WORKING_DAYS` is 1 [PIOTR, 05.10], and
`TIMBER_LEAD_DAYS` is written as `GLASS_DELIVERY_WORKING_DAYS + Object.keys(TIMBER_STANDS).length`,
3, with `TIMBER_STANDS` moved from `jobs.ts` into `constants.ts`; the comments and the three test
literals (10, 12, 12) say so, and the glass's "day before it is due" half flipped to "ordered today,
in at the next working day's open". A greyed timber enquiry of an old save drawn with +12 now has 3
taken off for its hands and may turn takeable at the next settle (stored days, read as stored).

**T29-B2 One cutter set of a kind.** `canBuy` refuses a cutter set of a kind the company has or has
on order, in the tool changer's shape (owned and not sold, plus on order), with `One set serves
every moulder`; the card shows its locked `Buy another` and the words under it with no change to the
card, and a save that holds two keeps both. Asserted in `t28Families.test.ts`, owned and on order.

**T29-B3 Four joiners to a contract, and STATE_VERSION 42.** `CONTRACT_MAX_JOINERS` 4 [PIOTR,
05.10], asked in `contractAssignCheck` after the man's own check and passed by a man already on it,
so a full contract always lets a man off and a refused mover stays where he was; `contractCrewLine`
puts `On it` on both tabs, the Orders board locks a free man's `Put on it` with `A contract takes
four joiners at the most`, the Work Plan puts that reason in place of `Assign to this contract` and
never draws the list for a full contract (and the click that fills it shuts the list, so Escape is
not swallowed); `contractMenNeeded` is four at the most, and the hall line counts the four of the
highest rate with four at the machine and reads `with four on it` for a company of more than four
(v83 to the figure at four or fewer). The lift to 42 trims a running contract to the first four,
frees the rest and queues `contractsTrimmed` for the first settle; it brings a glass on its way
forward to the next working day. `contractHall.test.ts` restated for six joiners: 144 to 104, 144
and 180 to 104 and 128, 162 and 144 to 128 and 104, 156 and 168 to 112 and 128.

**T29-C1 The 22 pictures.** `git mv` from `docs/pictures-t29/` into `public/sprites/`, the
manifest regenerated (280 pictures), the folder and its JSON gone, `docs/art/SPRITES.md` section 13
written (the table, why the names changed, the shelter's two views, module 1 drawn with no saw, the
stores drawn full). The two pins of turned files go 96 to 107; the measured class count moves as
each family lands. No pixel touched. `tests/ui/t29Families.test.ts` holds the 22 on disk.

**T29-C2 The unit a spec names, a ladder of three, where a timber stage is done, stand ins, and
the five axis CNC.** `minUnitM2` on a spec, refused in `canBuy` straight after the reputation with
`Needs the 800 m² unit`. A ladder family is an unbroken run of `CLASS_ORDER` of two or more
(`variants.test.ts` and `machine.test.ts` flipped by name), `TIPS.catalogue` reworded.
`stageFamilyIn(state, job, stage)` beside `familyForStage` (untouched) answers a timber job's stage
off the hall, and `stageSpeed` and `stagePlanFor` read it, so the plan, the places, the men drawn
and the Work Plan follow. `TIMBER_STAND_INS` is the one table of stand ins; `missingEquipment` reads
it for a timber product only, and the tile's `Needs` line prints the one `wantedKit` list whole.
`cnc5` in every side table, its six ports measured off the pictures, its card line from
`CNC5_STAGE_FACTOR`, its order built to order (`BUILT_TO_ORDER`, `Built to order: it cannot be
called off`). Pins: the CNC centre tab, ports 37 to 40 and 84 to 90, measured classes 96 to 99, the
catalogue's metres; the two buy-everything tests pass over what the 200 m² unit refuses for its
size.

**T29-C3 The spraying robot.** `sprayRobot`, one class, 120,000, 30 working days, 8 a day, 2 by 1
by 2.25 in a zone of 3 by 2, `requires: ['sprayBooth']`, carried in, no places, nought dust, no
extraction, air or ducting of its own. `SPRAY_ROBOT_FINISH_FACTOR` 2 is written once, in
`stageSpeed`, on the Finishing at a booth that runs while a robot stands that is not broken or away
(`sprayRobotRuns`); a lacquered sheet job's Finishing feels it and nothing else of it moves. A second
is refused with `The hall has its spraying robot`. Its card's own line stands in place of Output;
it has no line on the Output sheet and no row in `machineSavings` (`onTheMachineSheets`). Pins:
measured classes 99 to 100, `hallItems` 23 to 24 (it found its 3 by 2 on the 200 m² floor).
