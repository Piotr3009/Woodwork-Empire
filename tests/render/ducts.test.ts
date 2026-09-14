// The ducting a central system draws along the rear wall (PIOTR, CLAUDE.md T10 3.4). The plant
// stands outside on the apron by the shutter, like the van; what the hall shows is a length of
// duct every four metres at three metres up, a thin drop to every ducted machine, and a ring at
// the port it lands on, green while the reconnection is free.

import { describe, expect, it } from 'vitest';
import {
  DUCT_DEPTH,
  DUCT_HEIGHT,
  DUCT_SPAN,
  DUCT_THICKNESS,
  DUCT_WIDTH,
  STARTING_LAYOUT,
} from '../../src/engine/constants';
import { ductDrops, ductRun, ductSystemOf, renderHall } from '../../src/render/hall';
import { spriteFileSize, spriteFiles } from '../../src/render/sprites';
import { TILE_RISE } from '../../src/render/iso';
import type { GameState } from '../../src/engine/index';
import { buyNow, newGame, placeEquipment } from '../helpers';

/** A hall with a saw and an edgebander on the floor, and the named central system on the apron. */
function hallWith(system: string | null): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 5, y: 0 });
  placeEquipment(state, 'edgebander', { variantId: 'standard', x: 12, y: 0 });
  if (system !== null) placeEquipment(state, system, { x: 20, y: 1 });
  return state;
}

describe('where the plant stands', () => {
  it('is outside on the apron, like the van, and holds no cell of the hall floor', () => {
    for (const specId of ['dustSystem', 'flexiSystem']) {
      expect(STARTING_LAYOUT[specId]?.yard, specId).toBe(true);
    }
    expect(STARTING_LAYOUT.van?.yard).toBe(true);
    const state = buyNow(newGame({ difficulty: 'veryEasy' }), 'dustSystem');
    const plant = state.equipment.find((item) => item.specId === 'dustSystem');
    // The apron starts where the hall floor ends.
    expect(plant?.anchorX).toBeGreaterThanOrEqual(state.unit.widthCells);
  });
});

describe('the run along the rear wall', () => {
  it('is drawn only where the hall has a central system', () => {
    expect(ductSystemOf(hallWith(null))).toBeNull();
    expect(ductSystemOf(hallWith('dustSystem'))).toBe('dustSystem');
    expect(ductSystemOf(hallWith('flexiSystem'))).toBe('flexiSystem');
    expect(ductRun(hallWith(null), spriteFiles(), 20)).toBe('');
  });

  it('repeats the delivered picture every four metres, three metres up', () => {
    const run = ductRun(hallWith('dustSystem'), spriteFiles(), 20);
    expect(run).toContain('data-ducts="dustSystem"');
    // Twenty metres of rear wall is five lengths of four.
    const images = run.match(/<image /g) ?? [];
    expect(images).toHaveLength(20 / DUCT_SPAN);
    expect(run).toContain('/sprites/dustSystem.ducts.png');
    // The sprite is a 4 by 0.5 by 0.5 object, which is exactly the 232 by 148 file the art side
    // delivered, and the loader halves it.
    const file = spriteFileSize(DUCT_WIDTH, DUCT_DEPTH, DUCT_THICKNESS);
    expect(file).toEqual({ width: 232, height: 148 });
    expect(run).toContain(`width="${file.width / 2}"`);
    expect(DUCT_HEIGHT).toBe(3);
    expect(TILE_RISE).toBe(24);
  });

  it('draws the flexi system own picture when that is the system', () => {
    const run = ductRun(hallWith('flexiSystem'), spriteFiles(), 20);
    expect(run).toContain('/sprites/flexiSystem.ducts.png');
    expect(run).not.toContain('/sprites/dustSystem.ducts.png');
  });

  it('falls back to a plain bar on the wall while the picture is missing', () => {
    const run = ductRun(hallWith('dustSystem'), [], 20);
    expect(run).toContain('class="duct-run"');
    expect(run).not.toContain('<image ');
  });
});

describe('the drop to every ducted machine', () => {
  it('is a thin line and a ring at the port, one per machine on the ducting', () => {
    const drops = ductDrops(hallWith('dustSystem'));
    // The saw and the floor edgebander are ducted; the compressor never is (CLAUDE.md T4 3.5).
    expect((drops.match(/class="duct-drop/g) ?? [])).toHaveLength(2);
    expect(drops).toContain('<circle class="duct-port"');
    expect(drops).not.toContain('is-flexi');
  });

  it('is green with the flexi system, because the reconnection is free for ever', () => {
    const drops = ductDrops(hallWith('flexiSystem'));
    expect(drops).toContain('duct-drop is-flexi');
  });

  it('leaves a compressor out of it, and draws nothing without a system', () => {
    const state = hallWith('dustSystem');
    placeEquipment(state, 'compressor', { variantId: 'budget', x: 18, y: 1 });
    expect((ductDrops(state).match(/class="duct-drop/g) ?? [])).toHaveLength(2);
    expect(ductDrops(hallWith(null))).toBe('');
  });

  it('is on the page the hall draws, with the run behind it', () => {
    const page = renderHall(hallWith('flexiSystem'));
    expect(page).toContain('data-ducts="flexiSystem"');
    expect(page).toContain('class="duct-drop is-flexi"');
    expect(page.indexOf('data-ducts=')).toBeLessThan(page.indexOf('duct-drop'));
  });
});
