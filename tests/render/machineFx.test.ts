// What a machine does while it is running, drawn on top of whatever it is drawn with
// (CLAUDE.md T3 3.7).

import { describe, expect, it } from 'vitest';
import { renderHall } from '../../src/render/hall';
import { machineInUse, tick } from '../../src/engine/index';
import type { Equipment, GameState } from '../../src/engine/index';
import {
  act,
  buyNow,
  buyStartingKit,
  clearEvents,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
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
  state = fillRack(act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false }));
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

  it('stops it when the bag is full or the machine has given up', () => {
    const state = working();
    expect(machineInUse(state, machineOf(state, 'tableSaw'))).toBe(true);
    const full = { ...state, equipment: state.equipment.map((item) => ({ ...item })) };
    machineOf(full, 'tableSaw').bagFull = true;
    expect(machineInUse(full, machineOf(full, 'tableSaw'))).toBe(false);
    const broken = { ...state, equipment: state.equipment.map((item) => ({ ...item })) };
    machineOf(broken, 'tableSaw').broken = true;
    expect(machineInUse(broken, machineOf(broken, 'tableSaw'))).toBe(false);
  });
});

describe('the other machines', () => {
  it('breathes the extractor, and shows nothing for a machine off the floor', () => {
    const svg = renderHall(working());
    expect(svg).toContain('fx-breathe');
    expect(svg).not.toContain('fx-red');
    // The edgebander is in a tool cabinet: it is never drawn, so its lamp is never drawn
    // either (CLAUDE.md T6 3.5).
    expect(svg).not.toContain('fx-amber');
    expect(svg).not.toContain('data-kit="kit-edgebander');
  });

  it('puts a red lamp on a broken extractor and stops it breathing', () => {
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
