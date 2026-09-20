# Report, Turn 23: a man works when the boss says so, a manager who earns his keep, a canteen with eight lockers

Woodwork Empire, Turn 23. Built against `CLAUDE.md` of 20.09.2026 (first line "Turn 23").
Branch `claude/busy-archimedes-fznv89`, off `cd51383`, the tree this turn opened on and the tree
`origin/main` stands on. `APP_VERSION` v35 to v36, `STATE_VERSION` 19 to 20.

`npm run check` on the finished tree, read off its own exit code: **exit 0**, **220 test files,
2,200 tests**, 2,199 of them passed and one the standing todo of Turn 12's blocker, up from 209
files and 2,053 tests at this turn's first green check. Thirty one commits, every one of them with
a green check of its own before it. Six sets of hands: the lead for phases A1, C1, C3 and C5
and for the three merges, one agent for phase A2, three for the three phase B groups working at
the same time in three git worktrees, and two for phase C's scenarios and pictures.

`git diff main --stat`: 160 files changed, 9,102 insertions, 1,355 deletions, of which this
report and the three notes files are a good share. `src` alone is 2,794 insertions against 863
deletions over 36 files; the tests are 4,046 against 485 over 99.

Two lines a task, in the order of section 5, each with the commit it sits in. The three notes
files stay in `docs/` because they carry the exact old and new text of every change an agent made
outside its own files, which is the record of who wrote what.

## 0. Blockers, and where the session did not follow the brief to the letter

**Nothing stopped the build.** Everything in sections 2.1 to 2.17 is built, tested and
photographed, nothing on the "do not" list of section 6 was done, and every v33, v34 and v35 save
loads. Three things in the brief could not be built as written and each is an item below with the
arithmetic that rules it out; nothing was faked in their place.

The items below want Piotr's eye. The first four are decisions the brief left open or that the
arithmetic would not take as written; the rest are consequences of decisions the brief did make.

1. **A ninth man cannot exist, so no grade of manager ever carries as many men as his row says.
   2.4 and 2.10 cannot both bite, and this is the first thing to settle.** 2.10 gives the canteen
   eight compartments and the hiring gate refuses the ninth man on the books whatever his trade.
   The manager is one of those eight, and he does not carry himself (item 5), so the most men any
   manager is ever asked to carry is **seven**. `PRODUCTION_MANAGER_CARRIES.novice` is **eight**.
   So the whole "carries up to" column of 2.4, and with it the one visible reason to buy a better
   grade, is unreachable by any sequence of clicks in this game: a novice already carries
   everybody a shop can hire. The grades still differ in the other two columns, the order they
   assign in and the pace, and those work.
   Section 3's scenario **(nn), "nine men and a novice: the ninth waits every day until the
   manager is experienced", is therefore not playable**, and it is not faked. What
   `tests/scenarios/turn23.test.ts` plays instead is the fullest set of books the game allows,
   eight through the game's own `HIRE` and its interviews: three joiners, the novice, four office
   admins, the ninth refused with `No locker for him: the canteen holds eight`, all seven carried
   and nobody waiting. It asserts `CANTEEN_LOCKERS - 1 <= PRODUCTION_MANAGER_CARRIES.novice`, so
   it goes red the day the bigger canteen of section 8 lands and (nn) becomes writable. The unit
   test of the rule itself, `tests/engine/managerGrades.test.ts`, writes a ninth joiner into the
   state, says so in its own comment, and proves the ninth waits and the eighth does not.
   **Piotr has to rule on which cap is real**: a bigger canteen, or a manager's numbers that start
   below eight.
2. **The manager's pace was reaching the night shift and not the day shift, and the Efficiency
   sheet was saying otherwise.** The scenarios found it. `managerPaceFor` was read by `hands` in
   `src/engine/production.ts`, which is the **night** shift's hands, reached through `workMinute`.
   The day's own minute is `runProductionMinute` in `src/engine/game.ts`, whose `handsAtWork`
   pushed `rate: worker.rate * staffFactor` with no manager in it. So a shop that bought a
   production manager got his pace on its second shift alone while the Output sheet printed
   `Manager: +3%` over a day crew that was not getting it. Fixed by the lead in `87f5afd`: one
   line and one import, and nothing is multiplied twice, because the sheet's Manager line is a
   man's line and not a hall line, exactly as its own comment says.
3. **Three per cent on the minute is not three per cent on the month, and the hall is what decides
   it.** With the fix in, every one of scenario (mm)'s 14,400 hand minutes carries the novice's
   1.03 and the day's rates add up to exactly three per cent more than (ll)'s, measured. The
   month's work rises by **0.10 per cent**: 4,091.97 without him, 4,096.14 with him. The hall
   gives it back as dust. That hall is three saws and one used fan with no helper behind it, so it
   runs at a hall factor around 0.75 and spends four minutes in five under the extraction's
   margin, and three per cent more work in it is three per cent more dust; the faster month spends
   129 more of its 14,094 minutes in the worse band. It is not a fixed exchange either: **the same
   ten days on the same hall with a standard fan in place of the used one come to 4,162.46 without
   the manager and 4,333.42 with him, which is 4.11 per cent**, because that hall lands on the
   good side of the band more often. A shop whose extraction keeps up banks the three points and a
   little of the swing; a shop already over its margin hands them straight back. The arithmetic is
   written into `tests/scenarios/turn23.test.ts`. It is the game being honest and not a defect,
   and Piotr should know that the flat figure on the hire card is a promise about a minute and
   never about a month.
4. **2.12's floor of ten thousand rewrites the three month playthrough, and that is Piotr's to
   rule on.** The scripted run of the Turn 10 brief 10.4 borrowed twenty five thousand on day 8
   and can now borrow ten. Fifteen thousand less capital: month 1 still closes in the black at
   6,550, **month 2 closes at -5,018 where it closed in the black, month 3 at -15,847, the
   production manager of that run is never affordable at all** and so the holiday that wants him
   to cover is never taken, the contract term makes thirteen of its seventeen weeks and the
   client's renegotiation at the end of it is never reached, and the bank pulls the overdraft on
   the morning of day 91. The run is written down as it plays and nothing was tuned to make it
   read better. The obvious way out was measured and does not exist: the rule allows free early
   repayment, but three months of that company's sales never lift a quarter of them above the
   floor it already has, so a redraw never fires. What Piotr decides is whether ten thousand is
   the right floor or whether that script should buy a cheaper saw and fan to live inside it.
5. **The manager does not carry himself.** 2.4 says "the men on the books, the owner not counted".
   It does not say whether the manager is one of them. He is not: otherwise a novice with eight
   men would be carrying seven of them and the eighth would wait, which is not what "carries up to
   8 men" says to a player reading the card. It is the reading that makes item 1 sharper rather
   than softer, and it is in the code with its reason.
6. **The floor limit bites long before the canteen does.** A 200 m2 unit at `M2_PER_PERSON` 24 is
   eight people counting the owner on a bare floor, less whatever the benches, cabinets and
   machines stand on. Measured on a working hall with a crew's kit down, the gate refused the
   **fifth** joiner with `Crew 5 / 5, floor limited`; on a lighter hall it refused the sixth. So
   2.10's eight is reached only through roles that are not floor limited, which is what the
   scenario and the picture do. Today it is the floor and not the canteen that stops a player
   hiring his sixth joiner.
7. **2.7's "or on one that is short" is built as "no compressor, or one that will not give the six
   bar".** A used compressor gives 150 l/min of which 127.5 may be drawn; one man sanding draws
   200 and one at a bench 30, which is 138 through the diversity factor, so a used compressor is
   short the moment two men work. Read literally, the day one hall finishes nothing at all: the
   scripted short handed month delivers no job in thirty days and ends 2,499 further into the
   overdraft, measured. 2.7's own acceptance test says "a used compressor bought: work resumes the
   next minute", and its hover line is `no compressor`, which would be a lie over a man with a
   compressor beside him. A compressor that is merely short of litres keeps rule 2 of the Turn 10
   brief 3.2 at 0.7. One line in `benchHasAir` reverses it if Piotr wants the harder reading.
8. **2.8's "the extraction" is built as the extractors.** The central and flexi systems sell
   themselves on "no more bags and no breakdown", and everything on the serviceable list is rolled
   for a breakdown once past its service. Every concrete sentence of 2.8 names the extractor.
   Widening it is one line in `isServiced`.
9. **`Manager: +5%` is drawn `Manager · +0.05`.** The Output sheet prints points, not percents, and
   every line on it is points, so the manager's line reads in the same hand as the rest of the
   sheet. The hire card does print the brief's own words, `Assigns up to 12 men, soonest deadline
   first, +5% pace`. Both figures exist, in two hands, and changing the sheet's one convention for
   one line is the sort of thing section 1's "one game, one look" is against.
10. **`Service it` is the hall's chip and `Service` is the card's button.** 2.8 asks for
    `Service it` on the card. The card has said `Service` over every machine since Turn 15 and the
    chip under the hall has said `Service it`; picture 8 carries both in one frame so the pair can
    be judged together. Changing the card's word for the extractor alone would be two words for
    one thing, and changing it everywhere is a screen this brief does not name.
11. **The mark still sits about 35 screen pixels over the head at the fit, and not 6.** This is
    REPORT-T22 item 15 unchanged: `BUBBLE_HEAD_GAP` is 6 and it is 6, over `characterTop`, which
    is the top of the delivered sheet's cell and not the crown of the drawn man. The gap scales
    with the camera, so the closer the player zooms the further the disc floats from the head;
    picture 1 is therefore shot at the fit, where it sits over him. **It is still the first thing
    to settle about the mark**, and it is now the thing standing between a player and reading
    picture 1 at a glance.
12. **The second man at a two place bench is drawn off the end of it.** 2.17 puts two or three men
    at one bench and `benchPlaceAt` gives each his own place, but `second:<bench>` resolves to a
    cell diagonally off the bench's top: measured, a bench at 8,6 two wide puts the first man at
    8,7 and the second at 9,5. At the fit he reads as standing past the end of the bench. Picture
    17 is therefore shot in a hall with one bench and two men so the pair cannot be misread. The
    figure that would fix it is a placement figure with no mockup behind it, which section 1
    forbids inventing.
13. **The canteen's eight plates are lettered bank by bank.** The fifth name lands on the top row
    of the right hand bank rather than continuing the bottom row of the left. It is copied figure
    for figure from `docs/mockups/t23/canteen-regions.json` and is the art side's own ordering, so
    it is not a bug, but Piotr should see it once. The right hand bank's two plates also sit a few
    pixels high of the painted label strips, which is the perspective pass B3's note already
    parks.
14. **`grep -rn "staffManagement" src tests` is not empty, and cannot be.** Section 7 asks for
    nothing, but section 4 requires the lift to drop `state.tasks` entries of that kind, so the
    string survives in `src/engine/migrate.ts`, in the migration test that proves the lift works,
    and in the rewritten daily list test that asserts the kind never appears. Three hits, all of
    them the migration or its proof, which is the same carve out 2.5 and 2.11 grant in their own
    words.
15. **`'drill'` survives in the sound.** `src/ui/sound.ts` and `src/render/hall.ts` carry a one
    shot cue named `drill`, which is the noise of screws going in at a bench during fitting and
    not the tool 2.5 deletes. Section 6 says no sound and a man still drives screws, so both were
    left alone. `grep -rn "'drill'" src` shows those two files and the migration.
16. **`'drill'` was struck from eight `requiredEquipment` lists.** A product that requires a
    machine the game no longer sells could never start. `Needs table saw, cordless drill` reads
    `Needs table saw`.
17. **The `assign` day category is deleted with the chore it measured.** The owner's day meter
    prints every category whether or not it has minutes, so 2.2's "its line on both day meters"
    goes only if the band goes with it. There is no `.seg-assign` rule in the stylesheet, so
    nothing moved there.
18. **`Worker.accidents` is one field beyond section 4's list.** 2.13 asks the card to print a
    man's accidents and nothing in the state counted them. A new field was added rather than a
    nought printed at the player.
19. **A lifted hand tool set really loses its cell; one bought tonight still gets a nominal
    anchor.** Section 4 says a set loses `anchorX`/`anchorY`, and `Equipment.anchorX` is a
    required number, so the field could not be made optional without a change section 4 does not
    authorise. Nothing reads a non hall item's anchor and `hallItems` rejects both readings, so
    they land in the same place. The set holds no hall cell because its zone is nought by nought,
    which is this game's existing one code path for a thing kept in a cabinet.
20. **The scenario manager is hired at the best grade the script has earned, which is a novice.**
    `TIER_MIN_REPUTATION.experienced` is 15 where the manager's old gate was 10, so naming the
    experienced grade left the scripted company with no manager at all. The script takes what
    `hiringOptions` says it has earned. A thousand a month less in wages moved four of the
    playthrough's figures, all measured and written into the test's own comment.
21. **`weekEfficiency` in `src/engine/staff.ts` is dead in `src`.** Its one reader was the
    accountant's week line of Turn 17, which 2.13 deletes. The function, its export and its engine
    tests are left alone: 2.13 removes the lines, not the week meters, and deleting an engine
    selector is outside this brief. Piotr may park it or spend it.
22. **The branch is the session's own and not the brief's.** Section 5 says "Branch
    turn-23-when-the-boss-says-so from main". The session's standing instruction names
    `claude/busy-archimedes-fznv89` and forbids any other, so that is the branch, as Turns 18 to
    22 each recorded of their own.
23. **The three phase B worktrees were made off `cd51383` and not off the phase A commit.** All
    three agents noticed it before writing a line, found `cd51383` to be an ancestor of `cbc6403`,
    moved their own branch forward on a clean tree and measured the phase A baseline before
    starting. Nothing was lost and nothing was pulled, pushed or merged by them. It is recorded
    because it is the sort of thing that is silently wrong the one time nobody looks.
24. **`public/sprites/drill.png` and `handToolSet.png` did not exist in this tree.** Section 3
    asks for them to be deleted and the manifest regenerated. There was nothing to delete: neither
    file is in `public/sprites` and neither key is in `public/sprites/manifest.json`.
    `npm run sprites:manifest` was run anyway and the manifest did not change.

## The tasks

**T23-A1 Housekeeping and v36, `a914677`.** `docs/turn-22-brief.md` is `git show 8fecd36:CLAUDE.md`
byte for byte, 27,410 bytes, off the Turn 22 merge commit, with `diff` silent. The README's brief
list, its report range and its art request list carry Turn 22 and Turn 23, and its ten minute walk
through drops the cordless drill from the day one order and the hand tools from the day two van,
because Turn 23 takes both off the hall. `APP_VERSION` v35 to v36 with the two tests that name it.
`docs/art/REQUESTS-T23.md` asks the art side for **nothing**: section 9 has no pack in it, because
the canteen's five layers landed on 20.09. The page records what landed, the two pictures this turn
deletes and nobody is to redraw, and the backlog earlier turns are still owed.

**T23-A2 Phase A, `cbc6403`.** Section 3's list in one commit: `STATE_VERSION` 20 with
`liftToVersion20` (the empty `monthlyReports`, the saved manager made experienced, every drill and
seat off the books with one ledger line each, the hand tool set's cell gone, the staff management
chore off the list); the manager's four tiered specs through `tieredSpecs` with an optional wage
table and his four constant tables; the deletion of `staffManagement` and its `assign` day band, of
the drill from the catalogue, the ladders and eight product specs, of the canteen seat from the
catalogue, the welfare kit and the joiner's prerequisites; the hand tool set given a nought zone so
it holds no hall cell; and the canteen's rectangles and text sizes copied from the art side's JSON,
every figure of which the lead checked against `docs/mockups/t23/canteen-regions.json` and matches.
Items 16, 17 and 20 above are the three things it did that the brief does not spell out.

**T23-B1a and T23-B1b 2.1, `14452b6`.** `autoAssignJobs` runs only for the men a manager on duty
carries; without one a free man waits at his own bench with the red mark and `waiting for the
boss`, his minutes on his own day meter under that reason, and the Work Plan's new crew column
calls him `needs a job`. A man carries yesterday's job on without a click and stays on a job to its
end. The boss's click costs nobody a minute. B1b has no commit of its own because phase A left
nothing of `staffManagement` in the UI, and an empty commit would have been a lie.

**T23-B1c 2.3, `3a766a3`.** The owner takes the oldest open job with nobody on it, as lead, the
minute his office queue is empty and he is on the hall side of the door; he never joins a job
somebody else is on by day and never takes a contract. `nothingAssigned` would have become
unreachable, because it was read off `oldestReadyJob` and the owner now takes every open ready job
within the minute, so it reads a new `workIsAbout` that counts `inProduction` too.

**T23-B1d 2.4, `99694d7`.** Who he carries, in hire order, up to his grade's number; the four
orders of assigning, from the oldest open job to the master's hourly re plan; and his pace on the
minutes of the men he carries, with `Manager` on the Output sheet. The master's two gaps are
`MANAGER_AHEAD_DAYS` and `MANAGER_BEHIND_DAYS`, both one working day, read off the work plan's own
axis so he uses the projection the player is looking at.

**T23-B1e 2.13, `52e4e67`.** One function draws the tile and the card: portrait, name in the title
hand, role and grade chips, the `now:` line red when he is waiting, the day bar off the Turn 21
meter with its three figures, the wage, and one button. Our team is a column of those tiles with
the owner first, the accountant's lines gone. A click on a figure on the hall opens his card where
it opened a bare list, and the list is behind the card's Assign.

**T23-B2a 2.5 and T23-B2b 2.6, `1925094` and `fe52c13`.** Phase A had left nothing of the drill on
a screen, which is what B2a records. The hand tool set is bought, holds a cabinet slot and is not a
thing on the hall: no cell, no slot, no placeholder, and a click on its Owned line opens nothing.
The cabinet's card keeps its slots line and the hiring gate is unchanged.

**T23-B2c 2.7, `f66374b`.** A man at a bench with no compressor in the hall stands at it with the
red mark and `no compressor`, and his minute is a lost one. Item 7 is the reading of "or on one
that is short" and why.

**T23-B2d 2.8, `a2c2691`.** An extractor books an hour for every hour the extraction runs and is
serviced on those hours exactly as a machine is: the same due point, the Machines page, the card,
the call in and the working day out. `Repaired, never serviced` is gone from the game.

**T23-B2e 2.12, `cc7f961`.** `loanLimit(state)` is a quarter of the invoiced sales of the rolling
twelve calendar months, never less than ten thousand and with no upper cap; the refusal and the
finance card both read it and both say where the figure comes from. Item 4 is what it does to the
three month playthrough.

**T23-B2f 2.14, `268beaf`.** Every month end appends its figures to `state.monthlyReports` as data,
and Accounting's Ledger tab is `Monthly reports`: the months newest first, a click opening that
month's card through the one function that draws it at the month end. The ledger stays in the
engine and loses its screen. The tip line is parked, as the brief parks it.

**T23-B2g 2.15, `631a4c2`.** The gate's line sits in the specification block of v35 above its
button, in the `good` token, and reads the bonus and the machine's own demand rather than typing
either.

**T23-B2h 2.16, `03bb14e`.** One `sheetPriceFor(sheets)` ladder of eight bands read by the take off
and by the restock alike, and the Materials tab prices the typed number before the click.
`SHEET_VALUE` stays 200.

**T23-B2i 2.17, `9a74ead`.** A bench class holds one, two or three men at their own jobs at that
bench's pace, the pace re tuned to top out at +10%, and the hiring gate asks for a free place at a
bench rather than a bench. `No place at a bench` is the refusal when a place is the only thing the
hall is short of.

**T23-B3a 2.9, `870bb47`.** The canteen block opens a full screen room on the office's own canvas
and the office's own machinery: `src/render/room.ts` is new and holds everything both rooms do,
`src/render/office.ts` keeps the office and re-exports every name its callers already used, and
`src/render/canteen.ts` is the canteen's four layers, its lit bank, its four regions and its two
live texts. The shared machinery learned two things: a lit overlay names the layer it is painted
over, and the placeholder class cycles so a fourth layer gets a colour that exists.

**T23-B3b 2.10, `b227ae6`.** `CANTEEN_LOCKERS` is `CANTEEN_PLATES.length`, read by the room, the
catalogue and the gate and typed nowhere else. The ninth locker greys with `The canteen has eight
lockers` and the ninth man is refused with `No locker for him: the canteen holds eight`, whatever
his trade. The owner needs none.

**T23-B3c 2.11, `f6c2015`.** What phase A left of the canteen seat on a screen and in the words:
the catalogue, the Owned tab, the hall and the hiring gate's own sentence, which now says a man
needs a bench, a locker and a set of tools.

**The three merges, `3991e48`, `9cb563e`, `227c9b1`.** B1 merged clean. B2 brought three conflicts
and one seam, all four resolved in the merge commit and none papered over: the two new `BubbleKey`
values at one line of one union; the table's own test, which said five keys where there are six;
the short handed month's lowest running balance, which both groups moved independently and which
is **-639** on the merged tree and neither group's figure; and `freeBenches`, which after 2.17
means "places nobody on the books has" and which the Turn 4 rule that stands a joiner at the
canteen door still read as "is there a bench free for this man". Until 2.1 no free man ever reached
that line, because he had always been given a job; with both changes in, a joiner with a bench of
his own was stood at the canteen door. The rule now asks `benchOf(state, worker.id) === null`,
which is the question `hasBenchFor` asks a line above it. B3 brought one conflict, an import line.

**T23-C1 The notes, `8bd593c`.** The four comments that still called the welfare kit "a seat and a
locker" say what is there, and `src/render/hall.ts` stopped calling the canteen block the way to
the canteen's own note now that the block opens a room. `.team-row`, `.team-when` and `.team-week`
are deleted from the stylesheet with a comment in their place saying where the rows they dressed
went.

**T23-C2 The scenarios, `d66a033` and `87f5afd`.** The harness was already on the boss's click:
`assignFreeMen` runs before the clock runs a minute of any day, `grep` finds no scenario writing
`jobId` or `assignees` itself, and every turn file assigns through explicit `ASSIGN_JOB` clicks.
`tests/scenarios/turn23.test.ts` plays (ll), (mm), (nn) as item 1 allows it to be played, and (oo).
The thirty day figures are restated for this build. The amendment is item 2: the scenarios found
that the manager's pace never reached the day shift, and the lead fixed it and rewrote (mm) to the
arithmetic of item 3.

**T23-C3 The cross check, `1da1733`.** Section 7's ten grep and assert lines all answer, and four
of the six things the pictures found are fixed here because the brief had already settled them: a
man waiting for the boss stands at his own bench and not at the canteen door, which is 2.1's own
"at his home cell"; the Work Plan's crew column is a column, which it was not, and ran off the
right edge of the modal with nine men; `needs a job` is red on the board skin, where
`.modal-board .row-figure` beat `.warn` on specificity exactly as it once beat the green and the
red; and a hall with no compressor is no longer told to turn something off. The ninth man's day
meter is asserted as section 7 asks, a working day less the dinner hour, 420 minutes of 480.
`tests/render/bubbles.test.ts` had its three deep queue at the canteen door, where three men with
nothing to do used to meet and no longer do, so it builds the queue where marks still meet and
reads the offsets off the hall's own cells.

**T23-C4 Look and shoot, `1235beb` and `3ec1988`.** Seventeen pictures into `docs/report-t23/`,
every one the real app in headless Chromium at 1280 by 800 at one device pixel, in front of a save
the game's own writer produced and its own Continue button opened, driven by real clicks with the
clock stopped by the game's own pause; every one asserts in the script that the words it is named
for are on the page before it is saved, and every one logs the speed knob, which reads `Pause` on
all seventeen. The staging script is not committed, as Turns 21 and 22 did not commit theirs. Three
were re-shot after T23-C3 moved what they show.

## The seventeen pictures

The third column is the nearest existing picture of the same screen, and the one thing each pair
differs by is what this turn did to it.

| picture | what it shows | beside |
| --- | --- | --- |
| `01-a-man-waiting-for-the-boss.png` | Pete standing at his own bench in the middle of the hall with the red mark over him and the paper reading `waiting for the boss`, while Kev and Ravi work | `report-t22/05-the-hover-line-over-a-mark.png`: the same hall and the same paper over a mark; the words there are `waiting for the saw`, a man queueing at a machine, and here `waiting for the boss`, a man nobody has put on anything. How high the disc sits over him is item 11 |
| `02-the-work-plan-crew-column.png` | the Jobs tab with the crew block at its head, read down: Pete `needs a job` in red, Kev and Ravi `on Garage shelves` | `report-t15/03-work-plan.jpg`: a crew block at the head of the tab that did not exist; the job rows and their Assign chips are unchanged |
| `03-the-owner-at-a-bench-with-an-empty-office.png` | the owner's own card over the hall, `now: Garage shelves (assembly)`, `on: Garage shelves (assembly, 60% done)`, one button `Office` and no `Let go`, with the day meter behind it reading `at the bench` | `report-t19/03-owner-at-his-desk.png`: then an owner with an empty office sat at his desk; now he takes the oldest open job himself, and a click on him opens a card where it opened nothing |
| `04-the-four-manager-hire-cards.png` | the Management tab with four production manager cards, each printing its own duties line from `Assigns up to 8 men, oldest open job first, +3% pace` to `25 men ... +10% pace`, its wage and its standing | `report-t13/28-team-management.jpg`: one production manager card then, four grades now, each with the three figures in words |
| `05-the-manager-on-the-output-sheet.png` | the company board's Output sheet with `Manager · the minutes of the men he carries · +0.05` under the second rule | `report-t17/06-company-board.jpg`: one new line under "Act where they are", and nothing above the rule moved. It says points and not per cent, which is item 9 |
| `06-a-ninth-man-waiting-under-a-novice.png` | the Team page's Workshop tab: nine joiners, eight `on Garage shelves` and the ninth `needs a job`, under a novice who carries eight | `report-t13/25-laptop-team.jpg`: the crew list says what each man is on, and the man past the manager's number says `needs a job`. The state behind it is written and not played, which is item 1 |
| `07-a-bench-with-no-compressor.png` | the man at the bench with the mark reading `no compressor`, and the hall chip `No air: the benches stand still` | `report-t22/04-a-red-mark-and-a-working-man-with-none.png`: a new mark key, and a bench that stands still instead of screwing the carcass together by hand |
| `08-the-extractors-card-with-its-service.png` | the industrial extractor's card, `3000 h of 10000 h`, `service due now`, a `Service` button, and behind it the chips `The extractor is due a service` and `Service it` | `report-t15/05-machine-card.jpg`: a fan's card now carries hours, a due point and a button, where until tonight only machines did and the fan said `Repaired, never serviced`. The two words are item 10 |
| `09-the-canteen-room-with-the-names-on-the-plates.png` | the canteen room, all five photographic layers, five names lettered on the door plates and `5 of 8 lockers in use` on the counter, with the lockers region lit and its label pill | `report-t13/05-office.jpg`: a second full screen room on the same canvas and the same machinery, and the game letters live text over the art, eight plates and a counter, where the office only draws its clock |
| `10-the-hall-with-no-drill-and-no-hand-tool-set.png` | the whole hall at the fit: eleven things standing on the floor, and no drill and no hand tool set anywhere | `report-t17/05-two-men-bench.jpg`: that hall draws a `Cordless drill` box and three `Hand tool set for a worker` boxes on the floor; this one draws neither, and the sets live in the cabinet |
| `11-the-catalogues-greyed-ninth-locker.png` | the Storage tab's Lockers folder, `Owned x 8`, the line `The canteen has eight lockers` and a greyed `Buy another` | `report-t15/04-catalogue.jpg`: a family that can be bought again is refused with a reason of its own, which the catalogue had no case for |
| `12-the-hire-card-with-no-locker-for-him.png` | the Office tab with eight on the books and `No locker for him: the canteen holds eight` on the office admin, the purchasing clerk and the draftsman at once | `report-t20/07-hire-card-tiers-and-the-locked-master.png`: the refusal there is a standing the company has not earned; here it is the canteen's eight compartments, and it fires on every trade at once |
| `13-our-team-as-tiles.png` | Our team as a column of tiles, the owner first with `Office`, Pete with the red `now: waiting for the boss`, his day bar, his three figures, his wage and `Assign` | `report-t21/08-our-team-monthly-pay.png`: rows with the accountant's two lines become tiles with a portrait, chips, a day bar and one button, and `efficiency 0%` is gone from the game |
| `14-a-persons-card-opened-from-the-hall.png` | Pete's card opened by a click on him on the hall: portrait, `joiner` and `no experience x0.60` chips, started and wage, the red `now:`, the day bar, this week and last week, days off and accidents, `Assign` and `Let go` | `report-t19/05-assign-list-open.png`: a click on a man used to open a bare list of jobs; it opens his card now, and the list is behind the card's Assign |
| `15-accountings-monthly-reports.png` | Accounting's `Monthly reports` tab listing April and March with their three figures, and March's month end card open over it | `report-t13/18-accounting-ledger.jpg`: the Ledger tab and its line by line list are gone, a list of closed months stands in its place, and a click opens that month's own card |
| `16-the-materials-tab-at-sixty-sheets.png` | the stock page with `60` typed, the line `60 sheets at £170 = £10,200` and the button `Restock: 60 sheets, £10,200` | `report-t13/23-laptop-materials.jpg`: the typed number is priced before the click, off the eight band ladder, where there were two prices and no line |
| `17-two-men-at-one-standard-bench.png` | one standard bench with two joiners at it on two different jobs, and the owner with nowhere to stand at the canteen door | `report-t17/05-two-men-bench.jpg`: then two men at one bench were two men on the **same** job standing at the lead's bench; here they are on two different jobs and the bench holds them because its class holds two. Where the second man is drawn is item 12 |

## The figures chosen tonight

Every figure in this turn that a person did not give, with where it is and why it is that number.
Piotr's own figures are marked as his in the code and are not in this list: the four carry numbers,
the four paces, the four wages, the eight band sheet ladder, the five bench place counts and their
paces, the quarter and the twelve months of the loan, the ten thousand floor, the eight lockers,
and every rectangle and text size of the canteen, which are the art side's own measurements.

- **[TUNE] `MANAGER_AHEAD_DAYS` 1 and `MANAGER_BEHIND_DAYS` 1.** Working days of slack a job must
  be projected to have before the master takes a man off it, and working days past its deadline
  another must be projected to land before he puts that man on it. One day is the case 2.4's own
  acceptance test names, and a whole day is what stops him swapping a man every hour over a
  projection that moved by a minute. Both are read off the work plan's own axis, so he uses the
  projection the player is looking at and no second one of his own.
- **[TUNE] `MANAGER_REPLAN_MINUTES` 60**, which is Piotr's "at every hour he re plans" written as a
  figure.
- **The words of three lines.** `NO_AIR_LINE` is `No air: the benches stand still`, because the old
  line said the old rule; the fifth owner idle reason is `No air at the bench`; and a machine that
  has never been serviced says `It is not serviced` where it said `It is repaired, never serviced`,
  which 2.8 deletes.
- **[TUNE] The opening account and the crew of scenarios (ll) and (mm).** Three men, a saw apiece
  so nobody queues, 120 sheets and an account of 200,000 written once, because three men, their kit
  and 120 sheets are more than a very easy opening balance carries and a company closed by the bank
  halfway through would be measuring the overdraft and not the crew. Everything else in those
  months is bought, hired and worked through the game's own actions.
- **B3 chose no figure at all.** Every figure the canteen draws by is phase A's, copied from the
  art side's JSON, and `CANTEEN_LOCKERS` is the length of the plate table.

## The cross check of section 7

Run on this tree, every line with the command or the test that answered it.

- **`grep -rn "staffManagement" src tests`**: three hits, `src/engine/migrate.ts:564` where the
  lift strips the kind, `tests/engine/tasks.test.ts:131` which asserts the kind is gone by naming
  it, and the v19 save fixture in `tests/cloud/migrate.test.ts:712`. Nothing in the UI, the task
  list, the day meters or the team page. This is item 14.
- **`grep -rn "'drill'\|canteenSeat" src`**: `canteenSeat` is `src/engine/migrate.ts` alone, twice
  in the historical v15 lift and once in the new one. `'drill'` is the migration and the two sound
  files of item 15. **`ls public/sprites | grep -c "drill\|handToolSet"`**: `0`.
- **A free man, an open job, no manager, a full day: zero production minutes; the boss's click:
  production the next minute**: `tests/engine/waitsForTheBoss.test.ts`, `leaves a free man with an
  open job in front of him standing all day` and `puts him to work the minute the boss clicks
  Assign`, with `costs nobody a minute: the click is the boss and it is free` beside them.
- **A novice with nine men: the ninth has a full day of idle with `waiting for the boss`**:
  `tests/engine/managerGrades.test.ts`, `books the ninth man a whole working day of waiting for the
  boss, and the eighth none`. The answer is **420 minutes of 480** and not 480, because a man at
  his lunch is not waiting for anybody, and the test says so.
- **The owner with an empty office and an open job: on it within a minute**:
  `tests/engine/ownerTakesAJob.test.ts`, `puts him on the oldest open job within a minute`, with
  `takes him off the bench when a chore of his own appears` and `reads officeEmpty with no work on
  the books` beside it.
- **A bench with no compressor: no bench minutes**: `tests/engine/lacquerAirRotate.test.ts`,
  `works no assembly at all in a hall with no compressor at all`, with `runs it at 1.0 the moment a
  budget compressor is in the hall` for the other side of it, and scenario (oo) for a played week.
- **A fan that ran three weeks: hours booked and a service due**:
  `tests/engine/machineHours.test.ts`, `are the minutes the extraction ran, and nought on a fan in
  a hall standing still` and `books an hour of its own for every hour the extraction runs`, with
  `tests/engine/serviceRule.test.ts`, `takes the call on the extraction, which is serviced like the
  machines it serves`.
- **Nine lockers: the ninth refused; nine men: the ninth refused**:
  `tests/engine/eightLockers.test.ts`, `is the ninth and not the eighth: eight go in without a
  word`, `is refused with the canteen as the reason, and the eighth is taken on`, and `is the ninth
  whatever his trade, because every man on the books keeps his things there`.
- **No sales: the bank lends 10,000; 120,000 of sales in twelve months: 30,000**:
  `tests/engine/finance.test.ts`, `lends a quarter of the last twelve months of sales, and never
  less than the floor` (`loanLimit(empty)` is `LOAN_FLOOR`, `loanLimit(trading)` is 30,000,
  `loanLimit(big)` is 250,000, so there is no upper cap) and `forgets a sale the thirteenth month
  back, and counts one twelve months old`.
- **Ten sheets at 190 and a thousand at 120**: `tests/engine/materials.test.ts` asserts every one
  of the eight bands and both edges of each, 1 and 9 at 200 through 1,000 and 5,000 at 120. **A
  third man at a standard bench refused**: `tests/engine/hiringGate.test.ts`, `hires two at a
  standard bench and refuses the third with No place at a bench`.
- **Every scenario green with the boss's click in the harness**: `assignFreeMen` in
  `tests/scenarios/autopilot.ts` runs before the clock runs a minute of any day, so it serves every
  policy that has men, and its comment says what it is for; `grep` finds no scenario writing
  `jobId` or `assignees` itself; every turn file assigns through explicit `ASSIGN_JOB` clicks.
  **The thirty day figures of REPORT-T22 restated**: the short handed month's lowest running
  balance was **-466** before this turn and is **-639.50 on the owner's draw of day 32**, moved by
  2.11's seats (eighty pounds it no longer spends), 2.16's ladder (this script restocks eight at a
  time, which is the top band at 200 a sheet where it paid 175 whatever it bought) and 2.1's boss
  round (the scripted owner clicks once at the start of the day, so a job that comes ready at
  eleven is picked up the next morning). The big saw month's deliveries were written as two in the
  comment and are four; the helper month's sweeps were nineteen and are thirty two; the Easy
  month's 2,829, the Hard month's -7,778 on day 22 with its count at 12, its -5,289 on day 11 and
  its -6,085 on day 15, and the two saw month's 3,246 ahead of the one saw month were all
  remeasured and are all still exact. The playthrough's four figures moved with item 20.
- **`git diff main --stat -- src/ui/styles.css`**: 147 insertions against 18 deletions, and **no
  new token at all**: no colour, font, radius or shadow value was added. What went in is the person
  tile and card family and the canteen room's two classes; what came out is the three Our team row
  classes of item T23-C1. The two rules T23-C3 added, `.modal-board .warn` and
  `.card[data-plan-crew-column]`, read `var(--bad)` and the flex the family already uses.
- **Every changed screen beside its nearest existing one**: the table above, seventeen pairs, with
  the difference in each named. Six of them differ by something not in the brief and every one of
  those six is an item of section 0: items 9, 10, 11, 12, 13 and, on picture 6, item 1.
- **No em dash and no en dash** anywhere in `src`, `tests`, `docs` outside the archived briefs,
  this report, the README or the art request.
- **The seventeen pictures**: `ls docs/report-t23/` lists seventeen files, numbered 01 to 17 in the
  order section 5 asks for them.

## What was not done tonight

- **Nothing of sections 2.1 to 2.17 is unbuilt**, and nothing on section 6's list was done. No
  sprite file was touched, because the two the brief names do not exist in this tree (item 24).
- **The three things the brief writes that could not be built as written** are items 1, 3 and 7,
  each with the arithmetic that rules it out and what was built instead. Nothing was faked in their
  place, and no test was weakened or deleted to make one of them pass. Scenario (nn) is the one
  section 3 scenario that is not the hall the brief describes, and it says so in its own comment.
- **Nothing parked in section 8 was touched**: no bigger canteen, no owner's holidays, no second
  manager, no weekly summary card, no tip under a monthly report, no contract worked at every
  stage, no extractor backs, nothing in `src/engine/ports.ts`, and none of the three Turn 20
  leftovers Piotr has not ruled on.
- **The Efficiency plate gained no line.** 2.7's reason is on the mark and on the owner's day
  meter; a worker's minute books to `noMachine`, the cause `placeHand` already uses. Section 6 says
  no change to Efficiency.
- **`weekEfficiency` is left dead in `src`** (item 21). `.canteen-kit` and the two welfare colours
  in the stylesheet are not dead and were not touched: the lockers are still drawn on the canteen
  block, as they have been since Turn 17, and only the seat beside them has gone.
- **No sound**, and the hall is silent, because there are no recorded files. The drill cue of item
  15 is untouched.
- **No picture was drawn by an agent**, and the canteen room draws the five delivered layers, so no
  placeholder was needed for it.
