# Report, Turn 22: a bank that means it, pipes that join, a hall you can turn

Woodwork Empire, Turn 22. Built against `CLAUDE.md` of 19.09.2026 (first line "Turn 22").
Branch `claude/turn-22-session-thklml`, off `17903f0`, the tree this turn opened on and the tree
`origin/main` stands on. `APP_VERSION` v31 to v32, `STATE_VERSION` 18 to 19.

`npm run check` on the finished tree, read off its own exit code: **exit 0**, **211 test files,
2,074 tests**, 2,073 of them passed and one the standing todo of Turn 12's blocker, up from 208
files and 2,028 tests at this turn's first green check. Twenty five commits of work, every one of
them with a green check of its own before it. Five sets of hands: the lead for phases A and C,
three agents for the three phase B groups working at the same time in three git worktrees, and one
for the scenarios, with the lead merging the three groups, applying every note they left, and
looking at every picture after it was taken.

`git diff main --stat`: 113 files changed, 7,212 insertions, 2,744 deletions, of which the tests
are 3,380 against 1,338. `src` alone is 1,963 insertions against 1,394 deletions: this turn deleted
almost as much as it wrote, which is what taking a whole rule out of a game looks like.

Two lines a task, in the order of section 5, each with the commit it sits in. The four notes files
stay in `docs/` because they carry the exact old and new text of every change an agent made outside
its own files, which is the record of who wrote what.

## 0. Blockers, and where the session did not follow the brief to the letter

**Nothing stopped the build.** Everything in sections 2.1 to 2.13 is built, tested and
photographed, nothing on the "do not" list of section 6 was done, and every v30 and v31 save loads.
Four figures the brief writes could not be built as written and each is an item below with the
arithmetic that rules it out; nothing was faked in their place.

The items below want Piotr's eye. The first six are decisions the brief left open or that the
arithmetic would not take as written; the rest are consequences of decisions the brief did make.

1. **The brief's own `px` mirror is wrong for a machine that is not square, and the true figure is
   in the code.** 2.8's Mirror clause says "`px` becomes `fileWidth - px`". The hall mirrors a
   picture about its **anchor** (`objectArt` writes
   `transform="translate(anchor.x * 2, 0) scale(-1, 1)"`), and in file pixels the anchor stands at
   `8 + width * 48`, so the reflection of a measured pixel is `2 * (8 + width * 48) - px`.
   `fileWidth - px` is `16 + (width + depth) * 48 - px`, and the two agree only where `width`
   equals `depth`. Worked on the standard saw, which is the one machine this really happens to (3
   by 1, no `.r` file, so a quarter turn is the base picture mirrored): the file is 208 px wide,
   the anchor of the turned footprint is file pixel 56, the true reflection of the measured
   `px 137` is **-25** and the brief's figure is **71**. Ninety six file pixels apart, which is two
   metres of hall, half the length of the saw. So the mirror is done where the mirror happens, in
   `portPointOf` in `src/render/hall.ts`, in screen space, by the same transform the picture is
   drawn with; `mirroredPort` and `portOf`, which phase A had written to the brief's figure and
   which nothing but their own test ever called, are deleted, and `mirroredCell` is what is left of
   them. One rule each: the cell in `src/engine/ports.ts` where the engine routes by it, the pixel
   in `portPointOf` where the hall defines it.
2. **The cell of a mirrored port is the axis swap and not `width - 1 - x`, and phase A had it
   wrong.** The lead wrote `footprintWidth - 1 - cell.x` into `src/engine/ports.ts` in phase A,
   measured it, found it wrong and handed the numbers to the agent whose section it was. On the
   standard saw turned (3 by 1 becoming 1 by 3, table cell `1,0`) it gave `-1,0`, a metre outside
   the machine, and `portCell` put that saw's drop on the cell to its left. On the standard
   extractor turned it left the cell at `0,1`, under the unit instead of in front of its mouth. The
   rule that is right is the **axis swap**, `{x: cell.y, y: cell.x}`, which is the very reason the
   same sentence of 2.8 swaps `faces` between `+x` and `+y`: a mirror about the vertical screen
   axis exchanges the two world axes. The saw's `1,0` becomes `0,1`, the middle cell of its turned
   footprint; the extractor's `0,1` with a `+y` mouth becomes `1,0` with a `+x` one, and the cell
   and the direction agree. `tests/engine/ports.test.ts` asserts it on both worked examples and, for
   every one of the eighteen lines at orientations 0 and 1, that a machine's cell lands inside its
   own footprint and an extractor's outside it. Nothing is clamped.
3. **Section 7's "two used cabinets and one hand tool set: one free slot" is nought free**, under
   2.12's own sentence in the paragraph above it: "the owner's own set takes a slot too". Two slots
   less one set less the owner is nought, and the two cabinets hold exactly the owner and the one
   man whose set was bought. 2.12 is the contract and it was followed; the arithmetic then matches
   the game since Turn 6, whose hiring gate has always wanted "two cabinets, one for the new man
   and one for the owner". **If Piotr wants his own tools free of the count**, `toolSlotsInUse`
   drops its `+ 1` and `toolSlotsNeeded` has to drop its `+ 1` with it, and the first hire then
   needs one cabinet instead of two.
4. **2.1's own example cannot show what 2.1 does with a small wage bill.** The clause reads "wages
   on the last working day with £200 in the bank and a £10,000 limit leave the account at its true
   figure below the limit". £200 against a £10,000 limit is £10,200 of room, so any bill under
   £10,200 is paid inside the overdraft and Turn 21 would have paid it too: there is nothing to
   show. Piotr's £200 and £10,000 are kept and the crew is sized to a £13,000 bill, which is over
   the room and short of the £15,200 that would close the company the same morning. **Measured: the
   account ends the pay day at -£13,099**, the £200 less £13,000 of wages less £299 of the day's own
   rent, rates, power and owner's draw. Turn 21 would have left it at -£10,000 with £3,099 standing
   beside it as arrears.
5. **"A run of six cells with one corner is one `<path>`" cannot mean one element**, because 2.7
   also says a vertical drop is shaded left to right where a run is shaded top to bottom, and a
   drop shaded across itself cannot share the `d` of a run shaded down itself. What is built is one
   path **geometry** per piece, stroked five times as five `<path>` elements carrying the identical
   `d` with the offsets as `transform`. A run's group holds at most four geometries (the run, the
   drop, the inlet's vertical and the elbow) and not one picture. The test asserts that the set of
   `d` strings of a run has size one and that a tee gives two run geometries.
6. **The corner cell's centre is 6 px off the path, by construction.** The Turn 17 bend's arms
   reach half a cell, which is 12 px each way on this dimetric, and a quadratic's closest approach
   to its control point is a quarter of the sum of its arms. The five straight centres are on the
   path to 0.01 px; the corner is asserted within `PIPE_STROKE`, which is 7 px, with the arithmetic
   written in the test. Tightening it means shortening the arms to 0.29 of a cell, which is not the
   bend the brief asks for.
7. **The Rotate button cannot turn what is already in hand, and never could.** A press on a button
   is a mouse up, and a mouse up anywhere is the drop. So 2.10's "Rotate or R with the item in
   hand turns what is in hand, as today" is R's alone, and the test asserts that behaviour rather
   than pretending otherwise. Everything else of 2.10 is built: `ui.armTurn` is the armed quarter
   turn, Rotate and R with nothing in hand toggle it, the button lights while it is set, and the
   pick up applies it once and clears it instead of overwriting it.
8. **Turn charges nothing for a cabinet, and the brief's hour is a saw's.** 2.13 says Turn "costs
   the hour a move costs". In the code `endSetup` filters the moved list down to `itemIsHeavy` and
   books the hour and the question for those alone: a bench, a rack, a locker, a seat and a tool
   cabinet are simply where they were dropped (T8 3.4, T11 3.9, and
   `tests/engine/lacquerAirRotate.test.ts` asserts it of a bench). A cabinet is not in
   `HEAVY_SPECS`, so turning one from its card is free, and turning a saw from the machine card
   books the hour and asks the question exactly as dragging it would. The card dispatches
   `MOVE_ITEM` and then `END_SETUP`, so `recordMove` and `endSetup` decide the charge and nothing
   was written into `game.ts` to make a second rule. The brief and the code disagree and the code
   won; the test asserts the nothing.
9. **The card of a thing on the hall said "Machine" in its head, and the pictures are what found
   it.** 2.13 asks for "the name and class in the title". The body carried both from the first
   commit and the head carried the word `Machine`, which says nothing at all over a tool cabinet
   and is the first word a player reads on a card he opened by clicking that very cabinet. Fixed in
   T22-C4: the head is the thing's own name and class, `Tool cabinet: Tool wall`, and a family with
   one class says its name once.
10. **`JOINER_PREREQUISITES` named the hand tool set before the cabinet that holds it, and 2.12's
    own gate made that order unbuyable.** B3 built the hiring gate on free slots and left the hand
    tool set's `requires` as a note, because `canBuy` is in a file that was another agent's. When
    the lead applied it, seven tests went red: anything that walks the shortfall in the game's own
    order, the scripted player included, was refused the set it had just been told to buy. The list
    names the cabinet first now, and three tests in `tests/engine/toolCabinet.test.ts` assert the
    refusal as well as the hire.
11. **Rule two of 2.2 is reachable now, and not by a company standing still.** REPORT-T21 item 23
    said the thirty days below the limit could not be reached by playing, because every cost the
    player did not choose became arrears and the account stopped dead on the limit. 2.1 sends those
    costs through the limit and the rule is live. But an **idle** company still never gets there:
    the room below the limit is half the limit again, £5,000 on very easy and £2,500 on hard, and
    the standing costs alone eat it in about twenty days, so rule one fires first. What reaches the
    thirtieth day is a company **trading at or near break even under the limit**, and that is the
    company the engine test and the scenario build.
12. **Three tests in `tests/ui/laptopPages.test.ts` are timing sensitive and are not a defect in
    the game.** They failed twice, both times while a second `npm run check` was running in the
    same container, and pass on their own, in their whole directory, and in three clean full runs.
    They look for a Start button on the laptop's Tasks page that a render has not flushed yet. The
    suite is green; the three are worth making robust in a later turn, and they are named here so
    the next session knows what it is looking at rather than chasing a ghost.
13. **`BubbleTone` is deleted, which is one step past what section 7's grep asks.** The grep names
    `bubble-chore`, `bubble-away` and `bubble-stage`. With the mark drawn only when something is
    wrong there is one tone left, so the type, `Bubble.tone`, the `tone` column of `BUBBLES`,
    `TONE_CLASS`, the `data-tone` attribute and `.bubble-wait` are all gone as well, and the red of
    `.bubble-wait` is folded into `.bubble` itself. A one value type, a one key record column and a
    one value attribute are three ways of restating what 2.5 says once.
14. **A man on a standing contract would have been told he had nothing to do.** With 2.5's `pieces`
    line gone, `onAContract` returned null for a man working his contract and `bubbleFor` fell
    through to `nothingToDo`, a lie over a working man. The "is he on a contract at all" guard
    moved into `bubbleFor`, so such a man carries nothing and only his machine queue can mark him.
    It is one line of behaviour the brief does not mention and it is asserted.
15. **The mark sits about 35 screen pixels over the head at 1x and not 6, exactly as Turn 21's
    bubble did.** `BUBBLE_HEAD_GAP` is 6 and it is 6, in the figure group's own space, over
    `characterTop`, which is the top of the delivered sheet's cell and not the crown of the drawn
    man: the cell is 405 px tall at two steps of zoom and most of it above the head is transparent.
    The camera scales the gap with everything else. Measured in the browser on picture 5: the disc's
    box bottom is 108 px above the figure's own box bottom. Turn 21 recorded the same thing of the
    same anchor and left it; nothing about 2.5 moved it, and moving it means a new figure with no
    mockup behind it, which section 1 forbids. **It is the first thing to settle about the mark.**
16. **The two saw hall gets its third joiner back, and it is the ladder that did it.** REPORT-T21
    item 3 recorded that the wider cabinet cost scenario (b) a man: the hall sat exactly on the
    crew limit's boundary and a cabinet went from one cell to two. With the ladder the day one kit
    buys the cheapest class, which is a metre square again, so the hall holds the owner and three
    joiners once more. Nothing about the crew rule moved.
17. **The hiring card's bill is £820 and not £1,340**, because `missingCost` reads the cheapest way
    into each family and the cheapest cabinet is now the used one at £90 where the only cabinet was
    £350.
18. **A cabinet's card says "running".** `ownedState` has returned `running` as its fallback for
    everything that is not sold, broken or stopped since Turn 7, and the Owned tab has always
    printed it for every rack, locker and seat. 2.13's new card shows it on a cabinet, where it
    reads oddly. Changing it is a change to a screen this brief does not name, so it is left and
    recorded.
19. **One claim of the three month playthrough was split in phase A and handed to the scenarios.**
    The run's contract term ends on day 121 and the Turn 21 arrears rule closed the company on the
    morning of day 120, so the client's answer was never reached. It had been landing on the other
    side of that one day since Turn 21, on luck: any figure at all moves it, and this turn moved
    one, the kinder way (the ports are measured, so that hall's pipe is three metres where it was
    five, ninety pounds it never spends, and every purchase after day 8 falls on a different day).
    Phase A asserted the term and the closing instead of the answer and left the other half to
    T22-C2 with the money final.
20. **`monthlyFixedCosts` has no caller in `src` any more.** Its one caller was
    `arrearsCarryInterest`. It is still exported from the barrel and still correct, and it is left
    because a month's fixed costs are a figure the game will want again.
21. **The `interest` ledger category is written by nothing now**, the arrears interest having been
    its one writer, but its label stays: an old save's ledger carries lines under it and a category
    with no label prints a raw engine key at the player, which section 3 forbids.
22. **The precondition was checked against the branch and against `origin/main`, which agree.** The
    brief says "main carries Turn 21 merged and one chat fix: APP_VERSION 'v31'". Local `main` was
    stale at `a0a7d37`; one fetch put `origin/main` at `17903f0`, which is exactly the tree the
    precondition describes, and the session branch stood on it. Local `main` was moved to
    `origin/main` so that every diff in this report measures this turn alone and not two.
23. **The branch is the session's own and not the brief's.** Section 5 says "Branch
    turn-22-a-bank-that-means-it from main". The session's standing instruction names
    `claude/turn-22-session-thklml` and forbids any other, so that is the branch, as Turns 18 to 21
    each recorded of their own.
24. **Scenario (jj) writes the account down to the limit instead of playing it there, and it is the
    only figure in the turn's scenarios that is written.** Everything else about that hall is
    played: the kit, the man, the sixty sheets, the contract taken off the board on day 3 and the
    pieces it makes every working day. But a company that trades sensibly on Very easy still has
    25,279 in the bank on the morning of day 16, and playing it down to a shade under a 10,000
    overdraft means buying thirty six thousand pounds of things nobody asked for, after which the
    scenario would be measuring the shopping and not the rule. So the cash is set once, a thousand
    pounds under the limit (`UNDER_BY = 1000`, [TUNE]), and every one of the thirty days after it is
    played. The two margins that thousand buys are measured and written into the file: 957 of room
    on the first morning, 350 of the 5,000 between the limit and the floor still unspent on the
    thirtieth. Piotr should know that the rule is proven on a hall whose starting balance a test set,
    and that the ending is thin enough that any figure moving this hall's money by more than about
    50 a day moves which morning it lands on.

## The tasks

**T22-A1 Housekeeping and v32, `acd0210`.** The Turn 21 brief archived byte for byte from the Turn
21 merge commit (`git show 60b6f56:CLAUDE.md`, 18,243 bytes, `diff` silent), the README's two lists
brought up to date, `APP_VERSION` `'v31'` to `'v32'` with its two tests, and
`docs/art/REQUESTS-T22.md` written from section 9.
One baseline red was fixed with it and it was not this turn's doing, exactly as T21-A1 recorded of
its own: `tests/engine/rotate.test.ts` asserted that `toolCabinet.standard.r.png` was the only
turned file in the game, and Piotr's own commit `17903f0` delivered the other four classes' turned
files between the turns. The test now asserts what the loader always promised, for all five
classes. Without it the turn had no green check to build on.

**T22-A2 Phase A, `992d2d8`.** Section 3's list in one commit: `STATE_VERSION` 19 with
`liftToVersion19`; `src/engine/ports.ts` with the eighteen measured lines of 2.8 and the pure
questions asked of them; `portCell` reading the table, so the routing of Turn 13 starts where the
drawing starts; `item.orientation` in place of `item.rotated` on every placed item, every
reservation, every moved item and every signature that carried it, through twelve source files and
eight test files; `DUCT_HEIGHT` 3 to 3.2; the four galvanised greys and `HOSE_COLOUR` in the
constants, with the Turn 16 purple out of the stylesheet; the nine `pipe.*.png` deleted and the
manifest rebuilt to 84 sprites; and `fx-breathe` gated on a measured port.
It also did four things section 3 does not list, each to leave the tree green in one commit, and
each written up in section 0: it carried the rename to the point of compiling; it added an `other`
ledger category for the lift's own line, because there was none and the word `arrears` was going;
it made the lift zero the three arrears fields rather than delete them, which is where B1 took
over; and it split one claim of the three month playthrough (item 19).

**T22-B1a 2.1, `237a58e`.** `chargeUnavoidable` charges the cash in full every time, the limit
included, and the account goes under it; `canAfford` and `pay` still floor everything the player
buys, every caller of each unchanged. The arrears went out whole, and the full list of what went
with them is section 3 of `docs/notes-t22-b1.md`.
`charge` has one branch out of the account now and `pay` asks it with the floor waived, so there is
one place in the game where a pound leaves the bank.

**T22-B1b 2.2, `efbac45`.** `checkBankruptcy` keeps two rules and reads the cash alone, because
from 2.1 the cash is the whole position. Rule two is **played rather than written**: a company
under the limit whose bills come out of the account and whose client pays it what each day cost is
still trading on the twenty ninth morning and closed on the thirtieth, on the days and not on the
amount, with its account a few hundred under a £10,000 limit and nowhere near the -£15,000 the bank
allows. That is REPORT-T21 item 23 answered.
The card says three figures instead of four and the strip carries the brief's own line with the day
off `daysBelowOverdraft`, said from the first day under the limit and not only once the company is
past what the bank allows, because a player who is never told the count cannot act on it.

**T22-B1c 2.3, `4ed4b8d`.** The red box reads the account: `cash - deposit` against
`BANKRUPTCY_LIMIT_FACTOR * overdraftLimit`, and its last sentence is one of two, `at tomorrow's
check` only when rule one would really fire on it and `The bank counts every day below its limit.`
otherwise. Picture 3 is the card on Piotr's own £50,000 job with his £7,000: -£25,000, £0, -50, and
the box ending `Dropping this job closes the company at tomorrow's check.`

**T22-B1d 2.4, `7f0732d`.** The month end card and the Summary tab drop their arrears rows and
nothing else on them moved, asserted in the two render tests.

**T22-B2a 2.5, `5e556ad`.** The bubble of Turn 21 is a 14 px disc with an exclamation in the title
hand, 6 px over the head in the figure group's own space, with the paper bubble's own tail, carried
by the walker and depth sorted as before, and drawn for the four red keys alone. The words come up
on the hover of the figure group, from the same `BUBBLES` table, by one rule of the stylesheet and
no JavaScript, so they read the same at x1 and at x30.
Gone with the green and the dashed grey: `src/render/bubbles.ts` and its three second memory, the
speed gate, the eight non red lines of the table, the bubbles stacked at the doors, and
`BubbleTone` (item 13).

**T22-B2b 2.6, `a4df6bc`.** Turn 21's transfer is reversed: `moveToOtherWork` and the `moved` flag
of `HandPlace` are gone, the man stays with his job at the waiting cell with the red mark, and the
queue at the machine is the queue of Turn 11. Measured on scenario (gg)'s own hall: the hall works
**1,440 minutes of 2,400 where Turn 21 worked 1,920**, three men put in all 480 and the fourth
puts in none, and his 480 minutes are booked to `noMachine`, which is the point.

**T22-B3a 2.7, `481f372`.** A run is one path geometry through the centre of every cell at
`DUCT_HEIGHT`, with the quadratic bend of Turn 17 at every corner, stroked five times darkest
first. Every joint is exact because there is no joint. A branch is its own path drawn over the main
run, and the central system's run along the rear wall is the same path.
Gone with the nine pictures that never met each other: the seven drawn tile kinds and
`PIPE_TILE_KEYS`, `pipeTile`, `PIPE_KINDS`, the per cell sprite lookup, the joint disc, the flange
rings, and the pulsing `portRing` with `PORT_RING` and its stylesheet.

**T22-B3b 2.8, `53d04de`.** `portPointOf` turns a `PORTS` line's `px, py` into a screen point
through the same arithmetic that places the picture, so the point is on the same pixel at any zoom.
A hidden port stops at `py` and the body covers the rest; a visible one stops half a metre above it
and a hose in `HOSE_COLOUR` finishes the job; an extractor's inlet is variant C, the vertical
0.25 m in front of the mouth and an elbow into it.
`connectCheck` refuses a run into a fan whose mouth faces a wall, in the words 2.8 gives it, and the
Sprite check page prints the measured point beside every file that wants one and `no port data` in
red beside every file that has none. The mirror defect of items 1 and 2 was found and fixed here.

**T22-B3c 2.9, `a5c77d7`.** Phase A gated `fx-breathe` on a measured port; this asserts it both
ways round, that an extractor with a line does not breathe and that a unit with none still does.

**T22-B3d 2.10, `38db278`.** `ui.armTurn` is the armed quarter turn, Rotate and R with nothing in
hand toggle it, the button lights while it is set, and the pick up reads the item's own orientation
and applies the armed turn to it once instead of overwriting it. Arm twice and nothing turns.

**T22-B3e 2.11, `b8b6b13`.** Rotate cycles only the orientations that have a picture: 0 and 1
always, because a quarter turn mirrors correctly, and 2 and 3 only where the file exists. The five
tool cabinets are the first items in the game with all four, and the Sprite check page says per
file which of the four are drawn.

**T22-B3f 2.12, `ab129cf`.** `TOOL_CABINET_VARIANTS` and `TOOL_CABINET_SLOTS` are the five classes
and what each holds: 1, 1, 2, 4 and 8, at £90, £175, £350, £700 and £1,400. The footprints and the
heights are the delivered pictures', measured off the PNG headers before they were written down.
`perWorker` is gone from the cabinet: `freeToolSlots` is the one count, and the hiring gate, the
hand tool set's own gate and the card of a cabinet all read it. Two measured consequences are items
16 and 17.

**T22-B3g 2.13, `61d95be`.** A click on a tool cabinet opens its card in the machine card's skin,
with `Holds 4 men's tools · 1 in use` and the two rows `Turn` and `Sell for £350`; the machine card
gains the same two rows, drawn by the one function. What Turn really charges is item 8.

**T22-B1 and T22-B2 notes applied, `6d22a47`.** Six comments in five files that named a rule this
turn reversed, each with the exact text the agent's notes asked for, plus two stale citations.

**Merge T22-B3 and its notes, `80da68a`, `c8a482a`, `b938039`.** One conflict in 2,300 lines of
`src/render/hall.ts`, and it was the two agents meeting: B3 wanted the `Port` type for 2.8 and B2
had deleted `src/render/bubbles.ts` under it. B2 worked the bubble region and B3 the pipe layer,
the sprites and the cards, and nothing else in that file collided. B3's three notes are applied in
`b938039`, with the two things the first of them exposed (items 1, 2 and 10).

**T22-C1 The notes, `6d22a47` and `b938039`.** The queue puts the notes at C1, after phase B; they
were applied the moment each group landed instead, because a note that waits a phase is a note that
rots into the next merge. `6d22a47` is B1's and B2's: six comments in five engine files that named
a rule this turn reversed, each with the exact text the notes asked for, plus two stale citations.
`b938039` is B3's three, and two of the three turned out to be real defects rather than wording
(items 1, 2 and 10), which is why it reaches ten files. C1 itself was therefore a re-read of the
four notes files against the finished tree and not a commit: every ask in the three phase B files
is applied, and C2's file asks for nothing.
The four files stay in `docs/` under their own names. They are the only record of who wrote a line
in a file that was not theirs, and next turn will want them when a comment reads oddly.

**T22-C2 The scenarios, `5f5eb87`, merged in `32c0ccb`.** Four pieces of work: the sixteen months
brought up to the one money track, (gg) re-measured on this tree, and the two new scenarios of the
queue, (jj) and (kk), in a new `tests/scenarios/turn22.test.ts`. Of the sixteen months exactly one
goes under the overdraft limit at all and no month anywhere writes an unpaid line, which is 2.1 seen
from above; the month that goes furthest of the fifteen that stay inside it bottoms out at -466 and
never reaches the limit. (jj) reaches the thirtieth day and is closed on it with 350 of the 5,000
between the limit and the floor still unspent, so the days and not the amount closed it, and the
month of wages on day 30 is one line of -1,950, unpaid false, out of an account already 1,638 under
the limit. (kk) drops Piotr's £50,000 job with his £7,000, trades the whole of that day with the account at
-18,000, which is 3,000 past the floor already, and is closed the next morning once that morning's
own four bills have gone out of it, exactly as the red box promised.
Nothing in `src` was touched and nothing in `src` was found wrong. Two things the agent checked on
purpose, because a scenario would have hidden either: every caller of `pay` in `src` is still behind
a `canAfford` of its own except the two that are on the brief's own forced list, and the only unpaid
ledger line anywhere in the whole file set is (kk)'s written off material, which is a loss with no
cash behind it. The figures it chose are in the section below, and the one written figure is item 24.

**T22-C3 The cross check, the section below.** Every line of section 7 with the command or the test
that answered it, run on this tree. Two of its lines could not be true as written and are items 3
and 5; both are answered with what is true instead.

**T22-C4 Look and shoot, `37974fa`.** Thirteen pictures into `docs/report-t22/`, and the one thing
they showed, which is item 9.

**T22-C5 The report and the PR, this commit.** This file, and a pull request titled
`Turn 22: a bank that means it, pipes that join, a hall you can turn`, not merged, as section 5 says.

## The thirteen pictures

Every one is the real app in headless Chromium at 1280 by 800 at one device pixel, in front of a
save the game's own writer produced and its own Continue button opened, driven by real clicks with
the clock stopped by the game's own pause. The staging script is not committed, as Turn 21's was
not. The third column is the nearest existing picture of the same screen, and the one thing each
pair differs by is what this turn did to it.

| picture | what it shows | beside |
| --- | --- | --- |
| `01-the-warning-line-at-day-12-of-30.png` | the strip under the top bar, word for word: `Account -£18,200 is below the bank's -£10,000 limit: day 12 of 30.`, with the account red in the top bar and the run along the rear wall drawn as one path behind it | `report-t21/01-topbar-owes-and-warning.png`: the `owes` tile and its `bailiff in 2` are gone from the bar, and the arrears line is gone from the strip, which now carries the count instead |
| `02-the-bankruptcy-card-with-three-figures.png` | the card of the drawing: `In the bank -£10,807`, `The bank allowed -£15,000`, `Days below the limit 30 of 30`, under `30 days in a row past the overdraft limit, and the bank has pulled it.` The amount is 4,193 inside what the bank allows, so the days closed it | `report-t21/04-the-bank-has-closed-you.png`: four figures become three, the arrears one gone; the skin, the working days line, the orders and both buttons are untouched |
| `03-the-drop-cards-red-box.png` | the £50,000 job dropped with £7,000 in the bank: `Deposit to return to the client -£25,000`, `You have £7,000 of -£10,000 overdraft`, and the red box `You cannot pay the deposit back from the overdraft. The account goes to -£18,000 against the bank's -£15,000. Dropping this job closes the company at tomorrow's check.` | `report-t21/03-drop-card-closes-you.png`: the same two ends and the same red, with the arrears sentence replaced by the account's own arithmetic and the new last sentence |
| `04-a-red-mark-and-a-working-man-with-none.png` | one disc with an exclamation in it over the man waiting at the saw; the man at the bench working with nothing over him, and Ravi on his way out of the door with nothing either | `report-t21/05-four-bubbles.png`: four bubbles three times this size, one over every man whatever he was doing; now one mark, and only where something is wrong. How high it sits over the head is item 15 |
| `05-the-hover-line-over-a-mark.png` | the pointer on the disc and `waiting for the saw` on paper above it, in the red of the mark. The line is drawn in the scene, so at this man's place in the hall the top of the view cuts it, which is worth a mockup next turn | the same T21 picture: the words that were on all day for every man are now on hover and red only |
| `06-a-run-with-a-corner-and-a-tee.png` | the fan at the right, the elbow into its mouth, the run up to 3.2 m and along the hall through a corner, a branch dropping off it to the machine in the middle and the drop at the far end, every joint a bend and not a butt | `report-t17/10-pipes.jpg` and `report-t13/03-hall-pipes.jpg`: the nine tiles that did not meet, the joint discs, the clips and the purple are all gone, and the run is one drawing |
| `07-the-standard-saw-with-its-hidden-drop.png` | the drop leaving the run, bending down at the saw's measured `px` and ending at its `py`, where the machine's own body covers it | `report-t17/10-pipes.jpg`: the pulsing port ring is gone, the drop lands on the machine's own pixel, and the saw stands still while it runs (2.9) |
| `08-the-standard-extractor-and-the-elbow.png` | variant C on the standard fan: the vertical standing 0.25 m in front of the mouth, the elbow turning out of it and ending in the mouth itself | the same: before tonight a fan's inlet was a ring on a footprint cell and the pipe stopped in the air above it |
| `09-the-used-extractor-with-the-mouth-to-the-right.png` | the same rule with `faces` `+x`: the mouth opens down right, the vertical stands to the right of it and the elbow comes back in from that side | the same, and the pair of them is the proof that the table and not the footprint decides where a pipe lands |
| `10-the-sprite-check-page.png` | `no port data` in red down the thicknesser family, and `0 of 4 orientations drawn: none, the rest mirrored or the base picture` under every file, beside the footprint, the canvas and the file size the page always printed | no picture of this page exists in any earlier report; the page is Turn 12's, and the port line, the red words and the orientation line are tonight's. The red needed no provoking: the thicknessers pull on the extraction, have no line in `PORTS` and no delivered picture, so the page says it of its own accord |
| `11-the-five-cabinets-in-a-row.png` | the five classes standing together on the hall, the two 1 by 1 boxes through the 2 by 1 standard and pro to the 3 by 1 industrial, each off its own picture; the day one cabinet stands with them, so there are two used ones in the row | `report-t21/10-tool-cabinet-two-cells.png`: one cabinet with one rule becomes a ladder of five with five capacities |
| `12-the-standard-cabinet-at-all-four-turns.png` | four standard cabinets side by side at orientations 0, 1, 2 and 3, each drawn from its own file and none of them a mirror | the same T21 picture: two turns become four, and Rotate stops at the turns that have a picture |
| `13-the-cabinets-card.png` | the pro cabinet's card: `Tool cabinet: Tool wall` in the head, the `Pro` and `Owned` chips, `Holds 4 men's tools · 1 in use`, and the rows `Move`, `Turn` and `Sell for £350` | `report-t17/03-machine-card.jpg`: the same skin and the same `Move`, with the two rows 2.13 adds under it. The `running` line under the slots is item 18 |

## The figures chosen tonight

Every figure in this turn that a person did not give, with where it is and why it is that number.
Piotr's own figures are marked as his and are not in this list: the 1.5 factor, the thirty days, the
five capacities, the five prices doubling, `DUCT_HEIGHT` 3.2, the 14 px disc and its 6 px, the
0.25 m in front of the mouth, the eighteen measured port pixels of the extractors and the saws.

- **[TUNE] The four galvanised greys and `HOSE_COLOUR`.** `PIPE_RIM` `#4b5158`, `PIPE_BODY`
  `#8f979e`, `PIPE_SHADE` `#5e666e`, `PIPE_LIGHT` `#d7dde1`, read off the mockup
  `pipes-A-one-path.png`; `HOSE_COLOUR` `#787b80`, the floor's own `#8f9298` a touch darker, which
  is the whole of Piotr's instruction for it.
- **[TUNE] The mark's own small figures** beyond Piotr's 14 px disc and its 6 px over the head: the
  tail 5 px long and 4 px across at its root, the ring 2 px, the exclamation dropped 4 px so it sits
  in the middle of the disc, and `step` 7 px, which is how far the second mark over one cell stands
  aside (the third stands twice as far), as 2.5 gives it.
- **[TUNE] The cycle rule of 2.11**: Rotate stops at the orientations that have a picture, 0 and 1
  always and 2 and 3 only where the file exists, so that no wrong picture can ever stand on the
  hall. It is Claude's rule and the brief marks it as one.
- **[TUNE] The spindle moulders' and the edgebanders' port pixels**, eight of the eighteen lines,
  measured by Claude off the pictures and not yet confirmed by Piotr, exactly as 2.8 says. The five
  extractors' and the five saws' are his.
- **[TUNE] `UNDER_BY = 1000`** in scenario (jj), and the sixty sheets and the one inexperienced
  joiner that hall is built with. The thousand is item 24; the sixty sheets are headroom and not a
  measured minimum (the run eats about twenty of them, and 32 are still on the rack at the close);
  the one joiner is the smallest crew that has a wage bill at all, which is what 2.2's clause wants.
- **[TUNE] The £820 of the hiring card's bill** is not chosen, it is read: `missingCost` sums the
  cheapest way to fill what is missing, and the cheapest cabinet is now £90 (item 17).

## The cross check of section 7

Run on this tree, every line with the command or the test that answered it.

- **`grep -rn "arrears\|bailiff" src`**: ten hits, every one of them in `src/engine/migrate.ts`
  between lines 425 and 487, which is `liftToVersion19` and its comment. Nothing else in `src` says
  either word.
- **`grep -rn "rotated" src`**: seven hits, all in `src/engine/migrate.ts` between lines 415 and 450,
  which is the v19 lift reading the old field and the two older lifts writing it into the JSON they
  hand upwards. No live code carries a boolean turn.
- **`ls public/sprites | grep -c pipe`**: `0`. **`grep -rn "pipe\.ew\|pipe\.ns\|pipeTile" src`**:
  nothing at all.
- **Thirty days under the limit with wages paid through it, closed on the thirtieth morning**:
  `tests/scenarios/turn22.test.ts`, `(jj) ... is closed on the thirtieth morning, on the days and
  never on the amount`, with `... keeps trading under the limit for twenty nine days` beside it for
  the morning before. **A company at the limit that buys nothing and pays wages goes under the limit
  that day**: `tests/engine/economy.test.ts`, `takes a company sitting on the limit under it the same
  day` and `pays the monthly wages in full with 200 in the bank and a 10,000 limit`, with `still
  refuses a machine at the overdraft limit` proving the floor is still there for what he buys.
- **A run of six cells with a corner is one path, and its six centres are on it**:
  `tests/render/pipesOnTheHall.test.ts`, `draws six cells with a corner as one path, and no picture
  anywhere in it` (one shape, five strokes of it, no `<image>`) and `puts the centre of every cell it
  passes on the path, at the ducting's height`. Five of the six centres are on the path to within a
  hundredth of a pixel; the corner cell's is within one stroke width of it, by construction, which is
  item 6 and is the Turn 17 bend doing what a bend does.
- **Every file in `EXTRACTION_DEMAND` with a picture has a `PORTS` line**:
  `tests/engine/ports.test.ts`, `has a line for every delivered picture of a machine that pulls on
  the extraction` and `has a line for every delivered picture of a fan, and none for a central
  system`, with `leaves the two hand edgebanders out, which is the one case a missing line is right`
  for the two the brief excludes.
- **Arm, pick up, drop: the cabinet stands turned**: `tests/ui/rotateHall.test.ts`, `arms the turn,
  lights the button, and stands the next thing picked up at ninety degrees`, with `cancels on a
  second press, which is what a toggle is for` for arming twice and `turns what is in hand on the R
  key, which is the one thing that worked before tonight` for the old path. The button itself cannot
  turn a thing already in hand and never could, which is item 7.
- **Two used cabinets and one hand tool set: the free slots**: `tests/engine/toolCabinet.test.ts`,
  `is short a slot and not a cabinet: two of one slot hold the owner and one man`. The answer is
  **nought free and not one**, under 2.12's own sentence that the owner's set takes a slot too, which
  is item 3. The count itself is `sums the slots of the hall, takes the owner's set off them, and
  fills in order`. **`grep -rn "perWorker" src`**: seven hits, none of them a cabinet. One is
  the comment in the cabinet's own block saying the flag is gone from it; the others are
  `BASE_SPEC`'s `false`, the field on the type, and the four things that really are one a man: the
  workbench, the locker, the canteen seat and the hand tool set.
- **`git diff main --stat -- src/ui/styles.css`**: 80 insertions against 126 deletions, and
  **no new token at all**, not even the six the line allows: the four greys and the hose live in
  `constants.ts` where the drawing reads them, and the mark is drawn with the tokens the paper bubble
  already had. What went out of the stylesheet is the Turn 16 purple, the port ring and its pulse,
  and the bubble rules the mark does not need.
- **Every changed screen beside its nearest existing one**: the table above, thirteen pairs, with the
  difference in each named and none of them outside this brief.
- **No em dash and no en dash** anywhere in `src`, `tests`, the four notes files, this report or the
  art request: `grep -rn` for both characters finds nothing.
- **The thirteen pictures**: `ls docs/report-t22/` lists thirteen files, numbered 01 to 13 in the
  order section 5 asks for them.

## What was not done tonight

- **Nothing of sections 2.1 to 2.13 is unbuilt**, and nothing on section 6's list was done. The nine
  `pipe.*.png` are the only sprite files this turn touched, and it deleted them.
- **The four figures the brief writes that could not be built as written** are items 1, 3, 5 and 6,
  each with the arithmetic that rules it out and what was built instead. Nothing was faked in their
  place, and no test was weakened to make one of them pass.
- **The extractors' `.r`, `.rr` and `.rrr` files** are still art (section 9, `docs/art/REQUESTS-T22.md`).
  Until they land, extractors turn between 0 and 1 like everything else, as section 8 parks it.
- **The mark's height over the head** is about 35 screen pixels at x1 and not 6 (item 15), because
  `characterTop` is the sheet cell's top and always was. Moving it needs a mockup, and section 6
  forbids a visual change without one, so it stands as Turn 21 left it.
- **The three month playthrough's one split claim** stands split (item 19): the company is
  closed on day 120 at -£15,681 and the contract's term ends on day 121, so the run cannot reach the
  client's answer by one day. The script was not tuned to buy that day, because tuning it would be
  measuring the tuning.
- **Nothing parked in section 8 was touched**: no production manager, no weekly summary card, no 3D
  render test, and none of the three Turn 20 leftovers Piotr has not ruled on.
- **No sound**, and the hall is silent, because there are no recorded files.
