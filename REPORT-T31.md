# Report, Turn 31: the line's timber and glass, its books, the forklift's lane and its forklift, the hall that grows, the shelter behind the wall, and contracts that can be lost

Woodwork Empire, Turn 31. Built against `CLAUDE.md` of 11.10.2026 (first line "Turn 31").

## 0. What Piotr should read first

Written at the end of the session (T31-E5). Until then this file carries the two lines of each task
as it is done, so that nothing is lost if the session ends early.

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
