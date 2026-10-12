# Notes from v94: the engineers in red shirts, and the line given its lane

Built in chat on 12.10.2026 on main at v93 (STATE_VERSION 45). Piotr: "the same picture, only the
shirts red, no sense waiting for a new picture"; and "at the existing line I see no lane and no
forklift, at the new one I do".

## 1. The engineers in red shirts

- `scripts/engineer-shirt.py` makes `character.lineEngineer.idle` and `character.lineEngineer.walk`
  from the joiner's sheets, the green of the shirt red, as `scripts/manager-shirt.py` makes the
  manager's white (SPRITES.md 10.8).
- `src/render/engineers.ts`, the renderer's as the forklift is: for every line whose module 1
  stands, as many engineers as are on duty for it (`lineEngineersOnDuty`, two at the most, line 1
  first) walk the middle of the metre in front of it, from half a metre in at module 1's end to half
  a metre in at module 6's and back, at the walk pace of the floor (`walkPace`), the first starting
  at module 1 and the second at module 6, 0.22 m either side of the middle so they pass side by
  side. On a working day until the crew goes home. A line with no lane has its metre all the same,
  and its engineers walk it.
- The hall draws them (`engineersArt` in `hallScene`, marked `data-engineer="line:index"`, no
  click); `stepEngineers` in `runFrame`, `syncEngineers` after every page written, and
  `resetEngineers` wherever the forklift is reset.

## 2. A line given its lane (STATE_VERSION 46)

- A line placed by Turn 30 stands at y 15 of the 800 m² hall, where its lane cannot be: no yellow
  lines and no forklift, the strip saying to move it back. The lift to 46 changes no shape; the
  whole state step `giveTheLinesTheirLanes` moves each standing line with no lane to the nearest
  row along its own x where it fits with its lane and its ground, no more than three metres
  (`LANE_LIFT_MAX_ROWS`), free and with no hours booked, the men at it with it. A line on order in
  its way (the second line ordered while the first had no lane takes y 8) is moved to the nearest
  place of its own; if it has none, nothing is moved. One card, `lineMoved`, says what moved.
- A line that could not be moved stays, and the strip now names what is in the way of the place
  where it would have its lane: `Line 1 stands too near the front wall for its lane: move it back;
  in the way: the sheet rack` (`laneTarget`, `inTheWayAt`).
