// ─── TURN 41, F5: THE DRAWINGS LEARN TO DRAW ────────────────────────────────
//
// F5a first, because line weight touches every view.
//
// ─── WHAT WAS MEASURED ON T40'S SHEETS ──────────────────────────────────────
//
//   · 5 weights in the whole table, ratio 2.50 : 1, and on a real Wall A /1
//     sheet 68 % of all 88 strokes were the single value 0.25
//   · the DIMENSION line (0.25) was HEAVIER than the door swing (0.20) and
//     exactly as heavy as a shelf and as the building fabric
//   · on the horizontal SECTION the cut room wall (0.25) was LIGHTER than an
//     uncut cabinet footprint (0.35)
//   · the DXF — the one output meant for CAD — carried NO lineweight at all:
//     no group code 370, no LTYPE table, every layer row CONTINUOUS, so every
//     line plotted identically and every hidden line plotted solid
//   · the detailed width chain merged across mounting levels, so a wall unit
//     over a base run gave the chain [40, 560, 40, 500] — not one of which is
//     a cabinet or a gap — while the grouped chain collapsed to [1140]
//   · the front-height chain dimensioned the 3 mm gaps BETWEEN fronts
//   · the sheet filled 30.1 % of its usable area, snapped to a scale ladder it
//     does not print
//
// Every assertion below is about the RENDERED OUTPUT — a stroke width in the
// SVG, a group code in the DXF, a number in a chain — and not about a field.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { PEN, penWidth, DRAWING_LAYERS } from '../src/engine/drawings/layers.js';
import { exactScale } from '../src/engine/drawings/sheet.js';
import {
  wallGroups, bandChains, mountingBands, heightChains, widthChains,
} from '../src/engine/drawings/wallElevation.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import { sheetToDxf } from '../src/engine/drawings/dxf.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
// T43-F1: the hidden-line law moved to the sheet that still carries hidden
// lines — the unit card (T43 iron rule 4 pins it for exactly that reason).

const ROOM = { height: 2500, corners: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 3000 }, { x: 0, y: 3000 }] };
const unit = (type, over, pos) => ({
  id: `u-${over.unit_num}`,
  type,
  params: { ...defaultParamsFor(type, P), ...over },
  position: { rotation_deg: 0, ...pos },
});
const entry = (u) => ({ unit: u, result: computeCabinet({ ...u.params }, P) });

/** A base run with a WALL UNIT OVER IT — the case both chains got wrong. */
const kitchen = () => [
  entry(unit('BUD', { unit_num: '01', width: 600, plinth: true }, { wall: 0, x_mm: 0 })),
  entry(unit('BUD', { unit_num: '02', width: 500, plinth: true }, { wall: 0, x_mm: 640 })),
  entry(unit('WUD', { unit_num: '03', width: 600, mount_height: 1500 }, { wall: 0, x_mm: 40 })),
];
const sheets = () => wallDrawingSheets({
  entries: kitchen(), project: { name: 'T41' }, room: ROOM, profile: P, date: '19/08/2026',
});
const sheetOf = (s) => s.sheet || s;
const strokesOf = (svg) => [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1]));

// ═══ F5a — THE PEN TABLE ════════════════════════════════════════════════════

test('F5a — the pen ladder is ISO, and it is a real hierarchy', () => {
  // The ladder every plotter and every CAD default is built around.
  for (const v of Object.values(PEN)) assert.ok([0.13, 0.18, 0.25, 0.35, 0.50, 0.70].includes(v), `${v} is on the ISO ladder`);
  // The ORDER is the point: a cut is heavier than an outline, an outline than a
  // visible edge, and every one of them heavier than a dimension.
  assert.ok(PEN.CUT > PEN.OUTLINE);
  assert.ok(PEN.OUTLINE > PEN.VISIBLE);
  assert.ok(PEN.VISIBLE > PEN.HIDDEN);
  // THE OWNER, 24.10.2026 (19:50), option A: the PDF is A3 at 1:1, so the
  // ladder tops out at 0.35 and floors at 0.13, the thinnest ISO pen, which
  // prints on any laser. A shelf and a dimension share that floor; the layer's
  // colour and the hidden dash tell them apart.
  for (const v of Object.values(PEN)) assert.ok(v >= 0.13 && v <= 0.35, `${v} is inside the A3 ladder`);
  assert.ok(PEN.HIDDEN >= PEN.ANNOTATION, 'a measurement never outweighs the thing it measures');
  assert.ok(PEN.ANNOTATION >= PEN.FINE);
  assert.ok(PEN.CUT / PEN.FINE > 2.5, `a real range, wider than T40's 2.5:1, ${PEN.CUT / PEN.FINE}`);
});

test('F5a — weight is resolved in ONE function, and the entity\'s own role wins', () => {
  // The layer's default…
  assert.equal(penWidth({ layer: 'CARCASE' }), PEN.OUTLINE);
  assert.equal(penWidth({ layer: 'DIMENSIONS' }), PEN.ANNOTATION);
  // …and the entity's own word, which is the piece that did not exist before.
  assert.equal(penWidth({ layer: 'CARCASE', pen: 'CUT' }), PEN.CUT);
  assert.equal(penWidth({ layer: 'BUILDING', pen: 'CUT' }), PEN.CUT);
  // An unknown layer falls back to CARCASE, exactly as `drawingLayer` has
  // always made it — and therefore to CARCASE's role.
  assert.equal(penWidth({ layer: 'NOT_A_LAYER' }), PEN[DRAWING_LAYERS.CARCASE.pen]);
  // …and a layer with NO role at all still answers with its pre-T41 `width`,
  // which is what makes this change invisible where nothing asked for it.
  assert.equal(penWidth({ layer: 'X' , pen: null }, ), PEN[DRAWING_LAYERS.CARCASE.pen]);
});

test('F5a, the DIMENSION never outweighs the geometry it measures', () => {
  // The inversion, named. T40 drew a dimension at 0.25 and a door swing at 0.20.
  for (const layer of ['CARCASE', 'DOORS']) {
    assert.ok(penWidth({ layer }) > penWidth({ layer: 'DIMENSIONS' }),
      `${layer} must outweigh a dimension`);
  }
  // Owner's option A, 24.10.2026: a shelf sits on the 0.13 floor with the
  // dimension, never under it, and is told apart by colour and by its dash.
  assert.ok(penWidth({ layer: 'SHELVES' }) >= penWidth({ layer: 'DIMENSIONS' }), 'a shelf is never lighter than a dimension');
  assert.notEqual(DRAWING_LAYERS.SHELVES.colour, DRAWING_LAYERS.DIMENSIONS.colour, 'a shelf and a dimension differ in colour');
  assert.ok(DRAWING_LAYERS.SHELVES.dash && !DRAWING_LAYERS.DIMENSIONS.dash, 'a shelf is dashed, a dimension is not');
});

test('F5a — a real sheet carries a real spread of weights', () => {
  for (const s of sheets()) {
    const widths = strokesOf(sheetToSvg(sheetOf(s), { kind: 'wall' }));
    assert.ok(widths.length > 5, 'there are strokes to measure');
    const distinct = new Set(widths);
    assert.ok(distinct.size >= 3, `at least three weights on the sheet: ${[...distinct]}`);
    const ratio = Math.max(...widths) / Math.min(...widths);
    // Owner's A3 ladder, 24.10.2026: every sheet spans at least the floor pen
    // to the outline pen (0.13 to 0.25); a section adds the 0.35 cut on top.
    assert.ok(ratio >= PEN.OUTLINE / PEN.FINE - 1e-9, `the floor to the outline at least, ${ratio.toFixed(2)}:1`);
  }
});

test('F5a — the SECTION\'s cut lines are the heaviest thing on it', () => {
  // T40's section drew the cut room wall LIGHTER than an uncut cabinet
  // footprint. A section whose cut line is the thinnest line on it is not a
  // section.
  // T71: the horizontal section is now the two PLANS, and every wall carries
  // its vertical SECTIONS sheet; the cut weight is the heaviest on all three.
  const cuts = sheets().filter((s) => ['plan-base', 'plan-wall', 'sections'].includes(s.variant));
  assert.ok(cuts.length >= 3, 'the project produces the plans and a sections sheet');
  for (const section of cuts) {
    const widths = strokesOf(sheetToSvg(sheetOf(section), { kind: 'plan' }));
    assert.equal(Math.max(...widths), PEN.CUT, `${section.name}: the heaviest stroke on the section IS the cut weight`);
    assert.ok(widths.filter((w) => w === PEN.CUT).length >= 4, `${section.name}: real cut lines, not one`);
  }
});

// ═══ F5b — THE DXF LEARNS THE PEN ═══════════════════════════════════════════

const lineweightsOf = (dxf) => [...dxf.matchAll(/[\r\n]+370[\r\n]+(-?\d+)/g)].map((m) => Number(m[1]));

test('F5b — the drawings DXF carries a lineweight on every layer', () => {
  for (const s of sheets()) {
    const dxf = sheetToDxf(sheetOf(s));
    const lw = lineweightsOf(dxf);
    assert.ok(lw.length > 0, 'group code 370 reaches the file');
    assert.ok(new Set(lw).size >= 3, `and more than one weight: ${[...new Set(lw)]}`);
    // 1/100 mm, which is what 370 is in.
    for (const v of lw) assert.ok([13, 18, 25, 35, 50, 70].includes(v), `${v} is an ISO pen in 1/100 mm`);
  }
});

test('F5b — …and a hidden line is DASHED in CAD, as it already is on screen', () => {
  // ─── AMENDED BY TURN 43 (CLAUDE.md F1) ───────────────────────────────────
  //
  // T41 asked this of the wall set's `/1` sheet, because that was where a
  // shelf behind a door was drawn as a hidden line. T43-F1 is the owner's
  // instruction that it must NOT be — *"fronty same bez kresek"* — so `/1`
  // carries no hidden geometry at all any more and there is nothing on it for
  // this law to be true of.
  //
  // THE LAW ITSELF IS UNCHANGED and is still worth holding, so it is asked of
  // the sheet where hidden lines now live and are meant to: the UNIT CARD,
  // which T43 iron rule 4 pins precisely BECAUSE *"its hidden lines are its
  // value"*. Same wardrobe, same three shelves, same two assertions.
  //
  // AMENDED 22.10.2026 (T81 F9): the card is the projector's and draws no line
  // through a front (*"bez przebijania carcasow, tylko to co widac za
  // frontami"*); the hidden lines the set still draws, and is meant to, are
  // the BASE PLAN's: the plinth under the knife's plane and the worktop over
  // it. So the law is asked of that sheet: same two assertions.
  const plan = sheets().find((s) => s.variant === 'plan-base');
  assert.ok(sheetOf(plan).entities.some((e) => e.hidden && e.layer !== 'DIMENSIONS'), 'the base plan carries hidden lines');
  const dxf = sheetToDxf(sheetOf(plan));
  assert.match(dxf, /[\r\n]+2[\r\n]+LTYPE[\r\n]/, 'an LTYPE table is written');
  assert.ok(dxf.includes('CC_DASHED'), 'and a hidden layer names it');

  // …and the fronts sheet of a shelved wall now carries NOT ONE dashed
  // entity, which is F1 in one line.
  const shelved = wallDrawingSheets({
    entries: [
      entry(unit('WARDROBE', { unit_num: '01', width: 900, shelves: 3 }, { wall: 0, x_mm: 0 })),
      entry(unit('WARDROBE', { unit_num: '02', width: 600, shelves: 2 }, { wall: 0, x_mm: 940 })),
    ],
    project: { name: 'T41' }, room: ROOM, profile: P, date: '19/08/2026',
  });
  const el = shelved.find((s) => s.variant === 'fronts');
  assert.ok(el, 'there is an elevation sheet');
  // T71: counted inside the drawing box; the side column's legend shows the
  // hidden-line convention with one dashed swatch on every sheet, and the
  // title strip's logo placeholder is a dashed box.
  const box = sheetOf(el).zones.box;
  const inBox = (e) => {
    const x = e.x ?? e.x1 ?? e.cx ?? e.pts?.[0]?.[0];
    const y = e.y ?? e.y1 ?? e.cy ?? e.pts?.[0]?.[1];
    return x != null && x < box.x + box.w && y >= box.y;
  };
  assert.equal(sheetOf(el).entities.filter((e) => e.hidden && inBox(e)).length, 0, 'T43-F1: /1 is fronts');
});

test('F5b — THE CNC PATH IS UNTOUCHED: no lineweight, no linetype table', () => {
  // The whole reason the extension is opt-in. A CNC file that gained a group
  // code would be a changed fingerprint for no reason a joiner could see.
  const result = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P);
  for (const f of buildUnitDxfFiles(result, P)) {
    assert.equal(lineweightsOf(f.dxf).length, 0, `${f.name} carries no 370`);
    assert.doesNotMatch(f.dxf, /[\r\n]+2[\r\n]+LTYPE[\r\n]/, `${f.name} has no LTYPE table`);
    assert.ok(!f.dxf.includes('CC_DASHED'), `${f.name} names no linetype`);
  }
});

// ═══ F5c — THE CHAINS TELL THE TRUTH ════════════════════════════════════════

test('F5c — a chain measures ONE RUN, so a wall unit cannot wreck the base chain', () => {
  const group = wallGroups(kitchen(), P)[0];
  const bands = mountingBands(group.members);
  assert.equal(bands.length, 2, 'a base run and a wall run');

  // The whole-wall chain, which is what T40 drew, is still available and is
  // still wrong — pinned here so the fault is recorded rather than erased.
  const whole = widthChains(group.members, P);
  assert.deepEqual(whole.detailed, [40, 560, 40, 500], 'T40 drew this: not a cabinet, not a gap');
  assert.deepEqual(whole.grouped, [1140], '…and collapsed the bottom chain to one figure');

  // The banded chains name real cabinets and a real gap.
  const base = bandChains(bands[0], P);
  assert.deepEqual(base.detailed, [600, 40, 500], 'the base run: two cabinets and the gap between them');
  const wall = bandChains(bands[1], P);
  assert.deepEqual(wall.detailed, [600], 'the wall run: its one cabinet');
});

test('F5c — two chains that would say the same thing are drawn once', () => {
  const group = wallGroups(kitchen(), P)[0];
  const base = bandChains(mountingBands(group.members)[0], P);
  // On this run every cabinet is separated from its neighbour, so the detailed
  // and grouped chains ARE the same chain — and the sheet must not print the
  // same three numbers twice.
  assert.equal(base.same, true);
  assert.deepEqual(base.detailed, base.grouped);
});

test('F5c — a 3 mm gap between fronts is not dimensioned', () => {
  const bank = [
    entry(unit('BUDR4', { unit_num: '01', width: 600 }, { wall: 0, x_mm: 0 })),
    entry(unit('BUD', { unit_num: '02', width: 800 }, { wall: 0, x_mm: 600 })),
  ];
  const group = wallGroups(bank, P)[0];
  const raw = heightChains(group.members).fronts;
  const drawn = heightChains(group.members, { floorMm: P.doors.gap }).fronts;
  assert.ok(raw.some((v) => v <= P.doors.gap), `the gaps are really there: ${JSON.stringify(raw)}`);
  assert.ok(!drawn.some((v) => v <= P.doors.gap), `and none is dimensioned: ${JSON.stringify(drawn)}`);
  // THE CHAIN STILL SPANS THE RUN. Dropping an edge must not shorten the chain
  // — the segments either side merge, which is what a draughtsman does by hand.
  const sum = (a) => Math.round(a.reduce((n, v) => n + v, 0) * 10) / 10;
  assert.equal(sum(drawn), sum(raw), 'the chain still reaches the top of the run');
});

// ═══ F5d — THE SHEET FILLS THE PAPER ════════════════════════════════════════

test('F5d — a sheet that prints "No Scale" fills the paper', () => {
  // T40 snapped to [5,10,20,25,50] and used 30.1 % of the usable area.
  assert.equal(exactScale({ w: 3265, h: 2957 }, { w: 392, h: 204.5 }).toFixed(2), '14.46',
    'the best fit for T40\'s own proof wall');
  // ─── RE-PINNED 21.09.2026 (T71) ─────────────────────────────────────────
  // The set prints its scale, so it SNAPS to the set's ladder and says which
  // rung ("1:20 @ A3"); only a picture (the perspective) fills the paper at
  // whatever ratio fits, and prints NTS. A paper sheet (cover, cut list) has
  // no scale at all.
  for (const s of sheets()) {
    const sheet = sheetOf(s);
    if (['cover', 'visual', 'cutlist'].includes(s.variant)) continue;
    // AMENDED 22.10.2026 (T81 F2): the picture is the 3D sheet, first in the
    // set (*"najpierw chce widziec 3d jak zrobiles pierwsza strona"*), NTS.
    if (s.variant === 'perspective' || s.variant === '3d') {
      assert.equal(sheet.scaleLabel, 'NTS');
      assert.ok(sheet.scale > 0, 'a picture still has a fitting ratio');
      continue;
    }
    assert.ok(P.drawings.set.scales.includes(sheet.scale),
      `a set sheet is snapped to the ladder: 1:${sheet.scale}`);
    assert.equal(sheet.scaleLabel, `1:${sheet.scale} @ A3`, 'and the strip says which rung');
    assert.ok(sheet.scale > 1, 'and it is a real reduction');
  }
});
