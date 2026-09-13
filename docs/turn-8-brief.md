# Turn 8: deliveries you can see, a clock you can skip, and a version in the corner

Woodwork Empire. Autonomous session brief for Claude Code (Opus 5, effort ultracode, cloud).
Owner: Piotr. Programmer: Claude. Spec author: Claude (chat), 13.09.2026, from Piotr's play of
Turn 7 and the two chat fixes of 13.09.

Read this whole file (first line must say "Turn 8"; if the root `CLAUDE.md` does not, stop and
report), then `docs/art/SPRITES.md` in full, then `REPORT-T7.md`, then the archived briefs in
`docs/`. Where files disagree, this one wins. All standing rules apply (no em or en dashes, scope
1:1, one code path, constants never in the UI, retag `[TUNE]` to `[PIOTR]`, kill background
processes, PR without merge, end the session, no PR watching, `npm run check` gated on its own exit
code).

Scope note: compressed air and extraction capacity (bar, l/min, m³/h, under-extraction) are
**Turn 9** and are not started tonight. The five extraction and compressor classes stay data for
Turn 9 too: tonight the loader shows `extractor.standard`, `compressor.standard`,
`dustSystem.standard`, `flexiSystem.standard` and `pelletiser.standard` when the files exist, and
nothing else changes about them.

---

## 0. What this turn is for (Piotr, 13.09)

1. "Always a version number in the corner, v10, v11, v12, bumped with every change." (3.1)
2. "A shopping list somewhere on screen: every material, every piece of kit, every machine with a
   progress bar to its delivery, and what it is. The shortest time first." (3.2)
3. "Delivery times: hand tools the same day, the cheap saw next day, dearer ones 5 to 7 days, up to
   25 days, a CNC even 45. The cash leaves the moment you press Buy; the delivery comes days later."
   (3.2)
4. "The player must know: you went shopping, a counter on screen, and a button to come back fast so
   time jumps an hour." (3.3)
5. "Moving machines: click move, it says OK, this takes two hours, do you want to? Yes, drag,
   finished, and time jumps those two hours." And: "moving cabinets and benches takes no time, only
   heavy machines do." (3.4)
6. Cancel an order before it lands; sell a machine that stands in the hall. (3.5)
7. Staff overtime pay was a paper rule since Turn 1; it exists nowhere in the code
   (`REPORT-T6.md` section 2). (3.6)
8. The catalogue on the office floor is a drawn placeholder; GPT will paint one. (3.7)

State of `main`: Turn 7 plus chat fix 1 and chat fix 2 of 13.09 (cash at the click, one click one
machine, clock starts on the catalogue and the laptop, full page tiles, Office tab first, Owned as
tiles with category sub tabs, laptop booting once a day, the move that always ends). 736 tests
green, `STATE_VERSION` 8.

---

## 1. Rules restated (short)

Everything from Turns 1 to 7 and both chat fixes. Tonight in addition:

- **`APP_VERSION` is a constant, shown, bumped by every delivery.** This turn sets it to `v10`. A
  test asserts the corner shows it; the audit checks it was bumped.
- **A purchase is three separate things:** the cash (leaves at the click), the trip (the owner's
  minutes, as in Turn 7) and the delivery (days by class, this turn). None of them waits for
  another.

---

## 3. Changes to the design (the contract)

### 3.1 The version in the corner `[PIOTR]`

`APP_VERSION = 'v10'` in `constants.ts`, the only place. A small text in the bottom right corner of
every screen (start screen included), muted, never covering a control. Test: the corner shows the
constant; a grep test that the string `v10` appears in no other source file (one path).

### 3.2 Deliveries by class and the shopping list `[PIOTR]`

- Every equipment class carries `deliveryDays` `[PIOTR: bands]` `[TUNE: exact values]`:
  hand tools, cabinets, lockers, seats, desk, chair, laptop, software: 0 (they come back with the
  owner from the trip, as today); table saw used and budget 1; standard 5; pro 7; industrial 12;
  workbench all 1; racks used and budget 1, standard 3, pro 5, industrial 10; hand edgebanders 0;
  floor edgebanders 7, 12, 20; extractor 1; thicknesser and solid wood tools 5; spray booth 20;
  dust system and flexi system 25; pelletiser 20; CNC 45 `[PIOTR: even 45]`; CNC head 20; forklift
  5; van 3; compressor 1.
- Material orders keep their Turn 1 timing (next working day, bespoke three days) and appear on the
  same list.
- An order with `deliveryDays > 0` is booked as an **on-order item** when the owner's trip lands
  it (the trip is unchanged): the cash left at the click (chat fix 1), the item is not in the hall,
  and its cell zone is **reserved**: a grey outline of its footprint and zone is drawn on the hall at
  its default place, `canPlace` treats the zone as taken, and setup mode can drag the outline like a
  machine. Delivery lands at 08:00 on the due working day as a `deliveryArrived` event for equipment
  (the same event and unloading choice as material; heavy machines need the forklift or 120
  minutes by hand `[TUNE]`; furniture and hand tools need nobody). Unloaded, it stands on its
  reserved cells.
- **Shopping list:** a panel reachable from the top bar ("Orders: 3") and from a wall pin board in
  the hall view (a small board drawn beside the office door, clickable), listing every on-order item
  and every material order: name and class, price paid, ordered day, due day, a progress bar from
  order to due, "arrives tomorrow 08:00" style text, and Cancel where allowed (3.5). **Sorted by
  time to delivery, shortest first** `[PIOTR]`. Empty: "Nothing on order." The list opens on a
  stopped clock (it is reading).
- The Owned tab shows on-order items in their tiles with the same progress bar and "On order, due
  day 14".
- Tests: a used saw ordered on day 1 lands on day 2 at 08:00 through the event; a CNC ordered on
  day 1 lands 45 working days later; a cabinet lands with the trip; the reserved outline blocks
  placement and is movable in setup; the list sorts shortest first; a material order and an
  equipment order sit on one list.

### 3.3 The owner is out `[PIOTR]`

- One component "Owner is out: <what>, <n> of <m> min" shown at the top of the hall and the office
  views (under the top bar) whenever the owner's current task is a trip (shopping, hiring
  interview), a site measure, a client meeting or a move of the hall. With a **Skip ahead** button:
  the clock runs at 4x automatically until that task ends, the speed chips are locked meanwhile,
  then the previous speed returns. Events still pause it; the day still ends at 17:00 as usual (if
  the task is not done, it resumes tomorrow and the component says so).
- The catalogue's "Shopping: 42 of 60 min" line stays inside the modal; the component is the same
  fact outside it (one selector for both).
- Tests: the component appears on a trip and not otherwise; Skip ahead forces 4x until the task
  ends and restores the speed; a trip cut by 17:00 resumes at 08:00 with the counter continuing.

### 3.4 Moving the hall `[PIOTR]`

- Entering setup mode is free. Leaving it with **heavy** items moved (any class of table saw, floor
  edgebander, thicknesser, solid wood tools, CNC, spray booth, extractor, dust and flexi systems,
  pelletiser, compressors above budget `[TUNE list]`) asks first: "Moving 2 machines takes 2 h and
  1,600 of ducting. Do it?" with Do it / Put them back. Put them back restores every moved item to
  where it stood.
- Light items (benches, racks, tool cabinets, lockers, seats, the floor catalogue, budget and used
  compressors) move for **no time and no money** `[PIOTR]`; they are simply where the player dropped
  them when he clicks Done.
- **Do it** books the move as today: cash for ducting, the move task. Then the clock **skips** to
  the end of the move at once (the Turn 4 forced 4x is replaced by the 3.3 Skip ahead run at the
  fastest the loop allows, so the player sees the day advance rather than a frozen screen); if the
  move runs past 17:00 the rest is done tomorrow morning and the toast says "Finished tomorrow by
  09:30". Production waits during the move as before.
- Tests: two saws moved ask for 2 h and 1,600; a bench moved asks nothing and costs nothing; Put
  them back restores positions; Do it lands the move and the clock is past it; a move past 17:00
  finishes next morning.

### 3.5 Cancel and sell `[PIOTR]`

- **Cancel order:** on the shopping list and on the on-order tile, until the delivery day (any
  time before 08:00 of the due day): full refund to cash, the reservation released, the ledger line
  "Order cancelled: <name>". One click.
- **Sell:** in the Owned tab on a machine standing in the hall: "Sell for <price>", price = 50% of
  the purchase price `[PIOTR]`, used class 35% `[TUNE]`. Confirm inside the tile (a second click on
  "Confirm sale"). The machine leaves the hall the next working day at 08:00 (a van at the gate; no
  unloading, a `machineCollected` event of one choice) and the cash arrives then. Until then it is
  marked "Sold, collection tomorrow" and no longer works. A machine that is taken (someone on it),
  broken or on order cannot be sold; the reason shows.
- Tests: cancelling on day 3 of a 7 day delivery refunds in full; a sale at 5,000 pays 2,500 the
  next morning and removes the machine; a taken machine refuses.

### 3.6 Staff overtime pay `[PIOTR: Turn 1 rule]`

- Staff may work 17:00 to 19:00 when the owner stays for overtime (Turn 6): each joiner and helper
  present works up to 2 hours at 1.5x his hourly wage (weekly wage / 40 `[TUNE]`), paid in the
  Friday wages line as "Overtime". Office staff do not.
- Above 2 hours in a day a worker refuses (he goes home at 19:00 anyway). A worker asked for
  overtime on 3 consecutive days has his morale reduced: `[TUNE]` a flag that adds 5% to his chance
  of quitting at the month end `[TUNE]`, shown in the Team tab as "Tired of overtime". Quitting
  itself: a `workerQuit` event on the 1st, the worker gone, a hiring slot free.
- Tests: two joiners on one overtime evening add 2 × 2 h × 1.5 × rate to Friday's wages; office
  staff add nothing; three evenings set the flag.

### 3.7 The floor catalogue picture

- The office's floor catalogue (chat fix / Turn 7 3.8) gets a `spriteKey` `catalogueFloor` and goes
  through the loader like a machine: PNG when the file exists (canvas per the office layers: a
  region on the 1672 × 941 office canvas, x 60..500, y 700..900, drawn scaled with the stack),
  placeholder otherwise. GPT is asked for the file separately; nothing to paint tonight.
- Test: with a file in the manifest the region renders an image; without, the placeholder.

---

## 4. Task queue, in order

Branch `turn-8-deliveries` from `main`. One commit per task, `npm run check` green on its own exit
code before each, two report lines per task.

**T8-01 Housekeeping and the version.** `docs/turn-7-brief.md` from git history (the root CLAUDE.md
as of the PR #8 merge); `APP_VERSION = 'v10'` and the corner text. Done: the version tests.

**T8-02 Delivery days and on-order items.** 3.2 engine side: class field, on-order state, reserved
zones, the delivery event for equipment, unloading rules. Done: the delivery tests.

**T8-03 Shopping list.** 3.2 UI side: the panel, the top bar count, the pin board, the sort, the
Owned tile bars. Done: the list tests.

**T8-04 Owner is out and Skip ahead.** 3.3. Done: the tests.

**T8-05 Moving: confirm, light items, skip.** 3.4. Done: the tests; the Turn 4 forced 4x replaced
by the Skip ahead run (one path).

**T8-06 Cancel and sell.** 3.5. Done: the tests.

**T8-07 Staff overtime pay.** 3.6. Done: the tests.

**T8-08 Floor catalogue slot.** 3.7. Done: the test.

**T8-09 Scenarios.** Update the eleven months for deliveries (the starting kit now arrives on day 2
for the saw, the rest with the trip) and for the move skip; add (l) a month that orders a CNC on
day 1, cancels it on day 10 and asserts the full refund, and (m) a month that sells the used saw on
day 5 after buying a standard one and asserts 900 the next morning.

**T8-10 Report and PR.** `REPORT-T8.md` in the usual structure plus "Delivery days chosen" (every
class with its days, `[PIOTR]` or `[TUNE]`). Kill background processes, push, PR titled
`Turn 8: deliveries you can see, a clock you can skip, and a version in the corner`, do not merge,
end the session.

---

## 5. Do not (tonight)

1. No touching `docs/art/SPRITES.md`, `CLAUDE.md`, the archived briefs, or the sprite files.
2. No compressed air or extraction capacity; no new classes for extractors or compressors.
3. No sprites in code, no placeholder PNGs.
4. No PixiJS, sound, mobile.
5. No persistence changes other than `STATE_VERSION`.
6. No watch loops, nothing left running.

---

## 6. Parked

1. Turn 9: compressed air and extraction capacity with Piotr's tables; five classes of extractors
   and compressors as data.
2. House 100 k and villa 500 k templates, 180 degree view, movable rooms, rates and power for 200 m².
3. Worker morale beyond the overtime flag.

End of brief.
