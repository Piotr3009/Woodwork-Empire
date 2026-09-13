# Report: Turn 5

The 200 m2 hall, a day with a break, and a screen that stops blinking.

Branch `claude/intelligent-goldberg-7vt96f` (the cloud environment names the branch; the turn ritual
would have called it `turn-5-painted-hall`). Base: `origin/main` at `94aef4c`, Piotr's "tura 5"
commit. 562 tests green, `npm run check` clean.

---

## 0. Read this first: there was no Turn 5 brief

**The root `CLAUDE.md` on `main` is still the Turn 4 brief, and no file in the repository, and no
issue or pull request on it, describes Turn 5 or names a task T5-01 to T5-13.** I looked in the
working tree, in every branch, in the whole of git history, and in the repository's issues and pull
requests. What exists of Turn 5 is:

1. **`docs/art/SPRITES.md` section 9**, added by Piotr in the "tura 5" commit on 13.09.2026 with the
   three hall layers: a full contract for the painted hall, approved and dated, saying in 9.1 that
   "the engine's footprints are re-expressed in metres in the same turn that adopts this hall".
2. **The title this PR was asked to carry**: "the 200 m2 hall, a day with a break, and a screen that
   stops blinking", which names three pieces of work.

So the thirteen tasks are mine, derived from those two things, and the report says so rather than
pretending a brief was followed. Where section 9 speaks I implemented section 9. Where only the
title speaks I did the work the title names and tagged every number I had to choose `[TUNE]`, which
is the repository's own rule for a number Piotr has not set. Section 8 below lists exactly what I
chose rather than read, and section 9 asks Piotr the questions that follow from it.

The task list, and what each one was derived from:

| Task | From |
|---|---|
| T5-01 Housekeeping | The turn ritual of T3-01 and T4-01 |
| T5-02 The world unit is a metre | SPRITES.md 9.1 |
| T5-03 The 200 m2 hall | SPRITES.md 9.1 and 9.3 |
| T5-04 The layout re-laid | SPRITES.md 9.3, a consequence of T5-02 and T5-03 |
| T5-05 The hall layers registered | SPRITES.md 9.2 and 9.3 |
| T5-06 The live text | SPRITES.md 9.5 |
| T5-07 The screen stops blinking | The PR title |
| T5-08 A day with a break | The PR title |
| T5-09 The state version | The standing rule on a changed state shape |
| T5-10 The sprite check page | SPRITES.md 9.6, the shape of T4-09 |
| T5-11 The scripted months | The turn ritual of T3-11 and T4-10 |
| T5-12 Review the whole diff | The turn ritual of T4-11 |
| T5-13 Report and PR | The turn ritual |

---

## 1. Done

**T5-01 Housekeeping** `1c0addf`. The root `CLAUDE.md`, which is the Turn 4 brief, is copied
verbatim to `docs/turn-4-brief.md`. The README had fallen two turns behind on the list of archived
briefs and reports and now lists all four and all five.

**T5-02 The world unit is a metre** `48e6321`. SPRITES.md 9.1 retires the 0.5 m tile. The pixels of
a cell do not move (48 by 24 at 1x), so the painted hall and the projection agree, but a cell is a
metre and every footprint in the catalogue is half what it was, never below the one cell an object
has to stand on: the table saw that was 4 by 2 by 2 tiles is 2 by 1 by 1 m, which is the contract's
own worked example. The names that carried the old unit say cells instead of tiles
(`widthCells`, `GATE_LANE_CELLS`, `firstFreeCell`, `stationCell`); `tileToScreen` and `TILE_WIDTH`
keep their names, because 9.1 itself calls the screen diamond "the tile the game already draws".

**T5-03 The 200 m2 hall** `cbb9272`. 20 by 10 m, 200 cells, origin at the rear left corner. The WC
takes 2 cells, the office 8, the canteen 8, and the eight cells of the lane inside the shutter are
kept clear: 174 left for equipment, which the test counts twice, once from the contract's arithmetic
and once cell by cell through the placement rule. The shutter and the personnel door are in the left
wall where 9.3 puts them. There is one set of registered room layers, so every difficulty rents the
same floor: very easy keeps its cash and its bench slots instead of a bigger unit. The rent follows
the rate Piotr set, 12 a metre, so it is 2400 a month (section 9, question 2).

**T5-04 The layout re-laid** `8591349`. Machines along the rear wall clear of the rooms, benches
down the middle clear of the personnel door, welfare kit in the row in front of the rooms, stock and
the big machines in the front half, and nothing on the lane. A test buys everything a workshop can
own, six of anything per worker, and asks the placement rule about each item where it ended up.

**T5-05 The hall layers registered** `9b2456d`. The three layers go down at the canvas origin, which
puts world (0, 0, 0) on the pixel the art was drawn around, and the view box is the canvas itself so
the registration cannot drift. The test takes the four floor corners 9.2 names on the 2x canvas,
halves them, and asks the projection for the same corners. The painting carries the floor, the walls
and the grid; the grid only comes back out while the hall is being set out. The art falls back room
by room: what is not delivered is a placeholder box with its name on it, and every room keeps a
footprint the player can click.

**T5-06 The live text** `b2295ae`. The company name goes in the strip 9.5 leaves for it and each
room name on the face that looks into the hall. The name is fitted to the wall rather than cut to
it: it shrinks to the readable minimum of 11 px first and is only shortened when even that will not
hold it. Both are drawn inside the scene as SVG text, so the one view box that scales the painting
scales the lettering with it (deviation 1).

**T5-07 The screen stops blinking** `e9b8048`. See section 3.

**T5-08 A day with a break** `3d608da`. See section 4.

**T5-09 The state version** `081044f`. `STATE_VERSION` is 4. An anchor written on the half metre
grid would stand the workshop in the wrong place and some of it off a floor that is a different size
now, so the loader refuses a Turn 4 save, which is what it already does with anything that is not
the current number.

**T5-10 The sprite check page** `8cb4531`. One builder draws both sets of room layers, so a third
set is data and not code, and the page is the acceptance tool for the hall delivery the way it was
for the office: each layer full width at the 2x canvas size, with the file named under it.

**T5-11 The scripted months** `e702e47`, `dba9b37`. The six months go home by the work done rather
than by the hands. The seventh is new: day 2 of the careful month watched minute by minute through
the one scripted player, showing the whole workshop in the canteen for the length of the break with
the piece on the bench untouched, the day ending at 16:30 with all 480 minutes behind him, and the
hall being the 200 m2 the painting is.

**T5-12 The review** `3dd9205`, `1c1c7e7`. Four defects, in section 6.

**T5-13 Report and PR** this file.

---

## 2. Not done or partial

Nothing in the thirteen is partial. What I did not do, and why:

1. **The office company name is still cut, not shrunk.** SPRITES.md 8.3 says the office name is
   "one line, ellipsis if longer", which is what it does, so open question 5 of REPORT-T4 is
   answered for the hall and left alone for the office. Changing it would be changing an approved
   decision without being asked.
2. **No migration of a Turn 4 save.** The loader refuses it, as every version bump before this one
   has. Writing a migration for a save format nobody has a copy of would be work for nobody.
3. **The 60 m2 unit is gone rather than kept as a smaller starting unit.** There is one painted hall
   and one set of registered room layers; a second unit size needs a second set of art (section 12).

---

## 3. The screen that stopped blinking

**What it was.** `render()` wrote the whole page with one `innerHTML`, every game minute: once a
real second at 1x, four times a second at 4x. The page holds the scene, and the scene holds the
painting: 0.9 MB of hall background, or 2.8 MB of office room across three layers. A fresh `<img>`
has to fetch and decode before it can paint, so every one of those rebuilds left the room blank for
a frame. The office had a second reason to jump: its stack is scaled from the window first and then
corrected from its own box once it is on the page (REPORT-T4, known risk 1), so a rebuilt room was
drawn at one size and corrected to another, once a second.

**The fix.** A scene comes in two pieces now. The shell carries the pictures, the click regions and
the frame; the live part carries the figures, the dust, the clock and the name on the wall. The
shell is built once, kept, and carried into each new page; only the live part is written again. A
key says what the shell was built from (the view, the frame, the delivered art, whether the hall is
being set out), so it is rebuilt when one of those changes and at no other time, and the shell is a
function, so a scene that is already on the page is not even built as a string. It is the shape
`ui/modal.ts` has used for an open modal since T3 3.4: one code path, not a new idea.

**How it was checked.** `tests/ui/sceneKept.test.ts` holds the actual picture elements and asserts
they are the same objects after the clock has run, and that the live part moved on anyway. Then in
Chromium at 1280 by 800: started a game, bought the day 1 kit, ran three real seconds at 4x, and
asked whether the three `[data-layer]` elements were the same nodes. They were.

---

## 4. The day with a break

Piotr's title asks for a day with a break; nothing says how long or when. What I did **not** do is
take it out of the 480 minutes, which are his number. The break is on top of the work:

- Nobody works through it. No owner task, no staff task, no production, no helper clearing a bag,
  and the whole workshop stands at the canteen door.
- It costs nobody a minute. Everything that measures a day's work, the hour bands, the pool, the
  overtime, the fatigue, the twelve hour wall, counts worked minutes through one helper
  (`workedMinutesOfDay`), so the 480 are untouched.
- The clock therefore runs on by the length of the break: the day that ended at 16:00 ends at 16:30,
  and the hard stop moves with it.
- The top bar says "Break" and leaves the speeds alone, so the player can run the clock through it.
- A client who rings during it gets through the minute they are back at it.

`BREAK_START_MINUTE = 240` (noon) and `BREAK_MINUTES = 30` are both `[TUNE]`. Section 9, question 3.

---

## 5. Deviations from the contract

1. **The hall's live text is SVG inside the scene, not HTML over it.** SPRITES.md 9.5 says "all as
   HTML positioned in canvas coordinates", which is how the office does it, because the office is a
   stack of divs. The hall is one SVG that scales through its own view box. HTML over it would need
   a second scale worked out from the page, which is exactly the drift REPORT-T4 named as known risk
   1. Drawing the text inside the SVG in canvas coordinates gives the same positions and the same
   scaling from the one number. `src/render/hall.ts`, `paintedText` and `canvasBoxInHall`.
2. **The delivery lorry stands inside the hall, on the gate lane.** 9.3 puts the shutter in the left
   wall, which is a far wall from where the camera stands, so a vehicle outside it is behind the
   wall and cannot be seen. The lane 9.3 keeps clear is where it goes, which is also what a lane is
   for. The finished pieces stand at the far end of the same lane, which is why too many of them
   still slow the hall down (T2 3.7).
3. **The three room sprite keys are gone.** `roomOffice`, `roomWc` and `roomCanteen` are in
   SPRITES.md 6 as a later batch, but 9.3 makes the office and the canteen layers of the painting
   and bakes the WC into the background. Keeping both would be two ways to draw one block, which
   rule 3 of the Turn 1 brief forbids. A room is its layer, or a placeholder box. This also stops
   the sprite check page asking the art side for a canvas 201.6 px tall, which is what a 2.7 m room
   worked out to once footprints were in metres.
4. **`SHORT_HANDED` takes four jobs instead of two.** The month stopped running its rack dry. The
   cause is not the break: a scripted owner who does the material order the moment it appears keeps
   two jobs supplied without trying, and REPORT-T4 had already had to cut the pallet from ten sheets
   to eight to keep the old outcome. I did not cut it again. Taking on more work than the rack can
   carry is what a short handed workshop actually does, so that is the rule I turned, and the month
   now runs dry eleven times in twenty three days.
5. **A commit went in on a red check.** `e702e47` (T5-11) carried a lint error: an import the
   scenario stopped using when it moved to the scripted driver. The check was run, but the command
   that ran it piped the output through `grep` and committed on grep's exit code, not the check's,
   so a red check read as green. Fixed in `dba9b37`, which says so in its own message. Every commit
   after it was gated on `npm run check`'s own exit code.

---

## 6. What the review of the whole diff turned up

Four defects, all mine, all from this turn (`3dd9205` and `1c1c7e7`):

1. **The owner stood a metre past the front of his bench.** The offsets in the renderer were the
   3 by 2 of the half metre tile. They come off the bench's own footprint now.
2. **A room could be drawn two ways**, as a layer or as its own sprite. Deviation 3 above.
3. **A scene's markup was built on every render and thrown away** unless the key had changed. The
   shell is a function now.
4. **The helper worked through his dinner.** He needs no minutes, so the settle pass cleared his bag
   change in the middle of the break. He waits for them to be back at it.

And from the browser pass, on the painting itself: the setup grid lands exactly on the painted
floor, which is the registration of 9.2 seen rather than computed, and the accepted kerb quirk of
9.4 is visible as the last row of cells overhanging the kerb by a few pixels, as Piotr accepted.

---

## 7. Paths: how many code paths do the same job?

| Behaviour | Paths | Note |
|---|---|---|
| Project a world point to the screen | 1 | `tileToScreen`. The contract's own 2x form is checked against it in a test, not reimplemented. |
| Decide where a hall layer goes | 1 | `hallLayerBox`, off `HALL_CANVAS`. The view box uses the same function. |
| Draw a room block | 1 | Its layer, or a placeholder box. The room sprite path was deleted this turn. |
| Fit a name to a box | 2 | `fitName` for the hall, CSS ellipsis for the office. The office's is what SPRITES.md 8.3 asks for (section 2.1). |
| Keep a view alive across a render | 1 | `mountScene` for the scene, `syncModals` for a modal. Two callers, one idea, different DOM. |
| Measure a day's work | 1 | `workedMinutesOfDay`, and everything that asks about a day's work asks it. |
| Send the scripted owner home | 1 | `isOvertime`, in the shared helper and in the autopilot. |
| Build the speed chips | 1 | `speedChips`. The break label is a prefix, not a second copy. |
| Show a set of room layers on the sprite page | 1 | `layerSection`, called twice with data. |

---

## 8. Numbers I chose, and where they are

Every one of these is `[TUNE]` in `src/engine/constants.ts` or named here, because Piotr has not set
them. None of them is presented in the UI as a fact.

| Number | Value | Why that value |
|---|---|---|
| `BREAK_START_MINUTE` | 240, which is noon | A joinery stops at twelve |
| `BREAK_MINUTES` | 30 | Half an hour is the usual unpaid dinner |
| Hall name lettering | 18 px down to 11 px | 11 px is the repository's readable minimum (T2 3.11) |
| Room face lettering | 11 px | 9.5 says "small text" |
| Room block height | 2.7 m | 9.3 gives the office and canteen blocks as 2.7 m high |
| Footprint rounding | half, rounded up, never below 1 | 9.1 says halve; a cell is the smallest thing that can stand anywhere |
| `YARD_WIDTH_CELLS` | 3, was 5 | The apron past the front kerb only has to hold the company van now |

Retagged: `UNIT_AREA_M2` is no longer `[TUNE]` at 60. It is 200 because the painted hall is 20 by
10 m, which makes the rent 2400 a month at Piotr's rate of 12 a metre.

---

## 9. Open questions for Piotr

1. **The company name does not land on the wall.** SPRITES.md 9.5 gives its box as canvas x 300 to
   560, y 130 to 200. Halved and measured from the origin the art is registered to, that is above
   and to the left of the rear wall: in the delivered background it sits over the dark sky, above
   the roofline, not on any painted surface. I drew it exactly where the contract says and it looks
   wrong on screen. The registration is not in doubt, because the setup grid lands on the painted
   floor to the pixel. Either the box moves, or the art paints a wall or a sign there. Where do you
   want the name?
2. **The 200 m2 hall quadruples the rent.** 12 a metre is yours and 200 m2 is the painting, so the
   rent is 2400 a month, the deposit is 2400 on day 1, and Hard now starts at minus 2480 and reaches
   the bailiff on day 62 instead of surviving into the third month. Is the 200 m2 hall the starting
   unit, or is it the unit the company moves into once it can pay for it?
3. **The break: noon for half an hour, on top of the 480.** I kept your 480 minutes and made the day
   end at 16:30 instead of taking the break out of the work. Is that the right way round, and is
   half an hour at twelve the break you want?
4. **Very easy has lost its bigger unit.** There is one painted hall, so very easy now has the same
   floor as everybody else and keeps only its 50,000 and its six bench slots. Is that enough of an
   easy mode, or should very easy get a cheaper rent per metre instead?
5. **Nothing can be parked outside except the company van.** The shutter is in a far wall, so the
   yard is not a place the camera can see. The lorry, the finished pieces and the unloading all
   happen on the lane inside the hall. Does that match what you had in mind, or should the gate be
   on a front edge instead?
6. **The room labels are small on small rooms.** The WC is 1 m wide, so "WC" nearly fills its face
   and "Office" and "Canteen" run to the edges of theirs. Do you want the names on the doors, or a
   sign over each room, or nothing at all?

---

## 10. Known risks

1. **The scripted month is a different month now.** The break moves when calls ring, and the seeded
   RNG is one stream, so every draw after the first call lands differently: the careful month takes
   ten jobs where it took eleven. Nothing is wrong with either month, but a scenario that asserts
   what a month came to is asserting one path through the RNG, not a law of the game.
2. **The company van is drawn past the kerb, on painted ground the floor does not cover.** It is
   inside the canvas, so it is visible, but it stands on whatever the background happens to paint
   there rather than on a yard.
3. **The hall layers are stretched to the box, not fitted to it.** `preserveAspectRatio="none"` is
   right while the box is the canvas, which it is; if anything ever computes that box differently
   the painting would stretch rather than letterbox, and stretched by a pixel is harder to see than
   a black edge.
4. **`fitName` measures letters by a constant.** 0.55 of the font size per letter is an average, not
   a measurement, so a name of all capitals or all narrow letters is fitted a little wrong. Nothing
   overflows, because the estimate is generous.
5. **The office scale is still worked out twice**, as REPORT-T4 said. The scene being kept makes it
   happen once per shell instead of once a second, which is what the jump was, but the two passes
   are still there.
6. **174 free cells is a lot of room.** The hall is more than three times the floor it was, and the
   bench slot cap, not the floor, is what limits the workshop now. That is a balance question the
   next turn will meet rather than a defect.

---

## 11. Line balance

| Task | Files | Added | Removed |
|---|---|---|---|
| T5-01 | 3 | 213 | 2 |
| T5-02 | 13 | 265 | 127 |
| T5-03 | 9 | 268 | 126 |
| T5-04 | 5 | 69 | 16 |
| T5-05 | 3 | 261 | 38 |
| T5-06 | 3 | 161 | 4 |
| T5-07 | 5 | 319 | 54 |
| T5-08 | 18 | 341 | 82 |
| T5-09 | 2 | 29 | 4 |
| T5-10 | 2 | 67 | 27 |
| T5-11 | 2 | 91 | 7 |
| T5-11b | 1 | 0 | 1 |
| T5-12 | 8 | 104 | 60 |
| T5-12b | 2 | 45 | 1 |
| **Total** | **39** | **2233** | **549** |

`docs/turn-4-brief.md` is 208 of the added lines and is a copy, not new work.

---

## 12. Tests

562 in 44 files, 15.5 s, `npm test`. New this turn:

| File | Tests | What it holds |
|---|---|---|
| `tests/engine/metres.test.ts` | 11 | The metre cell, the projection against the contract's own form, every footprint halved, the 200 m2 hall and its 174 free cells |
| `tests/render/hallRoom.test.ts` | 16 | The canvas and the four corners, the layers and their order, the frame, the fallbacks, the lettering, the shell key |
| `tests/engine/breakTime.test.ts` | 7 | Nobody works through the break, the day is longer by it, the top bar, the helper |
| `tests/ui/sceneKept.test.ts` | 5 | The picture elements survive the clock, in both views |

Changed: `clock`, `owner`, `game`, `tasks`, `jobs`, `staff`, `economy`, `layout`, `types`,
`moving`, `views`, `sizing`, `spriteArt`, `spriteCheck`, `app`, `helpers`, `autopilot`,
`thirtyDays`.

---

## 13. How to run

```
npm ci
npm run dev          # the game at http://localhost:5173
npm test             # 562 tests
npm run check        # lint, build, test: the gate before every commit
```

The hall art is in `public/sprites/`. Delete `hallBackground.png` and the hall falls back to its
flat floor and its grid, which is the same fallback the office has: nothing in the game needs the
art to be there.

---

## 14. Parked, carried forward

1. A second hall (a bigger unit as the company grows): a new set of layers and a new registration,
   which is the same shape as the larger office parked in T4.
2. Larger offices as the company grows (SPRITES.md 8.1).
3. Everything parked in Turns 1 to 4.
