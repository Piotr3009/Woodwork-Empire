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

**T21-A2 Phase A: the state, the tiers, the monthly wage, the money, the bubbles and the cabinet.**
Section 3's list, in one commit, plus the three things it takes to leave the tree green. What phase A
owns, and what it deliberately left to phase B, is written out task by task below.

*The tiers and the pay (the constants half of 2.9 and 2.10).* `TIER_WORDS` now reads no experience,
experienced, **very experienced**, **excellent**; Turn 20's "super experienced" and "extremely
experienced" were Claude's words and are gone. `WORKER_RATES` is **0.6 / 0.8 / 1.0 / 1.2**, one step
down the ladder from Turn 20's 0.8 / 1.0 / 1.2 / 1.4. `weeklyWage` is gone from `Worker`,
`HiringOption` and `HiringSpec` and `monthlyWage` is back in its place; `JOINER_MONTHLY_WAGE_EXPERIENCED`
is 2,600 and `TIER_WAGE_FACTOR` lands the ladder exactly on Piotr's 1,950 / 2,600 / 3,500 / 4,330.
Every other role's monthly figure is the one its own Turn 20 comment already named, brought back out
of the comment and into the constant: estimator 2,600, sprayer 2,700, draftsman 2,400, production
manager 3,400, office admin 1,900, purchasing clerk 1,700, salesman 2,200. `WEEKS_PER_MONTH` is
deleted; `WORKER_HOURS_PER_MONTH` (171.43) and `WORKER_MINUTES_PER_MONTH` (10,285.71) replace it
where a month of a man is really wanted, and `WORKER_MINUTE_RATE_DIVISOR` is the second of those, so
an experienced joiner's informational minute moves from 25p to 25.3p and no further. The payroll runs
on `isLastWorkingDayOfMonth` with the ledger line `Monthly wages`.

*The money (the constants half of 2.2 and the whole of 2.4).* `BANKRUPTCY_OVERDRAFT_MULTIPLIER` is
gone and `BANKRUPTCY_LIMIT_FACTOR` (1.5) and `BANKRUPTCY_DAYS_BELOW_LIMIT` (30) are in;
`bankruptcyFloor` reads the new factor, which makes the line -15,000 on very easy and easy and -7,500
on hard. `dropReputationCost(job)` is the one function the drop and its card both read: ten points,
a point a thousand over five thousand, times 1.5 for a commercial client, capped at fifty, and
`dropJob` charges it in place of the flat ten.

*The state (section 4).* `STATE_VERSION` 18. `state.finance.daysBelowOverdraft`, and on the owner
`idleMinutes` and `idleByReason` with `spendOwnerIdleMinute` and `emptyOwnerIdle` beside
`spendOwnerMinute` in `src/engine/owner.ts`; the morning empties both. `liftToVersion18` lifts every
v29 save: the weekly wage becomes the monthly one at the conversion the Turn 20 build itself printed
beside every wage, the rate is recomputed from the tier because the rate is the tier's and not the
man's, the day count starts at nought because a save cannot say whether yesterday ended under the
limit, the idle minutes start at nought because they were never written down, and every tool cabinet
is laid out again.

*The bubbles (the table half of 2.6).* `BUBBLES` is one table of twelve lines, each a line of the
table in `docs/mockups/t21/bubbles.html`, with `{slot}` placeholders the renderer fills and a tone
that is the colour. `BUBBLE_WORK_SECONDS` 3, `BUBBLE_WORK_MAX_SPEED` 4, `BUBBLE_HEAD_GAP` 6. The
types `BubbleKey`, `BubbleTone` and `Bubble`, and the four CSS classes.

*The drop routed to the card (2.3's plumbing).* `Drop project` no longer drops: `dropControl(job)` is
one button, the inline "Confirm drop" row is gone, and the click opens the new `dropJob` card, a
folder modal pushed over the Work Plan it was opened from, with the cross, Escape (above the modal
under it in `ESCAPE_ORDER`) and a click outside, all three of which keep the job. `src/ui/dropCard.ts`
is the card.

*The cabinet (2.13's spec and migration).* The catalogue spec is `width 2, depth 1, height 1` and
`CABINET_SLOT_LAYOUT` is respread to seven slots two cells apart. **The brief's `zone 3 by 2` is not
built**, and that is the one place phase A departs from the letter of the brief; the reason is in
section 0 and in a comment beside the spec.

*Three things phase A did that section 3 does not list, each to leave the tree green in one commit.*
The wage rename cascades through eleven source files and thirty three test files, so phase A carried
it to the point of compiling and left 2.10's own tests, copy and gate to T21-B2a. The payroll cadence
moved with the field, because a monthly wage paid every Friday is not a state worth committing. And
`renderWorkPlan` lost its `dropConfirm` argument, because the card took it.

## Look and shoot (T21-C4)

**Ten pictures in `docs/report-t21/`, and three things they showed.** Every one is the real app in
headless Chromium at 1280 by 800 at one device pixel, driven by real clicks, standing in front of
saves the game's own `encodeSaveFile` wrote and its own Continue button opened, with the clock
stopped by the game's own Pause (the knob on the bar, and the P key where a modal covers it). The
halls are played, not written: the money ones are the (hh) evening of
`tests/scenarios/turn21.test.ts` played again, the crew one is the control run of (gg) with a
helper and an office admin on the books, and the day meter's is a played day 12 of a careful
company. What was arranged by hand is listed at the foot of this section. The staging is in the
scratchpad and nothing of it is committed.

### What the pictures showed was wrong, and what was done about it

**1. The owes plate burst out of the top bar.** This is the one that mattered. `.owes-plate` was a
flex item that could give way and whose text could wrap, so on a 1280 bar it was squeezed to 103 px
wide, its two lines wrapped to four, and the plate grew to 110 px against the bar's 70: it started
20 px above the bar, ended 20 px below it, "bailiff in 2" was behind the warning strip and the cash
plate beside it broke `-£7,259` with the minus sign on a line of its own. The bar is a row of
plates and the money and the debt are not the ones that give way: both plates are `flex: none` now
and the owes plate is `white-space: nowrap`, so it stands 212 by 53, exactly the height of the cash
plate beside it, with `owes £25,000` over `arrears, 1 month · bailiff in 2`, which is the drawing.

**2. `Drop it anyway` was not red.** The second click of a drop is the one red button in the game
(2.3, and `.btn.red` in the drawing), and it came out cream with green ink like every other button
on paper. The same class of fault Turn 20 found three times: the folder skin's own button rule,
`.modal-folder button:not(.chip):not(.modal-close)`, is three classes and an element against
`.btn-danger`'s one class, so the skin won on weight. One rule under the skin's own `.primary` rule
puts the red back, in the palette's `--bad`, which is the drawing's own `#c05a4e`; the board skin
has kept its `is-danger` red this way since Turn 17.

**3. The bank's card was cut in half by the fold.** The bankruptcy event took the small folder, and
a head, a date line, a reason, four figures and the epitaph do not fit it: the last line read "You
kept the workshop 10 working days, took £0 in orders and built 0 of" and then the paper ended. The
card joins the day end and the month end on the middle folder size, which is where the machine card
already sits, and the whole of it is on the paper with the two buttons under it.

### The ten, what each shows, and what it was put beside

| # | File | What it shows | Put beside | What differed |
|---|---|---|---|---|
| 1 | `01-topbar-owes-and-warning.png` | The red tile between the cash and the speed knobs, `owes £25,000` over `arrears, 1 month · bailiff in 2`, and under the bar `Account below zero and £25,000 in arrears: together -£32,259, past the -£15,000 the bank allows. Pay the arrears or the bank closes you.` | the same bar with the arrears cleared, and part 1 of the drawing | finding 1, and the crowding below |
| 2 | `02-drop-card-small-job.png` | The drop card on a £3,000 job: the deposit at -£1,500, the material at -£1,200, the reputation at -10, `£36,235 of -£10,000 overdraft` in green, no red box, and the two buttons | the machine card, which is the same folder and the same shell | finding 2 |
| 3 | `03-drop-card-closes-you.png` | The same card on the £50,000 job with £7,000 in the bank: -£25,000, -£20,000, -50, and the red box `You cannot pay the deposit back. It goes to arrears: -£18,000 against the bank's -£15,000 limit. Dropping this job closes the company today.` | part 2 of the drawing | finding 2 |
| 4 | `04-the-bank-has-closed-you.png` | The bank's card at the close of the day the job was dropped: the four figures (£6,693, -£25,000, -£18,307, -£15,000), the date and the reason, the epitaph, `Start again` and `Load a save` | part 3 of the drawing, and the day end card it shares its size with | finding 3 |
| 5 | `05-four-bubbles.png` | The hall at 08:00 with four colours up at once: red `waiting for the saw` and `no cut parts yet` at the saw, paper `assembling Garage shelves`, green `sweeping` over the helper at the extractor, and dashed grey `in the office` at the office door | `docs/mockups/t21/bubbles.html` | the two reds overlap, below |
| 6 | `06-day-meter-with-the-idle.png` | The meter reading `243 worked · 157 idle · 540`, the bar with two green runs and a blue one and then the grey, and the hover plate behind the grey listing the seven worked bands and the four reasons he stood, `Nothing assigned 157 min` | the v29 meter, which said `243 worked · 540` and painted no grey | nothing; 2.8 does what it says |
| 7 | `07-hire-cards-four-tiers.png` | The four joiner classes in Piotr's words: no experience £1,950 a month at 60%, experienced £2,600 at 80%, very experienced £3,500 at 100%, excellent £4,330 at 120% with `excellent joiners come from reputation 60` where its Hire button would be | the Turn 20 cards, which read 0.8 to 1.4 and printed a week | nothing; 2.9 and 2.10 |
| 8 | `08-our-team-monthly-pay.png` | Our team, six rows: the owner at £4,286 a month, three joiners at £1,950, the helper at £1,800, the admin at £1,900, each with the week under him | the Turn 20 page, which printed `£450 a week` | nothing; the week in brackets is gone |
| 9 | `09-canteen-door-at-lunch.png` | 12:25, not one figure on the hall floor, and a dashed grey `at lunch` at the canteen door | the same hall at 08:00, picture 5 | nothing; 2.12 |
| 10 | `10-tool-cabinet-two-cells.png` | Four tool cabinets beside four benches, each cabinet drawn at the width of the bench and the saw beside it | the v29 hall, where the sprite overhung a 1 by 1 spec | nothing; the cabinet's sprite box is 80 units wide, the same as the saw's and the bench's, against 56 for the one cell extractor and compressor |

### What the pictures showed and was left alone, with the reason

- **The bar is wider than 1280 while the tile is up.** Its blocks come to 1,466 px with the owes
  plate on it and the bar had 27 px of slack at 1280 before tonight, so `Office` and `Menu` are
  pushed past the right edge and the page reads a `scrollWidth` of 1,452. It cannot be tuned away:
  for the bar to fit, the day meter's 340 px minimum would have to fall to about 160, which is
  narrower than `243 worked · 157 idle · 540` on its own, and the stylesheet has no media rule
  anywhere in it to hang a narrow arrangement on. A tile the section asks for, a bar that was
  already full, and no room: it is Piotr's to say whether the second line shrinks, the meter gives
  way or the bar wraps.
- **The three costs on the drop card are red and only the account is green.** The brief says a
  small job shows the card "with green figures"; a deposit handed back and material written off are
  money out, and `signedFigure` paints money out red everywhere in the game. `docs/notes-t21-b1.md`
  tagged the reading [TUNE] and put the question to Piotr; the picture is how it stands.
- **The bank's card says "took £0 in orders" for a company whose one order was £50,000.** The
  epitaph counts the jobs on the books and a dropped job is off them. Carrying a dropped job's price
  to the end wants a new field on the state and a second `STATE_VERSION` bump, which tonight forbids.
- **Two bubbles over two men at one machine overlap.** A bubble is as wide as its words, four to six
  cells of hall at the opening zoom, and two men queueing at one saw stand on neighbouring cells, so
  the nearer man's paper covers the further man's. 2.6 gives the bubbles a depth sort and no rule
  about moving one out of another's way, and the hall's own name labels have sat on top of each
  other since Turn 9 (Turn 20 recorded the same of the machine labels). A nudge rule is a new rule.
- **A bubble sits about 30 screen pixels over the head, not 6.** The 6 is `BUBBLE_HEAD_GAP` in the
  figure's own local space, over `characterTop`, which is the crown the delivered sheet declares;
  the camera scales the gap with everything else. The tail points at the man and the picture reads.
- **Two hall labels sit on top of each other** where two hand tool sets stand together. Older than
  tonight, and recorded in Turn 20's report.
- **"Assigning" has no colour in the meter's hover plate.** `.seg-assigning` is not in the
  stylesheet and was not there on main either; every other band has its own.
- **No hire card in picture 7 carries a Hire button.** That hall is `Crew 5 / 5, floor limited`, so
  each card prints the floor's refusal where the button would be, which is what the game does with
  every control it will not give. The excellent joiner prints its standing instead, which is 2.9.
- **Picture 9's strip says the owner is out at a client meeting** while his men are at lunch. Both
  are true of that minute, and what the picture is of is the empty floor.

### What was arranged rather than played

The opening days, the kit, the crew, the drawings, the take offs, the orders, the lorries and the
work are all the scripted player's, and every click in the browser is a real one. Four things were
written onto a played state, each the way the scenarios of section 3 write theirs:

1. **The cash in the money halls**: £7,000 for the drop of the fifty thousand pound job and -£7,259
   for the top bar, which are Piotr's own two figures of 18.09. `IN_THE_BANK` in
   `tests/scenarios/turn21.test.ts` writes the first of them for the same reason.
2. **The two jobs of the crew hall**, put on the books at the end of the played opening days with
   round prices, and each set to a chosen point of its own making (`labourRemaining`), which is how
   every scenario since Turn 13 puts a job at a stage.
3. **The standing of 40** on day 1 of the crew hall, so the company may take an office admin on
   (he wants 5) and may not yet take an excellent joiner (he wants 60), which is the hire card the
   picture is of. The hiring itself is the player's own `HIRE` through the engine's own gate.
4. **Nothing else.** The arrears of picture 1 and the closure of picture 4 were both earned by
   clicking the red button on the card and letting the day close.
