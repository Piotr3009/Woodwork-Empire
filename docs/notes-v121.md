# Notes from v121: a figure past a machine moves the figure, never the machine

Built in chat on 19.10.2026 on v120 (STATE_VERSION 53, unchanged). Piotr, after v120: "you fixed
the houses and they still disappear and blink like mad".

## 1. What it was

Measured in Chromium on the factory at 1x: about once a game minute a station's `<g>` was taken out
of the hall's live layer and put back (six times in five seconds), as its ten engineers walked past
it. The page of every minute is patched into the layer (`src/ui/patch.ts`, v104), its drawables
matched by what they are drawn for and the order brought into line by the longest run of nodes
already in order; when an engineer had passed a station since the last page, the run as often kept
the engineer and moved the station. An SVG `<image>` moved out of the document and back fetches and
decodes its picture again: for a module of a window line a flash too short to see, for a station
of the house factory, five million pixels, a blink the eye sees, at every speed. The same thing,
smaller, is the lines' blink Piotr saw before v104 and still saw now and then ("the same problem
as all the lines, only much more often").

## 2. The fix (`src/ui/patch.ts`)

The figures, the engineers, the forklifts and the men (`MOVABLE`: `data-engineer`,
`data-forklift-line`, `data-figure`), are never counted in the run that stays: they are put where
they belong around the kit, and a machine moves only when the machines themselves change order.
Measured again, the same run: no station moved in five seconds at 1x, 10x or 100x; the frames'
href changes are the only writes, from the blobs of v120.

## 3. Tests

`tests/ui/v121Patch.test.ts` (3): the engineer moved and the station kept, both ways; every kind
of figure moved round the kit that stays; a machine still moved when the machines change order.
v104's seven patch tests unchanged and green. `APP_VERSION` v121.
