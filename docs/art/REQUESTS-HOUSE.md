# Art request: the owner's home, eight tiers, and the end of the day

Woodwork Empire. Written 22.09.2026 (Claude, chat) from Piotr's ask: "exact instructions for these
illustrations: what interior it has at every level of wealth, and the end of day illustration, in
the spirit of the game." This replaces section 3 of docs/art/REQUESTS-T13.md (which asked for the
houses from outside). One series, eight pictures, one viewpoint: the room the owner comes home to.

## 1. Where the pictures live in the game

At the end of every working day the owner goes home. The game shows **one still picture** for
three seconds, or until a click, and then the day's summary (CLAUDE.md T13 3.18,
`src/ui/house.ts`). Under the picture the game prints the tier's name and one line:

> Resting at home now. See you at the workshop in the morning.

Piotr's rule for this card: "This is the only place the player sees the benefit of the hard work:
the numbers on the account turn into something he feels." So the picture has one job: make the
player want the next tier, and make the current one feel earned.

The tier is what the owner has really paid himself over the last thirty days, off the ledger,
never off a setting (`houseTierFor`). Eight tiers, eight pictures, nothing in between.

## 2. The eight tiers

The names are the game's own (`HOUSE_TIER_NAMES`), the draw is what he pays himself a working day.

| Tier | Draw a day | The game's name for it | What the picture shows |
|---|---|---|---|
| 1 | £200 | A bedsit over a shop, in the middle of nowhere | one room: bed, kettle, a sink in the corner, a window on a wet street with a shop sign below; the owner's old van parked under a street light |
| 2 | £400 | A rented flat | a small living room with a sofa bed, a TV on a box, a kitchenette through a doorway; through the window the same van, a bit cleaner, on an estate road |
| 3 | £800 | A two bed terrace | a proper front room: a real sofa, a coffee table, a fireplace boarded up, family photos; a terrace street outside, a used estate car |
| 4 | £1,500 | A semi with a garden | a lounge with patio doors; through them a small lawn, a shed, a child's bike; a newer estate car on the drive |
| 5 | £3,000 | A detached house | a big lounge, wooden floor, a real fireplace lit, a dining table through an arch; a lawn with a hedge, a mid range saloon on a paved drive |
| 6 | £5,000 | A house with a double garage | an open plan living space, kitchen island in the background, large windows; the double garage seen through the window with one door up and a German saloon inside |
| 7 | £7,500 | A house in the country | a country living room: beams, a wood burner, a long view over fields at dusk through a big window; a 4x4 and the saloon on gravel |
| 8 | £10,000 | A villa | a villa lounge: stone floor, floor to ceiling glass, a terrace with a pool lit at dusk, a valley beyond; a sports car and a 4x4 under a carport |

The ladder has to read at a glance across all eight: the room gets bigger, brighter, warmer and
better made; the window gets bigger and the view gets further; the car gets newer; and from tier 4
there is a garden. Two ends fixed by Piotr (a run down flat, a villa); the six between are [TUNE]
and this table is the tuning.

## 3. One viewpoint for all eight

The same idea as the office (docs/art/SPRITES.md 8): a room seen from the owner's own place in
it, not an isometric sprite. Here the place is **his armchair at the end of the day**. The camera
sits where his head would be, slightly above the seat, looking across the room towards the main
window. Every tier is framed the same way:

- **Left third**: a lamp lit, a side table, on it his keys, his phone and a mug. On tier 1 the
  "side table" is an upturned crate; on tier 8 it is a walnut table. The keys change with the car.
- **Middle**: the room itself, the sofa or chairs, whatever the tier has for a fireplace or a TV.
- **Right third**: the window (or the patio doors, or the glass wall), and through it the outside
  of that tier: the street or the garden, and **the car**, always visible, always the tier's car.
- **His work jacket** hangs on a hook or the back of a chair in every picture, the same jacket,
  slightly dusty: the thread that says it is the same man in every tier.
- **No people.** He is the camera. Nobody else is in the room.

Time of day is the same in all eight: **the end of the working day**, dusk outside, the sky going
from orange to blue, lights on inside. That is what makes the series the "end of day"
illustration: it is always the moment he sits down. Weather is fine dusk on every tier but tier 1,
which is wet: rain on the glass, the street light smeared in it.

## 4. Style (the game's own, from SPRITES.md 4 and 8)

Realistic, not cartoon, not pixel art, not clip art: the office room and the canteen room are the
match, a photographed looking interior re-drawn as a game picture. Colours muted and slightly
desaturated with warm lamp light against a cool dusk outside. Fine detail present but not busy.
Edges crisp, no outline stroke. **No text, no logos, no real brands, no numbers, no people.** The
car is a generic car of its class, never a recognisable model. Nothing on the walls with words on
it: pictures, not posters.

Materials read as what they are: worn laminate and damp plaster at the bottom of the ladder,
oak, stone, glass and leather at the top. The picture must not look like an estate agent's
photograph: it is lived in. A folded newspaper, a pair of boots by the door, sawdust on the jacket.

## 5. Files

| Key | File | Size | Format |
|---|---|---|---|
| `house.1` to `house.8` | `house.1.png` to `house.8.png` in `public/sprites/` | **1800 by 600 px** (the card is 900 by 300 at 1x) | PNG, RGB, opaque, no transparency |

Wide 3:1 pictures. Generate at 1800 by 600 if the tool allows; otherwise generate at 1536 by 1024
or wider and **crop a 3:1 strip from the middle**, keeping the lamp on the left and the window on
the right in the crop. Composition has to be planned for the strip: nothing important in the top
or bottom fifth of a 3:2 generation, because it will be cut.

Deliver the eight files plus one review composite (all eight stacked in tier order, any size),
which does not go into the repository.

## 6. Prompt template (paste, fill the brackets)

```
A wide 3:1 still of a living room seen from an armchair at the end of a working day, for a
realistic 2D workshop management game. The camera sits where the man's head is, slightly above
the seat, looking across the room to the main window. Dusk outside, orange to blue sky, lamps lit
inside. Left: a lit lamp on [SIDE TABLE], with keys, a phone and a mug. Middle: [THE ROOM].
Right: [THE WINDOW] and through it [THE OUTSIDE], with [THE CAR] parked in view. A dusty work
jacket hangs on [HOOK OR CHAIR]. Lived in, not staged: [ONE OR TWO SIGNS OF LIFE]. Realistic
materials, muted slightly desaturated colours, warm light inside against cool dusk outside, crisp
edges, no outline strokes. No people, no text, no logos, no brands, no numbers, no recognisable
car model. Photographic look re-drawn as a game picture, same finish as a photoreal room screen.
```

Per tier, the brackets:

1. bedsit: `an upturned crate` / `a single bed, a kettle on a shelf, a sink in the corner, damp
   wallpaper, a two bar heater` / `a small sash window with rain on it` / `a wet street at night,
   a shop sign below the window, a street light` / `an old white van, rusty wheel arches` /
   `a nail in the door` / `a takeaway box, boots by the door`.
2. rented flat: `a cheap side table` / `a sofa bed, a TV on a cardboard box, a kitchenette
   through a doorway, magnolia walls` / `a plastic framed window` / `an estate road at dusk, a
   row of parked cars` / `the same white van, washed` / `the back of a kitchen chair` /
   `a laundry rack, a plant on the windowsill`.
3. two bed terrace: `a pine side table` / `a real sofa, a coffee table, a boarded up fireplace
   with photos on the mantel, a rug` / `a bay window with net curtains` / `a terraced street,
   brick houses, a lamp post` / `a used estate car` / `a coat hook by the door` /
   `a child's drawing on the fridge seen through the door, a folded newspaper`.
4. semi with a garden: `an oak side table` / `a lounge with a corner sofa and a wall mounted TV,
   toys in a basket` / `patio doors` / `a small lawn, a shed, a child's bike on the grass, a
   fence` / `a newer estate car on the drive, seen past the fence` / `the back of the door` /
   `a dog bed, a barbecue cover outside`.
5. detached house: `a walnut side table` / `a large lounge with a wooden floor, a real fireplace
   lit, a dining table through an arch, bookshelves` / `tall windows` / `a lawn with a hedge, a
   paved drive` / `a mid range saloon` / `a hook in the hall seen through the doorway` /
   `a glass of wine, a dog asleep by the fire`.
6. house with a double garage: `a designer side table` / `open plan living, a kitchen island in
   the background with pendant lights, a long sofa` / `large sliding glass doors` / `a wide
   drive and a double garage, one door up` / `a German saloon in the open garage bay, a second
   car beside it` / `a bench in the hall` / `a laptop closed on the island, a bottle of wine`.
7. house in the country: `an old chest as a table` / `beams, a wood burner lit, a long sofa,
   stone walls, a big rug` / `a wide window` / `fields to the horizon at dusk, a stone wall, a
   gravel yard` / `a 4x4 and a saloon on the gravel` / `a hook by a Belfast sink seen through
   the door` / `muddy boots on a mat, a dog`.
8. villa: `a marble topped table` / `a villa lounge, stone floor, low modern furniture, a
   double height ceiling` / `floor to ceiling glass` / `a terrace with a lit pool, a valley and
   hills beyond at dusk` / `a sports car and a 4x4 under a carport` / `the back of a leather
   chair` / `a book open on the sofa, the jacket the only rough thing in the room`.

## 7. Acceptance checklist (Piotr and Claude, before a file enters the repository)

1. 1800 by 600, RGB, no transparency, no text of any kind, no people, no brands.
2. The same viewpoint in all eight: lamp left, room middle, window right, car in view, jacket
   somewhere; the eight side by side read as one ladder.
3. Dusk in all eight; rain only on tier 1.
4. Each tier is unmistakably richer than the one before at thumbnail size (the card is 900 wide
   on a laptop and the player sees it for three seconds).
5. Nothing in the picture is a copy of a real house, a real car or a real photograph.
6. The style matches the office and canteen rooms already in the game: realistic, muted, crisp.

## 8. What the code does with them

Nothing to build: `src/ui/house.ts` already asks for `house.<tier>` and draws the placeholder
until the file lands. Dropping the eight files into `public/sprites/` and regenerating the
manifest (`npm run sprites:manifest`) is the whole of the change, plus one line in REPORT of the
turn that lands them.
