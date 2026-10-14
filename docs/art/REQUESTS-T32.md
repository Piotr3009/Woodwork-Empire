# Art requested after Turn 32

The shape `docs/art/REQUESTS-T31.md` left. Written 13.10.2026, the night Turn 32 gave the glass a
store of its own (CLAUDE.md T32 2.1, 2.9). Piotr's words that morning: a glass rack for 40 glass
units at £1,500 and a large one for 200 at £6,000, and until the art side draws them the game draws
them as it draws any kit with no picture: "yes". So tonight the two racks have no file in
`public/sprites/` and no entry in `PLACEHOLDER_SPRITES`: the hall draws each by `objectArt`'s last
branch, the flat box in the storage kit's colours with its name over it, and the catalogue's card
shows the empty picture slot the cutter sets showed (`docs/mockups/t32/hall-glass-racks.png`,
`docs/mockups/t32/catalogue-storage-glass.png`). No agent has drawn, painted or altered a pixel of
any picture (CLAUDE.md T32 section 1).

Every figure below is the code's own: `spriteFileSize` and `spriteAnchorIn` of
`src/render/sprites.ts` asked of each footprint at 2x before this page was written, which is the
contract's arithmetic (`docs/art/SPRITES.md` 2): the canvas `(w + d) x 48` by `(w + d) x 24 + h x
48`, 8 px of padding on every side, the anchor at `(8 + w x 48, H + 8)` and in the `.r` view at
`(8 + d x 48, H + 8)`.

| # | Priority | What | Asked or for Piotr |
|---|---|---|---|
| G1 | [HIGH] | The two glass racks, one class each, views 0 and 90 | asked tonight; **landed 14.10, in the game from v98** (SPRITES.md 17) |
| S1 | [HIGH] | The outside store of 1,000 sheets | asked on 11.10 (`REQUESTS-T31.md` 1), still owed |

## G1. The two glass racks (CLAUDE.md T32 2.1, 2.9)

Two families of one class each, as the timber rack and the timber shelter are, so each file carries
`.standard` as the timber stores' do (SPRITES.md 13): two pictures and their two `.r` views, four files
in all, into `public/sprites/` on the art branch, one PR.

| File (and its `.r`) | Spec | Metres w x d x h | File, px | Anchor, view 0 | Anchor, `.r` |
|---|---|---|---|---|---|
| `glassRack.standard.png` | `glassRack`, Glass rack | 2 x 1 x 2 | 160 x 184 | 104, 176 | 56, 176 |
| `glassRackLarge.standard.png` | `glassRackLarge`, Large glass rack | 4 x 2 x 2.5 | 304 x 280 | 200, 272 | 104, 272 |

What each is [TUNE: chat, the look]:

- **The glass rack**: an A frame or a slotted rack of steel two metres along x and one deep, holding
  upright sealed glass units (double glazed panes, the glass of one window each) leaning on rubber, as
  a glazier's rack is. Forty units at the most; draw it about half full, or draw it empty, as the art
  side prefers: one picture serves it however many it holds, as the timber stores' do.
- **The large glass rack**: the same steel, four metres along x and two deep and 2.5 m high, a row of
  slots or two A frames back to back, holding five times the units.
- **In the timber racks' steel**: the colour and the finish of `timberRack.standard.png`, so the
  three stores of the hall read as one family of kit.
- **The contract** (SPRITES.md 1 to 3): the one camera, the light from the upper left, no floor, no
  ground, no grid and no cast shadow (the game draws the contact shadow), transparent background,
  straight alpha, 8-bit RGBA PNG. The floor outline fills its footprint diamond, the long side running
  down right in view 0. The `.r` file is the art side's 90 degree view on its own canvas, its anchor
  as the table gives it.
- **The plate**: the game hangs the count of what is on the rack over its front face at 0.55 of its
  height, as on every rack; nothing of it is to be painted.

Until G1 lands the game is whole as it is: the box and its name stand in for each.

**Landed 14.10.2026.** The four files came as asked, at the table's sizes and anchors to the pixel,
checked by chat before they went into `public/sprites/` with v98 (`docs/art/SPRITES.md` 17). G1 is
closed.

## S1. Still owed: the outside store of 1,000 sheets

Unchanged from `REQUESTS-T31.md` 1 and not asked again tonight: Piotr's sheet store of 1,000 sheets
at about 100,000 (11.10), where it stands to be his to say (the shelter's roof shows over the rear
wall, `REPORT-T31.md` section 0). Turn 32 changes nothing of the sheets' kit.

## Nothing else

No other picture is asked tonight. The timber stores are still drawn full of timber whatever is on
them (`REQUESTS-T29.md`), the glass racks will be drawn the same way, and the pallet at the gate is
still Turn 13's placeholder labelled `pallet.sheets` for every load, a load of glass among them
(`REPORT-T31.md` section 0): neither is asked tonight.
