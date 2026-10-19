# Notes from v118: the house factory's lane along the line alone

Built in chat on 19.10.2026 on v117 (STATE_VERSION 53, unchanged). Piotr, with a 172 by 36 m hall
whose free floor lay along the front but not at the gate wall, and the factory refused: "that
condition that it has to be near the gate is silly"; "do nothing else, change only that condition".

## 1. The one change (`lineGround`, `src/engine/layout.ts`)

A line of the `lane` collection (the house factory) has its lane along the line alone: from its
first station's x to its last station's end, ten metres deep in front of its engineers' metre.
Until v118 it ran from x 0 to the line's end, as a window or door line's forklift lane does (v93), so
the factory could stand only where the floor was clear all the way to the gate wall. The forklift
lanes of the window and door lines are as they were: their forklift drives the pallet to the gate.

What a house factory needs now: one clear block of **84 by 22 m** anywhere in the hall (84 by 21 at
the rear wall, where it has no metre behind), off the rooms and the way to the gate, with nothing
standing in it but the lanes of other lines, which may cross its lane. The finished houses wait at
the lane's gate side (left) end as before, which is now the line's left end.

## 2. Pins

`tests/engine/v114House.test.ts`: the ground of the factory at (5, 0) has `front` at x 5, width 84
(was x 0, width 89), one line of reason. `APP_VERSION` v118. Every lane test of the window and door
lines (t31Lane, v93Lines, v94Lanes) unchanged and green.

## 3. Left for Piotr (said the same evening)

The player is told nothing of the block a line needs beyond `No room in the hall for the line and
its lane`: a refusal that names the block and what stands in the way, and the block drawn on the
hall, are on offer as a turn. The texts, when they come, say "the wall with the exit gate", not
"the left wall" [PIOTR, 19.10].
