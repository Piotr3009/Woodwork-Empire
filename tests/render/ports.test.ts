// The drawing's half of 2.8 (CLAUDE.md T22 2.8): the pipe comes down on the measured pixel of the
// picture the hall really draws, the saw's drop vanishes behind its body, a visible port gets a
// hose, and an extractor's inlet stands a quarter metre in front of its mouth and turns into it.
//
// The one thing held equal here is the pair the brief asks for: `portCell`, which is where the
// engine routes the run to, and the landing point of the drawing. One table, read by both.

import { describe, expect, it } from 'vitest';
import { connectExtraction, portCell } from '../../src/engine/pipes';
import { dropArt, footprintIn, inletArt, portPointOf, renderHall } from '../../src/render/hall';
import { HOSE_DROP, INLET_STANDOFF, runAbove } from '../../src/render/pipes';
import { TILE_HEIGHT, TILE_RISE, TILE_WIDTH, tileToScreen } from '../../src/render/iso';
import { HOSE_COLOUR } from '../../src/engine/constants';
import { spriteFiles } from '../../src/render/sprites';
import type { Equipment, GameState } from '../../src/engine/index';
import { newGame, placeEquipment } from '../helpers';

/** A standard saw and a standard fan, the saw on the extraction by the game's own route. */
function hall(): { state: GameState; saw: Equipment; fan: Equipment } {
  const state = newGame({ difficulty: 'veryEasy' });
  const fan = placeEquipment(state, 'extractor', { variantId: 'standard', x: 15, y: 3, id: 'kit-fan' });
  const saw = placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 4, y: 2, id: 'kit-saw' });
  state.pipes = [];
  connectExtraction(state, 'kit-saw');
  return { state, saw, fan };
}

/** The `d` of every path of a kind, in the order they are drawn. */
function parts(svg: string, kind: string): string[] {
  return Array.from(
    svg.matchAll(new RegExp(`data-pipe-part="${kind}"[^>]*\\sd="([^"]+)"`, 'g')),
  ).map((match) => match[1] ?? '');
}

/** The points of `M x y L x y` or `M x y Q cx cy x y`. */
function points(d: string): Array<{ x: number; y: number }> {
  const numbers = d
    .replace(/[MLQ]/g, ' ')
    .trim()
    .split(/\s+/)
    .map(Number);
  const out: Array<{ x: number; y: number }> = [];
  for (let at = 0; at + 1 < numbers.length; at += 2) {
    out.push({ x: numbers[at] ?? 0, y: numbers[at + 1] ?? 0 });
  }
  return out;
}

describe('the measured pixel is where the pipe lands (CLAUDE.md T22 2.8)', () => {
  it('agrees with portCell on the standard saw: the cell the engine routes to holds the pixel', () => {
    const { saw } = hall();
    const measured = portPointOf(saw, spriteFiles());
    if (measured === null) throw new Error('the standard saw is measured');
    // The engine's cell and the drawing's pixel are the one table line read twice. The cell is the
    // footprint's own corner plus the line's `cell`, and the pixel is the line's `px, py` put where
    // `spriteBox` puts the picture: the same two numbers on both sides.
    const cell = portCell(saw);
    const stands = footprintIn(saw);
    const port = measured.port;
    expect(cell).toEqual({
      x: Math.floor(stands.x) + port.cell.x,
      y: Math.floor(stands.y) + port.cell.y,
    });
    expect(cell).toEqual({ x: 5, y: 3 });
    expect([port.px, port.py]).toEqual([137, 62]);
    // The pixel comes down over that cell: within one cell of its centre in screen x, which is the
    // half metre a 3 by 1 footprint centred in a 4 by 3 zone stands off the grid (see
    // docs/notes-t22-b3.md, 2.8).
    const centre = tileToScreen(cell.x + 0.5, cell.y + 0.5);
    expect(Math.abs(measured.at.x - centre.x)).toBeLessThan(TILE_WIDTH);
    // The saw's port is the rear base outlet, so the pixel is above the floor of its cell and the
    // body of the picture covers what would be below [PIOTR's pick B].
    expect(measured.at.y).toBeLessThan(tileToScreen(cell.x + 1, cell.y + 1).y);
    expect(port.hidden).toBe(true);
  });

  it('agrees with portCell on the standard extractor: the vertical stands in the routed cell', () => {
    const { state, fan } = hall();
    const measured = portPointOf(fan, spriteFiles());
    if (measured === null) throw new Error('the standard fan is measured');
    expect(measured.port.faces).toBe('+y');
    const cell = portCell(fan);
    // The cell the run ends in is the cell in front of the mouth, and the vertical of the inlet
    // comes down a quarter metre in front of the mouth, which is inside that cell.
    const along = measured.port.faces === '+x' ? INLET_STANDOFF : -INLET_STANDOFF;
    const foot = {
      x: measured.at.x + along * (TILE_WIDTH / 2),
      y: measured.at.y + INLET_STANDOFF * (TILE_HEIGHT / 2),
    };
    const corner = tileToScreen(cell.x, cell.y);
    const far = tileToScreen(cell.x + 1, cell.y + 1);
    expect(foot.x).toBeGreaterThanOrEqual(corner.x - TILE_WIDTH / 2);
    expect(foot.x).toBeLessThanOrEqual(far.x + TILE_WIDTH / 2);
    expect(cell).toEqual({ x: 15, y: 4 });
    expect(state.pipes[0]?.tiles[state.pipes[0].tiles.length - 1]).toEqual({
      x: 15,
      y: 4,
      key: 'pipe.inlet',
    });
  });

  it('stops the saw’s drop at py and gives it no hose, because the body covers the rest', () => {
    const { state, saw } = hall();
    const cells = (state.pipes[0]?.tiles ?? []).map((tile) => ({ x: tile.x, y: tile.y }));
    const drawn = dropArt(saw, cells, spriteFiles());
    const measured = portPointOf(saw, spriteFiles());
    if (measured === null) throw new Error('the standard saw is measured');
    const ends = points(parts(drawn, 'drop')[0] ?? '');
    expect(ends).toHaveLength(2);
    // Straight down from the run to the measured pixel, and not a pixel further.
    expect(ends[0]?.x).toBeCloseTo(measured.at.x, 6);
    expect(ends[1]?.x).toBeCloseTo(measured.at.x, 6);
    expect(ends[1]?.y).toBeCloseTo(measured.at.y, 6);
    expect(ends[0]?.y).toBeCloseTo(runAbove(cells, measured.at.x).y, 6);
    expect(ends[0]?.y ?? 0).toBeLessThan(ends[1]?.y ?? 0);
    expect(drawn).not.toContain('data-pipe-part="hose"');
    expect(drawn).not.toContain(HOSE_COLOUR);
  });

  it('stops half a metre over a visible port and joins it with a hose', () => {
    // The spindle moulder's hood is a visible port: the hose is the one thing that reaches it
    // (docs/mockups/t22/ports-spindle-moulders.png).
    const state = newGame({ difficulty: 'veryEasy' });
    placeEquipment(state, 'extractor', { variantId: 'standard', x: 15, y: 3, id: 'kit-fan' });
    const moulder = placeEquipment(state, 'spindleMoulder', {
      variantId: 'standard',
      x: 4,
      y: 2,
      id: 'kit-moulder',
    });
    state.pipes = [];
    expect(connectExtraction(state, 'kit-moulder').ok).toBe(true);
    const cells = (state.pipes[0]?.tiles ?? []).map((tile) => ({ x: tile.x, y: tile.y }));
    const drawn = dropArt(moulder, cells, spriteFiles());
    const measured = portPointOf(moulder, spriteFiles());
    if (measured === null) throw new Error('the standard moulder is measured');
    expect(measured.port.hidden).toBeUndefined();
    const vertical = points(parts(drawn, 'drop')[0] ?? '');
    // Half a metre of rise above the port, which is where the steel stops and the hose starts.
    expect(vertical[1]?.y).toBeCloseTo(measured.at.y - HOSE_DROP * TILE_RISE, 6);
    const hose = parts(drawn, 'hose');
    expect(hose).toHaveLength(2);
    expect(hose[0]).toBe(hose[1]);
    const curve = points(hose[0] ?? '');
    expect(curve).toHaveLength(3);
    expect(curve[0]?.y).toBeCloseTo(measured.at.y - HOSE_DROP * TILE_RISE, 6);
    expect(curve[2]?.x).toBeCloseTo(measured.at.x, 6);
    expect(curve[2]?.y).toBeCloseTo(measured.at.y, 6);
    // A dark outline under the floor's own colour a touch darker, and no highlight: a hose is not
    // steel [PIOTR, 19.09].
    expect(drawn).toContain(`stroke="${HOSE_COLOUR}"`);
    expect(drawn).not.toContain('data-pipe-part="hose" fill="none" d="' + (hose[0] ?? '') + '" transform');
  });

  it('turns an extractor’s inlet into its mouth with an elbow, a quarter metre in front of it', () => {
    const { state, fan } = hall();
    const cells = (state.pipes[0]?.tiles ?? []).map((tile) => ({ x: tile.x, y: tile.y }));
    const drawn = inletArt(fan, cells, spriteFiles());
    const measured = portPointOf(fan, spriteFiles());
    if (measured === null) throw new Error('the standard fan is measured');
    const vertical = points(parts(drawn, 'inlet')[0] ?? '');
    const elbow = points(parts(drawn, 'elbow')[0] ?? '');
    expect(vertical).toHaveLength(2);
    expect(elbow).toHaveLength(3);
    // The mouth opens down and to the left, so the vertical stands a quarter metre that way.
    const foot = {
      x: measured.at.x - INLET_STANDOFF * (TILE_WIDTH / 2),
      y: measured.at.y + INLET_STANDOFF * (TILE_HEIGHT / 2),
    };
    expect(vertical[0]?.x).toBeCloseTo(foot.x, 6);
    expect(vertical[1]?.x).toBeCloseTo(foot.x, 6);
    // It comes down from the run and stops above the corner, where the elbow takes over and ends
    // on the measured pixel of the mouth itself [PIOTR's variant C].
    expect(vertical[0]?.y).toBeCloseTo(runAbove(cells, foot.x).y, 6);
    expect(elbow[0]).toEqual(vertical[1]);
    expect(elbow[1]?.x).toBeCloseTo(foot.x, 6);
    expect(elbow[1]?.y).toBeCloseTo(foot.y, 6);
    expect(elbow[2]?.x).toBeCloseTo(measured.at.x, 6);
    expect(elbow[2]?.y).toBeCloseTo(measured.at.y, 6);
  });

  it('draws the used extractor’s mouth to the right and the standard one’s to the left', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const used = placeEquipment(state, 'extractor', { variantId: 'used', x: 8, y: 3, id: 'kit-used' });
    const standard = placeEquipment(state, 'extractor', {
      variantId: 'standard',
      x: 15,
      y: 3,
      id: 'kit-standard',
    });
    expect(portPointOf(used, spriteFiles())?.port.faces).toBe('+x');
    expect(portPointOf(standard, spriteFiles())?.port.faces).toBe('+y');
    // `+x` is the cell to the right of the footprint and `+y` the cell below it, and the routing
    // reads the same line as the drawing (CLAUDE.md T22 2.8).
    expect(portCell(used)).toEqual({ x: 9, y: 3 });
    expect(portCell(standard)).toEqual({ x: 15, y: 4 });
  });

  it('falls back to the footprint’s own cell with no measured line, and draws no hose', () => {
    // A hall drawn from no files at all: nothing is measured, so the drop lands on the centre of
    // the port cell at the machine's own height, which is the rule the game had before tonight.
    const { state, saw } = hall();
    const cells = (state.pipes[0]?.tiles ?? []).map((tile) => ({ x: tile.x, y: tile.y }));
    expect(portPointOf(saw, [])).toBeNull();
    const drawn = dropArt(saw, cells, []);
    const ends = points(parts(drawn, 'drop')[0] ?? '');
    const stands = footprintIn(saw);
    const cell = portCell(saw);
    const lands = tileToScreen(cell.x + 0.5, cell.y + 0.5, stands.height);
    expect(ends[1]?.x).toBeCloseTo(lands.x, 6);
    expect(ends[1]?.y).toBeCloseTo(lands.y, 6);
    expect(drawn).not.toContain('data-pipe-part="hose"');
    expect(inletArt(saw, cells, [])).toBe('');
  });

  it('wears no port ring anywhere in the hall any more', () => {
    const { state } = hall();
    const svg = renderHall(state);
    expect(svg).not.toContain('port-ring');
    expect(svg).not.toContain('data-unconnected');
  });
});
