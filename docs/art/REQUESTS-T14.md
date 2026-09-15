# Art requested by Turn 14

For GPT, on `art/sprites`, PNG in `public/sprites/`, with alpha. Written by the code side on
15.09.2026 from CLAUDE.md T14 section 8. Nothing in this file changes `docs/art/SPRITES.md`, which
stays the contract for canvas, anchor and style; the office canvas is the one of its section 8.1.

The game lights a thing in the office when the pointer is on it and names it (CLAUDE.md T14 2.2).
The laptop has a layer of its own (`officeLaptop.png`), so it glows in its own shape. The door,
the two wall boards and the binder are painted into layers they share with other things, so they
get a soft light spot until the files below land.

## 1. The door, lit

**`officeDoorLit.png`**: the office door alone, on the office room canvas (1672 by 941, the same
frame as `officeBackground.png`, aligned at the origin), painted as if lit from inside, everything
else transparent. The code lays it over the room while the pointer is on the door and nothing else
changes: the file goes through the same manifest check every sprite goes through
(`npm run sprites:manifest`), and the door keeps its light spot until the file is there.

## 2. The boards and the binder, lit (optional)

The same for the two wall boards and the binder, if cheap: `officeWorkPlanLit.png`,
`officeOrdersLit.png`, `officeBinderLit.png`, each the one object alone on the office canvas, lit,
everything else transparent. Optional; the light spot covers them until then, and the code side
adds each one to the same overlay table when it lands.
