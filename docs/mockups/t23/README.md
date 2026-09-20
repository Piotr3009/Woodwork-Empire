# Mockups for Turn 23

- `canteen-view-concept.png`: the art side's concept of the basic canteen (20.09.2026): a 2 by 4 m
  room, kitchenette at the far end, two locker banks of four compartments each (eight doors), a
  small table with two stools, a clear aisle on the right. Piotr approved the concept on 20.09
  ("zatwierdzam"). It is a concept picture, not a layer: the room view of 2.9 is built with the
  office view's machinery and its flat placeholders until the five layers land. Nothing in the
  room is drawn by an agent.

The instruction Piotr sent the art side for the layers (copy into docs/art/REQUESTS-T23.md):

Same contract as the office room (SPRITES.md 8): a full screen photoreal room seen from the
doorway, one canvas 1672 x 941, layers aligned at origin, stacked in order:
1. canteen-background.png (RGB opaque): walls, floor, door frame and open door, window.
2. canteen-kitchen.png (RGBA): worktop, kettle, microwave with its shelf, fridge.
3. canteen-lockers.png (RGBA): two banks of 2 by 2, eight closed green steel doors, a blank
   label plate on each door for the game to print a name.
4. canteen-table.png (RGBA): table and two stools.
5. canteen-lockers-lit.png (RGBA): layer 3 painted as if lit, for hover.
6. canteen-preview.png: the stack composited, review only.
Plus canteen-regions.json in canvas pixels (x, y, w, h): door, lockers, kitchen, table, an array
of EIGHT plate rectangles in reading order, and a counter rectangle above the lockers of at
least 420 x 60 px for "5 of 8 lockers in use". Real alpha, no baked text, no people, no brands,
same style as office-background.png. Delivery names are renamed to canteenBackground.png,
canteenKitchen.png, canteenLockers.png, canteenTable.png, canteenLockersLit.png in the repo.

- `team-cards.png`: Our team as tiles and the person's card (2.13), approved by Piotr on 20.09
  ("wygląda dobrze"). Portraits are the idle frames of the character sheets; the bar is the day
  meter of Turn 21; every figure on it is one the game already counts.

- `machine-card-spec.png`: the specification under the rule of a machine's card, built in v35
  (20.09) on Piotr's "koduj"; kept here as the record of what was approved. 2.15 adds the gate
  line to that block.

- `canteen-room-delivered.png` and `canteen-regions.json`: the art side's five layers of the
  canteen room (20.09), composited for review, and their regions, plates and counter in canvas
  pixels. The layers themselves are in `public/sprites` under the keys of 2.9; the JSON is the
  source of `CANTEEN_REGIONS`, `CANTEEN_PLATES` and `CANTEEN_COUNTER`.
