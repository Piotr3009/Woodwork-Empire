# Art request P4-B: the timber frame house factory, the game's files

Woodwork Empire. Written 19.10.2026 (Claude, chat) for the art side, from Piotr's word on the
concept P4-A (`Woodwork-Empire-P4-A-cala-linia-2026-10-18.zip`): "masz grafikę, jedyne co GPT zrobił
odwrotnie to strona deliver zrobionego domu", and "5 tak zakoduj" to layout A. The game has the
factory from v114, each station drawn as a plain box until these files land; when they land, the
game draws them with no code (the keys below are the ones it already asks for).

Read docs/art/SPRITES.md sections 1 to 3 (the canvas, the anchor, the camera, no floor, no shadow)
and 19 (the door line, the nearest delivery to this one). Every figure here is the game's own,
worked out by its code (`spriteFileSize`, `spriteAnchorIn`), not by hand.

## 1. What changes from P4-A

Layout A stays as drawn: six stations of 14 m by 10 m under gantry cranes 10 m high, end to end
along x, 84 m, station 1 at the left (small x) and station 6 at the right; the house built on its
all wheel steered transporter, one stage a station (01 floor, 02 frame, 03 services and insulation,
04 roof, 05 finishing, 06 inspection and handover).

**One change [PIOTR]: the finished house is delivered towards the gate, not away from it.** The
gate is in the left wall of the hall (x 0). In the game the finished house drives out of station 6
sideways into the lane in front of the line, then along the lane **towards x 0**, and waits at the
lane's left end for the housebuilder. So:

- no transfer apron at the right end (P4-A's 12 m plac transferowy) and no reserve for a second row:
  a second factory is bought as another line and the game puts it where the hall has room;
- the transporter of the waiting house faces and travels towards **minus x** (the left, the gate);
- no arrows, labels, numbers or floor markings in any file: the lane, its yellow outline and the
  labels are drawn by the game.

What the game draws in front of the line, for reference only (not in the files): a 1 m walkway
where the ten engineers walk, then the 10 m lane from the left wall to the line's end.

## 2. The files

All PNG, RGBA, transparent background, the game's camera of P4-A (`sx = ox + 48(x - y)`, `sy = oy +
24(x + y) - 48z`, 48 by 24 px a metre), no floor, no cast shadow on the floor, no lettering. Each is
rendered, never mirrored.

| Files in public/sprites/ | What they are | Box, metres w x d x h | File, px | Anchor, px |
|---|---|---|---|---|
| `houseLine1.standard.png` to `houseLine6.standard.png` | the six stations, view 0, each with its own stage's house on its transporter as in P4-A | 14 x 10 x 10 | 1,168 x 1,072 | 680, 1,064 |
| `houseLine1.standard.r.png` to `houseLine6.standard.r.png` | the same six, view 90, the game's own turn `(x, y, z) -> (y, w - x, z)` | 10 x 14 x 10 | 1,168 x 1,072 | 488, 1,064 |
| `houseWaiting.standard.png` | the finished house standing alone on its transporter, view 0, facing minus x | 10 x 7.5 x 5.5 | 856 x 700 | 488, 692 |

The anchor is the pixel of the box's front bottom corner (x = w, y = d, z = 0), 8 px of padding on
every side (SPRITES.md 2). The waiting house's box is P4-A's transport envelope: the deck 10 m by
7.5 m and the house on it up to 5.476 m (`QA-line.json`, "House contact and actual transport
envelope").

## 3. How the six join

- **Each file holds everything of its own box and nothing outside it**: 0 to 14 m along x, 0 to
  10 m deep, 0 to 10 m high, in the station's own metres. The game sorts each station as one
  picture among the hall's drawables; anything painted outside its box can be overdrawn by its
  neighbour.
- **The runway beams and rails are cut at the station boundaries**, so the six files side by side at
  a 14 m pitch make P4-A's continuous runway. A column standing on a boundary belongs to the station
  on its right, at its x = 0, so it is drawn once; station 6 also holds the end frame at its
  x = 14.
- The consoles stay inside the bays as P4-A moved them (y up to 9.9).
- The house on each station's transporter is P4-A's stage house; station 6 shows the finished house
  being signed off. The work in progress is part of the picture and the same at every hour.

## 4. Not asked now

A working motion (the cranes moving) as sheets, and the transporter driving along the lane, are not
asked: the game draws the stations still and the house appears at the lane's end. They can come
later as their own order.

## 5. Delivery

As P1 to P3: the game files in a folder named as the table, their checksums, a README with the
measurements, and the masters, models and sources in the ZIP. Marked PODGLĄD until Piotr accepts,
FINAL with the same bytes after. Chat checks every size and anchor against the table and every
checksum before a file enters the repository, and alters no pixel.

## 6. Acceptance (Piotr and Claude)

1. Fifteen files, each exactly the size in the table, RGBA, the anchor where the table puts it.
2. The six side by side at a 14 m pitch read as P4-A's one line: the runway continuous, no gap, no
   doubled column.
3. The waiting house faces the gate (minus x).
4. No floor, no shadow on the floor, no arrows, no labels, no numbers, nothing mirrored.
