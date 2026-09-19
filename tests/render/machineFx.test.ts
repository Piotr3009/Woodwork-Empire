// What a machine does while it is running, drawn on top of whatever it is drawn with
// (CLAUDE.md T3 3.7).

import { describe, expect, it } from 'vitest';
import { hasMeasuredPort, renderHall } from '../../src/render/hall';
import { machineInUse, tick } from '../../src/engine/index';
import type { Equipment, GameState } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyNow,
  buyStartingKit,
  clearEvents,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  placeEquipment,
} from '../helpers';

function machineOf(state: GameState, specId: string): Equipment {
  const item = state.equipment.find((entry) => entry.specId === specId);
  if (!item) throw new Error(`no ${specId} in the hall`);
  return item;
}

/** The day 1 workshop with one sheet job accepted and its material on the rack. */
function ready(): GameState {
  let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' });
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 400, name: 'Garage shelves' });
  state = fillRack(acceptNow(state, enquiry.id, false));
  firstJob(state).stage = 'ready';
  return clearEvents(state);
}

/** The same workshop with the owner standing at the bench, a minute into the job. */
function working(): GameState {
  return clearEvents(tick(act(ready(), { type: 'WORK_HERE', jobId: null }), 1));
}

describe('the blade only spins while something is being cut', () => {
  it('is absent while the job is only ready, and there while it is in production', () => {
    const idle = renderHall(ready());
    expect(idle).not.toContain('fx-blade');
    expect(idle).not.toContain('fx-chip');
    const busy = renderHall(working());
    expect(busy).toContain('class="fx fx-blade"');
    expect(busy).toContain('fx-blade-spin');
    expect(busy).toContain('class="fx-chip"');
  });

  it('stops the blade the moment the owner leaves the bench for the laptop', () => {
    const state = working();
    const bookkeeping = state.tasks.find((task) => task.kind === 'bookkeeping');
    if (!bookkeeping) throw new Error('no bookkeeping today');
    const away = act(state, { type: 'START_TASK', taskId: bookkeeping.id });
    expect(machineInUse(away, machineOf(away, 'tableSaw'))).toBe(false);
    expect(renderHall(away)).not.toContain('fx-blade');
  });

  it('stops it when the machine has given up', () => {
    const state = working();
    expect(machineInUse(state, machineOf(state, 'tableSaw'))).toBe(true);
    const broken = { ...state, equipment: state.equipment.map((item) => ({ ...item })) };
    machineOf(broken, 'tableSaw').broken = true;
    expect(machineInUse(broken, machineOf(broken, 'tableSaw'))).toBe(false);
  });
});

describe('the other machines', () => {
  it('does not breathe an extractor with a pipe on it, and shows nothing for a machine off the floor', () => {
    const svg = renderHall(working());
    // The extractor breathed as it ran from Turn 3 until tonight. It does not any more
    // [PIOTR, 19.09: "the extractor pulsing will tear the pipe"]: every extractor class has a
    // measured connection point, the pipe is drawn onto that pixel, and a body that swells under
    // a pipe fixed to it is the pipe tearing (CLAUDE.md T22 2.9).
    expect(hasMeasuredPort(machineOf(working(), 'extractor'))).toBe(true);
    expect(svg).not.toContain('fx-breathe');
    expect(svg).not.toContain('fx-red');
    // The edgebander is in a tool cabinet: it is never drawn, so its lamp is never drawn
    // either (CLAUDE.md T6 3.5).
    expect(svg).not.toContain('fx-amber');
    expect(svg).not.toContain('data-kit="kit-edgebander');
  });

  it('breathes a unit with no measured port, which is what the rule of 2.9 leaves alone', () => {
    // The gate is the port table and not the family: a unit the art side has measured nothing on
    // has no pipe drawn to a pixel of it, so nothing tears and it breathes as it did
    // (CLAUDE.md T22 2.9). The pelletiser is such a unit: extraction by category, no port line.
    const state = working();
    const unit = machineOf(state, 'extractor');
    expect(hasMeasuredPort({ ...unit, spriteKey: 'pelletiser', variantId: 'standard' })).toBe(false);
    // The question is asked of the picture the hall really draws, so an orientation with no file
    // of its own answers for the base picture it falls back to, and that one is measured. This is
    // why 2.11 lets Rotate reach only the orientations that have a file.
    expect(hasMeasuredPort({ ...unit, orientation: 2 })).toBe(true);
    // And it really does breathe, standing in the hall with the saw running beside it: the rule
    // of 2.9 took the swell off the things a pipe is fixed to and off nothing else.
    const withPelletiser = state;
    const pelletiser = placeEquipment(withPelletiser, 'pelletiser', { x: 14, y: 7 });
    expect(hasMeasuredPort(pelletiser)).toBe(false);
    expect(machineInUse(withPelletiser, pelletiser)).toBe(true);
    const svg = renderHall(withPelletiser);
    expect(svg).toContain('fx-breathe');
    // The swell is on the pelletiser's own group and on no other: the extractor beside it has a
    // measured port and stands still (CLAUDE.md T22 2.9).
    const breathing = Array.from(
      svg.matchAll(/data-kit="([^"]+)"[^>]*class="[^"]*fx-breathe/g),
    ).map((match) => match[1]);
    expect(breathing).toEqual([pelletiser.id]);
  });

  it('keeps every machine a pipe is drawn to still while it runs (CLAUDE.md T22 2.9)', () => {
    // The saw, the spindle moulder and the edgebander all have measured ports, and none of them
    // has ever breathed: the swell was the extractor's alone. This is the assertion that says the
    // gate is the table and not the category, so a family that gains a port line gains the rule
    // with it [PIOTR, 19.09: "the extractor pulsing will tear the pipe"].
    const state = working();
    for (const item of state.equipment) {
      if (!hasMeasuredPort(item)) continue;
      expect(renderHall(state), item.specId).not.toContain(
        `data-kit="${item.id}" data-sprite="${item.spriteKey}" data-tier="${item.variantId}" class="clickable fx-breathe`,
      );
    }
    expect(hasMeasuredPort(machineOf(state, 'tableSaw'))).toBe(true);
    expect(hasMeasuredPort(machineOf(state, 'extractor'))).toBe(true);
    expect(renderHall(state)).not.toContain('fx-breathe');
  });

  it('puts a red lamp on a broken extractor, and it still does not breathe', () => {
    const state = working();
    const broken = { ...state, equipment: state.equipment.map((item) => ({ ...item })) };
    machineOf(broken, 'extractor').broken = true;
    const svg = renderHall(broken);
    expect(svg).toContain('fx-red');
    expect(svg).not.toContain('fx-breathe');
  });

  it('leaves the solid wood machines alone while a sheet job is on the bench', () => {
    const state = working();
    expect(state.equipment.some((item) => item.specId === 'thicknesser')).toBe(false);
    // A saw job never sets a thicknesser going, because the wood never goes near it.
    const withThicknesser = buyNow(state, 'thicknesser');
    expect(machineInUse(withThicknesser, machineOf(withThicknesser, 'thicknesser'))).toBe(false);
  });
});
