# Report, Turn 31: the line's timber and glass, its books, the forklift's lane and its forklift, the hall that grows, the shelter behind the wall, and contracts that can be lost

Woodwork Empire, Turn 31. Built against `CLAUDE.md` of 11.10.2026 (first line "Turn 31").

- **Branch:** `claude/kind-galileo-xxadpc`, off `0d4dd31`, the tree `main` stands on (v91,
  STATE_VERSION 43). The brief names `turn-31-line-books`; the session was given this branch to
  develop and push on, and every task went to it.
- **Versions:** `APP_VERSION` v91 to v92, `STATE_VERSION` 43 to 44, once each (A1 and B1).
- **How it was run:** one writer, serial, no worktrees, one commit a task (and two commits of a second
  reader's findings), the branch pushed after each. `npm run check` was green on its own exit code
  before every commit.
- **Tests at the end:** 2,965 in 307 files, none skipped (2,849 in 297 at A0).
- **Sub-agents:** they built the mockups, mapped the code before each task, reviewed each task's diff,
  cross checked section 7, shot the pictures and wrote the notes and the art requests. None of them
  edited `src/` or `tests/`, committed, or ran the suite.

## 0. What Piotr should read first

**Not reached: nothing.** Every task of section 5, T31-A0 to T31-E5, is done in the brief's order
(C4 straight after C2, as the brief put it), one commit each.

**Red: nothing.** The last full check passed on its own exit code: lint, the build, and 2,965
tests in 307 files. No `.skip`, `.only`, `.todo`, `xit` or `xdescribe` anywhere in the tree, so there is
no skip to list. A0 found the suite green on v91 (2,849 in 297). `tests/ui/app.test.ts`, the real time
test, passed in every check; no sub-agent ran the suite. The first full check of E5 had one test run
out of time, `tests/ui/store.test.ts`'s `writes it at the start of a day, and when a move of the hall
is finished`: its four real waits of the once a second autosave make it about 4.8 s by design, at v91
as tonight (the file took 11.6 s at A0 and at E3), against vitest's 5 s. It passed alone three times
out of three; it is given 15 s with a line of reason, nothing it asserts changed, and the check after
it is green.

**The line's month from the built game.** The line at (2, 14) in the 800 m² unit, its contract taken
at its card, two engineers and an office admin on the books, the office ordering the timber and the
glass; the second calendar month played whole (30 days, 22 of them working days), read off the
line's own day book, which is what the Production line tab reads:

| Windows | Possible | Efficiency | Turnover | Timber and glass | Engineers | Power | Property cover | Net | A year at this pace |
|---|---|---|---|---|---|---|---|---|---|
| 88 | 88 | 100% | 132,000 | 52,800 | 30,000 | 10,800 | 0 (not held) | 38,400 | 460,800 |

- The figures are Turn 30's month to the pound: what changed is when the material is paid. From
  tonight it is paid at the order, 8,000 a batch of timber and 4,000 a batch of glass, and the tab
  counts what the windows used (600 a window), not what was bought.
- With the office ordering at two days left, the line did not lose a minute for want of material
  after its first batches were in (scenario (hhh)). It loses its first morning: the contract is
  taken at a card at the day's open, its first lorry comes the next working morning and is unloaded
  in that morning's first hour.
- `A year at this month's pace` is the month's net over its 30 days times the game's 360. The brief's
  sample, `£461,000`, is this month's 460,800 rounded.

**Contracts that can be lost, from the built game.** Scenario (lll) plays a year (seed 20261012
chosen to show the three) of a 200 m² shop with six joiners, two on each of up to three sheet
contracts, a lost one let go and a term renewed at whatever the client offers: five contracts were
lost to another supplier, each followed by 14 to 21 days with no standing offer, and two of the four
renewals came in lower. At 3 per cent a week's close, three contracts lose about four a year between
them. None of the 34 draws the scenarios pinned before tonight make comes up, so no figure of theirs
moved.

**What chat decided and you have not confirmed (section 10), with what was built:**

1. **The split and the use.** A window's £600 is two boards at `SHEET_VALUE` (400) and its glass (200),
   both written from the constants. The boards and the glass come off when a window is made, which
   books no material: it was paid at its order. A minute without a window's worth is a minute the
   line stands, said on the strip (`The line stands: no timber for its next window`) and on the
   running block (`Standing still: no timber`).
2. **The two orders.** `Order timber: 40 boards, £8,000` and `Order glass: 20 windows, £4,000` on the
   running block only, under its rows, each paid at the click on the material line and refused past
   the overdraft. The timber is refused with `No timber store`, or `The timber stores hold fewer than 40
   boards` (which today's stores never are: the smallest holds 40). The glass is refused with `Module 6
   holds glass for 40 windows`. At the contract's end the line keeps its material; at the line's sale
   it is written off and what is on its way is called off and given back.
3. **The office.** The admin on duty orders at the open of every working day, after every window and
   when the contract is taken, when what the line holds and what is on its way is under two days of
   windows; only what the buttons allow, and the timber only into free room. His name is in the ledger
   line (`Timber for the line: 40 boards, ordered by Anna`). With no admin, nothing.
4. **The Production line tab.** The fifth tab once the line has stood, read off the line's own day book
   (whether the books are up to date or not): Today, This week, This month, This year; the costs
   taken every calendar day the line stands, contract or not, so a weekend and a line with no contract
   show a loss; the year's pace as above; `Paid back: £X of £10,000,000, N%`, with the upgrades' price
   once one is bought.
5. **The lane.** The front strip from x 0 to the line's end along the front wall and the left strip up
   the left wall to the gate, nothing round the line's end; nothing else stands on it while the line
   stands or is on order (`That is the forklift's lane`); what stood there before is named on the
   strip (`Kit stands on the forklift's lane: the workbench`) and not moved, and Move is still offered
   for it; a Turn 30 line too near the front wall keeps its place with no lane and no forklift;
   `--lane-yellow` is the one new token.
6. **The long extensions.** 10 m along the rear wall each, 600,000 then 20 per cent dearer each time,
   one at a time, no limit; the insurer and a flat security level by the area over 400 (2.5 at 1,000
   m²); 8 lockers more in an enlarged canteen for every 200 m² past 800; the picture cut from the
   800 m² one by a script, nothing painted.
7. **The shelter.** Behind the rear wall with the plant, 6 by 3, its files back in their places, its
   plate hung over the wall's top, and a save's moved there. Its roof shows over the wall: the
   game's camera draws a metre further behind the wall as high as a metre further up, so the back 2.6 m
   of its top reads over the wall. It hides nothing in the hall.
8. **The contracts.** A lost contract's card (`...: the client went elsewhere`, `The client has found
   another supplier: there is no other term.`) and its ended block with `Let it go` alone; no
   standing offer at all in the quiet days, while a renewal and the line's own offer go on; the cut at
   one in four, 5 to 15 per cent under the price a piece it had, kept inside that band at the pound.
9. **The lift.** A save with the line's contract running is given one batch of each free: 40 boards
   and glass for 20 windows.
10. **The forklift.** The line's own, its driver in the picture, no spec, place, power or card; it waits
    at the front strip's end in front of module 6's pallet facing `nw`; no lifting drawn, a corner a
    turn on the spot.
11. **The trip.** Drawn by the renderer alone (`src/render/forklift.ts`); in the engine the pallet is
    at the gate at once, as in Turn 30. The newest pallet at the gate is hidden while it is on the
    forks; 3 cells a second of real time, on while the clock is paused, none from 30x. A trip there and
    back is about 29 seconds.
12. **The pallet at the gate.** `windowPallet.standard.png` at its place, the second beside it along x
    (x 2 to 3), a part pallet drawn as a full one, the label as it was.

**The choices this session made beyond the brief, each marked [TUNE] in the code** (the whole list,
with the reasons, is section 3 of `docs/notes-t31.md`):
- The admin also orders the minute the contract is taken, so a new contract does not wait a working
  day longer for its first material.
- `laneBlocked` has a third sentence, for a line standing over the left strip: `The line stands on the
  way to the gate for its lane: move it along`.
- While kit stands on the left strip, or on the front strip's first 36 m, every place of the line is
  refused: those cells are in the lane of every place it could take.
- The shelter's plate hangs 0.6 m over the wall's top, so a plate of three figures clears the wall.
- A shelter the lift finds no room for stays on the apron, and sticks 3 m past it.
- A loss is drawn only while the term has days to come; the cut only at a term's end; a second loss
  never shortens the quiet; the salts of the two side streams were chosen so that no pinned scenario
  moved.
- The day's offer is still drawn before the week closes, so an offer on the board the morning a
  client leaves stays takeable through the quiet days.
- The cut's sentence is the card's last, with no `Renew or let it go` after it, as the mockup has it.
- The longer hall's piece is cut from x 28 to 39 and not 30 to 40 (the painted floor stops at 39.06),
  the end comes in over the last piece's last metre, and a third piece, the picture's flat ground,
  is laid under the whole longer scene (SPRITES.md 9.9 says why).
- The long extension's card is `Extend the hall: 200 m² more`, its morning card `The hall is ten
  metres longer`, and areas past 999 are written `1,000 m²`.

**Seen in the pictures, and what it means** (section "The pictures" names each picture):
- **The forklift at the lane's corner** (16, moments 3, 4 and 8): its turn on the spot at (1, 19)
  puts it past the walls. Loaded and facing `nw` its pallet reaches the left wall's foot, facing `ne`
  its rear stands over the front wall's line, and coming back facing `se` its rear reaches through
  the left wall. The lane is 2 m wide and the forklift with its pallet about 3.9 m long, so no turn
  on the spot fits in it. A wider lane, or a turn drawn otherwise, is Piotr's to say.
- **The forklift waiting** at (37, 19) (05, 12): its rear reaches the lane's end line at x 38 and the
  slab's front edge. It is on the floor.
- **The set-down** (14; 16, moment 6): on the step it turns to `sw` it stands over the pallet it has
  just set down and over the middle of its label; a second later the pallet stands clear. The pallet
  turns a quarter as it is set down: on the forks of the `ne` row its glass face looks along +x,
  standing alone (view 0) along +y. The art side's 90 degree view, which nothing serves, is the
  pallet as it lies there.
- **The forklift and module 1** on the left strip (16, moments 5 and 7): module 1 is drawn over the
  forklift where they overlap, both ways; the depth reads right.
- **The lane** (05): its two lines are 2 px of the scene, faint at the fit and clear from zoom 2.5.
- **The longer hall** (07): no seam at x1 or at zoom 4. The floor's mottling repeats every ten metres,
  so a 100 m hall at x1 shows a regular row of darker clouds along its length.
- **The shelter behind the wall** (09): its roof and its far end show over the wall at every zoom, a
  grey slab behind the wall with its plate on it; its racks and boards are hidden, and it hides
  nothing in the hall.
- **The line's books with the property cover held** (03): the cover is £33,333 a month in the 800 m²
  unit, so the month that made 83 windows nets £567, a year at that pace £6,800, and `Paid back`
  reads `-£2,253 of £10,000,000, 0%`: negative while the line has not covered its running costs since
  it first stood. The cover's rate is parked (section 8). `Timber and glass` wraps at the 980 px the
  shot gives the folder; the game's folder is wider.
- **The running block** (01): each lock reason sits at the left under the row of buttons, apart from
  the button it explains, as the board's and the catalogue's lock lines do.
- **The lost contract** (10): its title fills the folder head and its last letters sit under the
  binder clip (the folder head's own style, as any long title would). In the quiet days the empty
  Contracts tab still says `No contract on offer. A shop rings now and then, and an offer stands for 5
  days.`: the brief gives no words for the quiet, so none were added.
- **The strip** (02, 06) names kit `the workbench`, where the brief's sample says `a workbench`: the
  game's own way with such lists, as the canteen's `Move the table saw off the 2 × 4 m beside it`.
- **The second extension's card** after a long one (08) keeps its title `Extend the unit to 800 m²`
  and says the unit as it stands under it, `1,000 m², room for 40 joiners and 30 benches`.
- **A load at the gate** is still drawn as Turn 13's placeholder labelled `pallet.sheets` (no
  `pallet.png` was ever delivered); with the line's timber loads it is seen more often (14).

**Questions for Piotr** (section 6 of `docs/notes-t31.md`): the section 10 choices above; whether to cap
the renewal's own rise of 1 per cent a full week (section 8); whether the forklift family's own
pictures are drawn again at true size; where the sheet store of 1,000 sheets stands when it comes,
given that anything behind the wall shows its top over it.

## The tasks

**T31-A0 The suite on v91.** `npm run check` on main as it stood (v91, state 43): lint and build
clean, 2,849 tests in 297 files green. Nothing moved, so no commit.

**T31-A1 Housekeeping and v92.** `APP_VERSION` is `v92` and its pins are flipped
(`tests/ui/saveCheck.test.ts`, `tests/ui/version.test.ts`); the README names `docs/turn-30-brief.md`
and `REPORT-T31.md`. The brief was already `CLAUDE.md`, and the Turn 30 brief already in `docs/`.

**T31-A2 The mockups.** The nine mockups of section 9 in `docs/mockups/t31/`, each the game's own
markup from engine states beside the same screen today, shot in headless Chromium, with a README
and the lead's decisions file (`decisions.md`). Built off a snapshot of the A1 commit by sub-agents.

**T31-B1 The line's timber and glass, STATE_VERSION 44.** Two boards and one glass a window, the
boards held on the timber stores (`boardsHeld`, `reservedSheets`), the glass at module 6 up to 40;
`Order timber: 40 boards, £8,000` and `Order glass: 20 windows, £4,000` on the running block with
their refusals; the office admin orders at two days left (and the minute a contract is taken); a
line short of either stands, said by `lineNeedsMaterial` and the `Standing still` row; written off
at the sale. The lift `liftToVersion44` writes every new field, and a running line gets one batch.

**T31-B2 The line's books.** The line's own day book in `windowLine` (`today`, `days` kept 400 days,
`since`): a window booked as it is made, each working minute of its contract as possible or lost by
cause, and a calendar day's engineers, power and property cover at its open (beside the ledger's
`runDayCosts`, weekends among them, while the line stands). The fifth tab of the Accounting page,
`Production line`, once the line has stood: four columns in the Summary's classes, the month's pace,
a year at it, paid back, and what the month lost; selectors in `src/engine/lineBooks.ts`.

**T31-C1 The timber shelter behind the rear wall.** `STARTING_LAYOUT.timberShelter` has `rear: true`,
so `rearYardPlaceFor` stands it with the plant (`No room behind the hall` its refusal) and the van
stands alone on the apron; declared 6 m along the wall by 3 m deep, its zone its footprint, its words
`outside behind the hall`; its two files changed places back by `git mv` through a temporary name;
its plate hung over the wall's top above it; a save's shelter on the apron moved by
`standThePlantBehindTheWall(state, 'timberShelter')`, gated `version < 44`. SPRITES.md 13 put right.

**T31-C2 The forklift's lane.** `forkliftLane(state, at)` in `layout.ts` gives the front strip (x 0
to the line's end, y D - 2 and D - 1) and the left strip (x 0 and 1, y 10 to D - 1), or null where
the line, its men's metre and its lane would meet; `lineFits` asks the line and its lane at the order
(`No room in the hall for the line and its lane`) and in setup mode (`... and its lane`);
`canPlaceSpec` alone refuses everything else on it (`That is the forklift's lane`); `laneBlocked`
under `boardsAtTheGate`; drawn first in the hall's live part in `--lane-yellow`, the one new token.

**T31-C4 The line's forklift and the pallet standing alone (L3).** The three pictures moved by `git
mv` into `public/sprites/`, byte for byte, and `docs/pictures-l3/` gone; `FORKLIFT_SHEETS` from the
two JSONs; `src/render/forklift.ts` (no game state) waits on the front strip facing `nw`, takes each
new pallet to the gate (`nw`, `ne`) and comes back (`sw`, `se`) at 3 cells a second of real time,
hiding the pallet on its forks, set again after every page and forgotten at a load, a new morning, a
move, a sale and from 30x; the pallets at the gate drawn from `windowPallet.standard.png`, two at the
most. The two new kinds of file taught to the Sprite check page and the counting tests; SPRITES.md 16.

**T31-C1 and C2 review fixes.** A second reader's findings on C1 and C2, put right in one commit after
C4: kit standing on the lane, and a line whose lane cannot be, still offer `Move` (`canBeMoved`), so
the strip's `move it` can be done; a line over the left strip is told `move it along`, not `move it
back` [TUNE]; the shelter's plate hung 0.6 m over the wall's top so that 400 clears the wall's clip
at both corners [TUNE]; the shelter's lift asserted on raw saves in `tests/cloud/migrate.test.ts`
(standing, on order, and with no room), and a purchase's search sent past the lane to the first free
place off it.

**T31-D1 Contracts that can be lost.** At each week's close of a running sheet contract, after the
short week's rule and while the term has days to come [TUNE], one time in `CONTRACT_CLIENT_LEAVES_CHANCE`
the client goes elsewhere (`endedBy: 'lost'`, the week already closed, no second, no term offered, the
men free) and no standing contract is offered for 14 to 21 days (`contractQuietUntilDay`, drawn at
the loss; a second loss never shortens it [TUNE]); at a sheet term's end, one time in four, the
client offers 5 to 15 per cent under the price a piece it had (kept inside the band at the pound
[TUNE]), said as the card's last sentence. Every draw off `contractSideCarrier` (seed, id, day,
salt); the salts 2 and 9 chosen so that none of the 34 draws the suite made before tonight comes up,
so no scenario moved (2.9's "choose its seed") [TUNE]. A lost contract's ended block has `Let it go`
alone, and `renewContract` lets it go and refuses its renewal in words. An offer already on the board
when a client leaves stays takeable through the quiet days, since the day's offer is drawn before the
week closes (the order of the day's open is unchanged).

**T31-C3 The hall that grows.** Once the second extension is open the Premises page has a third card,
`Extend the hall: 200 m² more` (`data-premises="extendLong"`, `data-stage="long"`), in the extension
cards' shape: 10 m more along the rear wall at a time, one at a time, the next working morning, the
apron and everything at or past the old kerb moved out (`moveTheApron`), the plant behind the wall
left; priced `UNIT_LONG_EXTENSION_PRICE` 600,000 times 1.2 to the n with the deposit on the bigger
rent, no limit. The rent, rates, benches, power, joiners and a firm by the area as before;
`unitCostFactor` is now the area over 400 past the 800 m² unit [TUNE: chat] and an enlarged
canteen's lockers 32 and 8 more per 200 m² [TUNE: chat]. The picture: `scripts/hall-long.py` cuts
three pieces from `hallBackgroundDeep.png`, nothing painted or scaled (SPRITES.md 9.9, with why the
cut is x 28 to 39 and why a flat ground piece is laid under all of it); the frame, the camera and the
fit read the hall's own length. A second reader's finding put right before the commit: the end now
comes in over the last piece's last metre, so the join at the end never shows the ground through.

**T31-E1 Notes and art requests.** `docs/notes-t31.md`: where each task lives, the save, the readings
taken, section 10's choices with what was built, what was found and left, the questions for Piotr.
`docs/art/REQUESTS-T31.md`: nothing new asked tonight; S1 (the outside sheet store) named for the next
turn, the forklift family's own pictures for Piotr, and what may sit badly for E4 to look at.

**T31-E2 Scenarios.** `tests/scenarios/turn31.test.ts`, (hhh) to (lll), 16 tests: the line's material
ordered by the player and by the office, the books after a played month with an engineer away a day,
the lane against a rack and a save's bench, the hall extended three times, and a played year of three
sheet contracts (seed 20261012 chosen to show a loss and a cut: five losses, two cuts) with the 34
draws the suite pinned before tonight asserted never to come up. The figures that moved were re-pinned
in their tasks with one line of reason each (B1: turn30's material and minutes; C2: turn29's and
turn30's rack moved off the lane, the refusal's words); none moved for D1.

**T31-E3 The cross check.** Section 7 read claim by claim against the code and the tests by four
readers (the material and the books; the lane, the hall and the shelter; the contracts and the
forklift; the standing rules and section 6): 192 claims, none untrue in the code. What was true and
not asserted is asserted now: the line's boards never taken by a sheet job or a sheet contract, the
admin refused what the buttons refuse, the Today, week and year columns each reckoned from the day
book, the chances pinned, the line's contract untouched by a loss and its quiet, the lane's drawn
corners, the forklift's drawn row on every leg and its frames playing, a trip forgotten at 30x and at
a new morning in the app, the app's reset beside every `resetWalkers`, and the strip's
`lineNeedsMaterial` in (hhh) asserted unconditionally. Two claims are left to the report: the longer
hall's pieces are the 800 m² picture's own pixels (checked with numpy: every visible pixel equal, max
difference 0), and no CSS token but `--lane-yellow` is new (`git diff 0d4dd31 --stat --
src/ui/styles.css`: 3 insertions, the one token and its comment).

**T31-E4 Look and shoot.** Sixteen pictures in `docs/report-t31/`, every one the game's own markup
from its own render functions over states the engine built and played, shot in headless Chromium,
each screen beside its nearest existing one (v91's own scene of the same company, built from the A1
snapshot, for the hall, the forklift and the pallet; the Turn 30 screen or the same screen without
tonight's part for the rest). The generators are in the session's scratchpad, not in the repo.
Section "The pictures" below lists them and what each shows; "Seen in the pictures" in section 0 says
what sits badly.

**T31-E5 The report and the pull request.** This file, section 0 first, and the pull request titled
`Turn 31: the line's timber and glass, its books, the forklift's lane and its forklift, the hall that
grows, the shelter behind the wall, and contracts that can be lost`, not merged. `tests/ui/store.test.ts`'s
slowest test given the time its real waits take (section 0). The static server the pictures were shot
through was stopped, and nothing is left running.

## The pictures

Each beside its nearest existing screen, and the mockup of section 9 it makes true is in
`docs/mockups/t31/`.

| Picture | What it shows | Beside |
|---|---|---|
| `01-the-line-running-block-material.png` | the line's running block with `Timber on the stores` and `Glass at module 6`, the two buttons offered, the glass locked (`Module 6 holds glass for 40 windows`), both locked (`Not enough cash`, said once), and `Standing still: no timber` | the same block with the material in hand; `mockups/t31/line-running-block.png` |
| `02-the-strip-material-and-lane.png` | the strip with `lineNeedsMaterial` (no timber, no glass, both) and `laneBlocked` (kit, and a Turn 30 line too near the wall) | the strip with `lineNeedsEngineer`; `mockups/t31/strip.png` |
| `03-the-production-line-tab.png` | the Production line tab after a played month, an engineer away a day, the cover held | the Summary tab of the same company at the same minute; `mockups/t31/production-line-tab.png` |
| `04-the-materials-page-line.png` | the Stock page: the boards row holding the line's 24, `Glass at the line` for 12 of 40, the line's load in its own words | the same page before the line |
| `05-the-forklift-lane-in-the-800-m2-hall.png` | the hall with the line at (2, 14), its lane in yellow and its forklift, at the fit, the opening zoom, the left strip, the line's end and the corner at zoom 4 | a Turn 30 line at (2, 15): no lane, no forklift, `laneBlocked`; `mockups/t31/hall-lane.png` |
| `06-lane-blocked.png` | a workbench on the front strip and `Kit stands on the forklift's lane: the workbench` | the same with the bench moved off |
| `07-the-hall-that-grows-60-m-and-100-m.png` | a 60 m and a 100 m hall at x1, and the joins at zoom 4 | the 800 m² hall; `mockups/t31/hall-longer.png` |
| `08-premises-long-extension-card.png` | `Extend the hall: 200 m² more` offered at £600,000, being built, and the next at £720,000 | the second extension's card, offered and being built; `mockups/t31/premises-long-extension.png` |
| `09-timber-shelter-behind-the-rear-wall.png` | the shelter behind the rear wall with its plate over it, the van alone on the apron, at the fit and closer | the shelter on the apron as Turn 29 stood it; `mockups/t31/shelter-behind-wall.png` |
| `10-a-lost-contract-card-and-block.png` | the lost contract's card and its ended block with `Let it go` alone, and the tab after it | a term that is over, its card and block; `mockups/t31/contract-lost.png` |
| `11-a-renewal-with-the-cut.png` | the renewal card with the cut (`£86 a piece ... 9% less than now: the market has turned.`) and its block | the renewal at the history's price |
| `12-forklift-waiting-at-the-line-end.png` | the forklift waiting empty at the line's end facing `nw`, at the opening zoom, zoom 3 and zoom 4 | v91's own scene: no lane, no forklift |
| `13-forklift-loaded-on-the-front-strip.png` | the forklift loaded on the front strip mid trip | v91's own scene |
| `14-forklift-setting-the-pallet-down.png` | the moment the pallet is set down at the gate, a quarter second before and a second after | v91's boxes at the gate |
| `15-the-pallet-standing-at-the-gate.png` | one and two pallets from `windowPallet.standard.png` with the label | v91's one and two boxes; `mockups/t31/forklift.png` |
| `16-forklift-frames-on-a-trip.png` | ten moments of one trip there and back, each with its leg, row, frame and sheet | the art side's approved preview of L3 |

## The state: STATE_VERSION 44

- **The new fields:** on `windowLine`, `boards`, `glass`, `glassOnTheWay` (`{ windows, day }`), `today`
  and `days` (the line's day book, `LineDay`, with its lost minutes by cause) and `since`; on `unit`,
  `longExtensions` and `longExtension` (`'none' | 'building'`); on the state, `contractQuietUntilDay`.
  New optional values no save carries: a delivery's `line`, a contract's `endedBy` `'lost'`, and the
  stage `'long'`. New actions `ORDER_LINE_TIMBER` and `ORDER_LINE_GLASS`. The forklift is the
  renderer's: no field and no lift.
- **The lift.** `liftToVersion44` writes every new field with its default; `giveTheLineItsFirstBatch`,
  on the whole state after the raw lifts and gated `version < 44`, gives a save whose line contract
  runs one batch of each, free (40 boards on the line and on the counter, glass for 20 windows), with
  no ledger line; the shelter's step, outside the chain of the plant's other moves and gated `version
  < 44`, moves a shelter standing or on order on the apron behind the rear wall
  (`standThePlantBehindTheWall`), and one the wall has no room for stays where it stands.
- **Asserted on raw saves** in `tests/cloud/migrate.test.ts`: one with neither (the defaults and
  nothing else), one with a running line contract (the free batch), one with a shelter on the apron
  and one on order (moved, the van still on the apron), and one whose wall is full (the shelter
  stays). Every save that loaded on v91 loads, the fixtures among them.
- **Version pins flipped:** `tests/cloud/migrate.test.ts` (STATE_VERSION and every lifted save's
  version to 44), `tests/ui/saveCheck.test.ts`, `tests/engine/v67.test.ts`,
  `tests/engine/types.test.ts`; `APP_VERSION` `v92` in `tests/ui/version.test.ts` and
  `tests/ui/saveCheck.test.ts`. The two 43s that are not the version (`contracts.test.ts`,
  `migrate.test.ts`) are left. The whole account is section 2 of `docs/notes-t31.md`.

## Tests flipped, by name

- `tests/cloud/migrate.test.ts`: the version pins (B1), the lift on raw saves (B1), the shelter's lift
  (the C1 and C2 review fixes).
- `tests/engine/t30Contract.test.ts`: a window books no material; the offer card's sentence (B1); the
  line's place refused in the lane's words (C2).
- `tests/engine/t30Upgrades.test.ts`, `tests/render/t30Sheets.test.ts`: the line given its material,
  which a window now wants (B1).
- `tests/engine/warnings.test.ts`: `WARNING_ORDER` with `lineNeedsMaterial` under `lineNeedsEngineer`
  (B1) and `laneBlocked` under `boardsAtTheGate` (C2).
- `tests/ui/t30Line.test.ts`: the `Standing still` row (B1), the refusal's words (C2), and the boxes at
  the gate become the pallet's picture, two at the most, `data-line-pallet` kept (C4).
- `tests/scenarios/turn30.test.ts`: the material ordered at the take and in the next working morning,
  the minutes counted from it, the second 60 minute day (B1); the rack moved off the lane and the
  refusal's words (C2).
- `tests/engine/t30Move.test.ts`, `tests/engine/t29Line.test.ts`, `tests/scenarios/turn29.test.ts`:
  the line moved and placed where its lane is clear, and the refusals' words (C2).
- `tests/engine/t29Stores.test.ts`, `tests/engine/metres.test.ts`: the shelter behind the wall, 6 by 3
  (C1). `tests/engine/zones.test.ts`: loosened with a line of reason, since the shelter now takes wall
  the plant also wants (C1).
- `tests/render/spriteClasses.test.ts`, `tests/engine/rotate.test.ts`, `tests/ui/spriteCheck.test.ts`:
  a vehicle's sheet and a thing that is no family's class counted as neither a class picture nor a
  turn, and the Sprite check page's new rows (C4). The counts of class pictures and of turns did not
  move.
- `tests/ui/saveCheck.test.ts`, `tests/ui/version.test.ts`: v92 and 44 (A1, B1).
- `tests/ui/store.test.ts`: not flipped; its slowest test is given 15 s for its four real waits (E5).
- No scenario figure moved for D1: the side streams' salts were chosen so that none of the 34 draws
  the suite made before tonight comes up.

New, each with the Skylon Development Ltd header: `tests/engine/t31Material.test.ts`,
`tests/ui/t31Material.test.ts`, `tests/engine/t31Books.test.ts`, `tests/engine/t31Shelter.test.ts`,
`tests/engine/t31Lane.test.ts`, `tests/render/t31Forklift.test.ts`, `tests/engine/t31Contracts.test.ts`,
`tests/engine/t31Hall.test.ts`, `tests/ui/t31Hall.test.ts` and `tests/scenarios/turn31.test.ts`. New
code files, with the header: `src/engine/lineBooks.ts`, `src/render/forklift.ts`,
`scripts/hall-long.py`.

## What was not done tonight

- **Nothing of section 5 was left out.**
- As the brief parks it (section 8): the outside sheet store of 1,000 sheets (S1, named in
  `docs/art/REQUESTS-T31.md`); the forklift family's own pictures and the forks lifting; the renewal's
  own rise of 1 per cent a full week; the money of the line and its property cover; everything Turn 30
  parked.
- Found and left (section 5 of `docs/notes-t31.md`): `You spend more than you earn` does not count the
  line's windows as earnings; the day end card calls tomorrow's boards `sheets`; some older test
  fixtures still stand a shelter on the apron by hand.
- Nothing of a normal job, `addToJob`, `assignJob`, `canBuild`, a sheet template or stage, the wages,
  the tax, the loan, the bank, the insurance's rate, `crewByFamily`, `MAX_CATCH_UP_MS`, the paced
  redraw, `playSheets` or the sprite cache headers was changed. `git diff 0d4dd31 --stat --
  src/ui/styles.css` is three lines: `--lane-yellow` and its comment.
