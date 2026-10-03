// v68 (PIOTR, 03.10): "there always has to be a saw in a joinery shop, even the smallest one. It
// cannot be done without a saw, the CNC will not cope. With a CNC the number of saws against the
// men does not matter, but one has to be there." So the board asks for a saw again whether the
// hall has a CNC or not (v62 had let the CNC stand in for it). His three answers: standing
// contracts stay as they are, the last saw can be sold because the owner decides, and a saw that
// is broken or away for its service is still the shop's saw.

import { describe, expect, it } from 'vitest';
import { drawBigJob } from '../../src/engine/agency';
import { lockReasonFor, missingEquipment } from '../../src/engine/catalog';
import { PRODUCT_TEMPLATES } from '../../src/engine/constants';
import { acceptContractCheck, drawContract } from '../../src/engine/contracts';
import { canSell } from '../../src/engine/game';
import type { GameState } from '../../src/engine/index';
import { placeShortages } from '../../src/engine/machines';
import { buyStartingKit, newGame, placeEquipment } from '../helpers';

const SHEET_WORK = PRODUCT_TEMPLATES.filter(
  (entry) => entry.material === 'sheet' && entry.requiredEquipment.includes('tableSaw'),
);

/** The day one hall with a pro CNC in it as well. */
function hallWithCnc(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  placeEquipment(state, 'cnc', { variantId: 'pro', x: 2, y: 6, id: 'kit-cnc' });
  state.cash = 500000;
  state.reputation = 90;
  return state;
}

function withoutTheSaw(state: GameState): GameState {
  state.equipment = state.equipment.filter((item) => item.specId !== 'tableSaw');
  return state;
}

describe('a shop always has a saw', () => {
  it('greys every sheet job on the board in a hall with a CNC and no saw', () => {
    const state = withoutTheSaw(hallWithCnc());
    expect(SHEET_WORK.length).toBeGreaterThan(0);
    for (const entry of SHEET_WORK) {
      expect(missingEquipment(state, entry), entry.id).toContain('tableSaw');
      expect(lockReasonFor(state, entry), entry.id).toContain('table saw');
    }
    // And the agency has no big job to draw for it: they are jobs of the same templates.
    expect(drawBigJob(state)).toBeNull();
  });

  it('is satisfied by the smallest saw there is', () => {
    const state = withoutTheSaw(hallWithCnc());
    placeEquipment(state, 'tableSaw', { variantId: 'used', x: 12, y: 0, id: 'kit-small-saw' });
    for (const entry of SHEET_WORK) expect(missingEquipment(state, entry), entry.id).not.toContain('tableSaw');
    // With the CNC in the hall the one used saw is short of nothing, whoever works: the cutting is
    // the CNC's and no man counts against the saw.
    expect(placeShortages(state).some((short) => short.family === 'tableSaw')).toBe(false);
  });

  it('counts a saw that is broken or away for its service', () => {
    const state = hallWithCnc();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('the day one saw is wanted');
    saw.broken = true;
    for (const entry of SHEET_WORK) expect(missingEquipment(state, entry), entry.id).not.toContain('tableSaw');
    saw.broken = false;
    saw.inServiceUntilDay = state.clock.day + 1;
    for (const entry of SHEET_WORK) expect(missingEquipment(state, entry), entry.id).not.toContain('tableSaw');
  });

  it('lets the owner sell his last saw, and leaves standing contracts as they were', () => {
    const state = hallWithCnc();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('the day one saw is wanted');
    expect(state.equipment.filter((item) => item.specId === 'tableSaw')).toHaveLength(1);
    expect(canSell(state, saw.id).ok).toBe(true);
    // A contract asks for no machine, with a saw or without one.
    const bare = withoutTheSaw(hallWithCnc());
    const contract = drawContract(bare);
    bare.contracts.push(contract);
    expect(acceptContractCheck(bare, contract.id).ok).toBe(true);
  });
});
