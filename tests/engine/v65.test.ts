// v65 (PIOTR, 02.10), three things Turn 26 left wrong in a played hall:
//
// 1. "They stand in one place": the men on a standing contract had their piece's own machine and
//    nothing else, so six men on contracts cut on a CNC stood at the CNC all day. They go round
//    their piece's machines a half hour at a time now, as the men on a job do.
// 2. A shop that came into Turn 26 with four contracts lost one without a word when it renewed:
//    the renewal is refused in words and the ended term stays on the page.
// 3. The men who do not fit beside a machine stood on the far side of whatever else was on the
//    floor: they stand on the floor reached from beside it, a step at a time.

import { describe, expect, it } from 'vitest';
import { CONTRACTS_MAX } from '../../src/engine/constants';
import {
  acceptContract,
  activeContracts,
  assignContract,
  contractPiece,
  contractRoundOf,
  contractsFullLine,
  drawContract,
  endedContracts,
  renewContract,
  renewContractCheck,
} from '../../src/engine/contracts';
import { dayPlan, familiesForContract } from '../../src/engine/production';
import { cellKey, floorFrom, placeCellsAt } from '../../src/engine/stations';
import { footprintCells, isWalkable } from '../../src/engine/walk';
import type { Contract, GameState } from '../../src/engine/index';
import {
  buyStartingKit,
  fillRack,
  newGame,
  placeEquipment,
  testJoiner,
  withAir,
  withExtraction,
} from '../helpers';

/** A hall with a saw, two benches, sheets and so many joiners, at 09:00. */
function hall(joiners: number): GameState {
  const state = withAir(withExtraction(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 200)));
  placeEquipment(state, 'workbench', { variantId: 'industrial', x: 6, y: 6, id: 'kit-bench-2' });
  state.enquiries = [];
  for (let index = 0; index < joiners; index += 1) {
    state.workers.push(testJoiner(`staff-${index + 1}`, `Joiner ${index + 1}`, 6 + index, 8));
  }
  state.clock.minute = 60;
  return state;
}

/** A contract of this piece running, with these men on it. */
function running(state: GameState, pieceId: string, men: readonly string[]): Contract {
  const contract = drawContract(state);
  contract.pieceId = pieceId;
  contract.id = `contract-${pieceId}-${state.contracts.length}`;
  contract.quantityPerWeek = 20;
  state.contracts.push(contract);
  expect(acceptContract(state, contract.id).ok).toBe(true);
  for (const who of men) expect(assignContract(state, contract.id, who, true).ok).toBe(true);
  return contract;
}

/** Where the day plan has this man this minute. */
function familyOf(state: GameState, who: string): string | null {
  return dayPlan(state).find((entry) => entry.who === who)?.family ?? null;
}

describe('the men on a standing contract take turns at their piece s machines', () => {
  it('goes round the saw and the bench for a piece that is cut and then finished', () => {
    const state = hall(1);
    const contract = running(state, 'wardrobeFront', ['staff-1']);
    expect(contractRoundOf(state, contractPiece(contract))).toEqual(['tableSaw', 'workbench']);
    const seen: Array<string | null> = [];
    for (const minute of [60, 90, 120, 150]) {
      state.clock.minute = minute;
      seen.push(familyOf(state, 'staff-1'));
      // The family whose turn it is comes first of the ones he may take, and a bench is always
      // among them.
      expect(familiesForContract(state, contract, 'staff-1')[0]).toBe(seen[seen.length - 1]);
      expect(familiesForContract(state, contract, 'staff-1')).toContain('workbench');
    }
    // A half hour at each, turn and turn about.
    expect(seen[0]).not.toBe(seen[1]);
    expect(seen).toEqual([seen[0], seen[1], seen[0], seen[1]]);
    expect([...seen].sort()).toEqual(['tableSaw', 'tableSaw', 'workbench', 'workbench']);
  });

  it('keeps a piece that is only cut at its saw, with a bench behind it when the saw is taken', () => {
    const state = hall(1);
    const contract = running(state, 'cutSheetPack', ['staff-1']);
    expect(contractRoundOf(state, contractPiece(contract))).toEqual(['tableSaw']);
    for (const minute of [60, 90, 120]) {
      state.clock.minute = minute;
      expect(familiesForContract(state, contract, 'staff-1')).toEqual(['tableSaw', 'workbench']);
      expect(familyOf(state, 'staff-1')).toBe('tableSaw');
    }
  });

  it('spreads four men on one piece over its machines: they are not all at the saw at once', () => {
    const state = hall(4);
    running(state, 'wardrobeFront', ['staff-1', 'staff-2', 'staff-3', 'staff-4']);
    for (const minute of [60, 90]) {
      state.clock.minute = minute;
      const families = ['staff-1', 'staff-2', 'staff-3', 'staff-4'].map((who) => familyOf(state, who));
      expect(families.filter((family) => family === 'workbench').length).toBeGreaterThanOrEqual(2);
      expect(families.filter((family) => family === 'tableSaw').length).toBeGreaterThanOrEqual(1);
      // And every one of them works: a turn is a place and not a wait.
      expect(dayPlan(state).filter((entry) => entry.contract !== null).every((entry) => entry.working)).toBe(true);
    }
  });
});

describe('another term with the shop full of contracts', () => {
  /** A shop with one contract ended and so many others running. */
  function shop(others: number): { state: GameState; ended: Contract } {
    const state = hall(0);
    for (let index = 0; index < others; index += 1) running(state, 'cutSheetPack', []);
    const ended = drawContract(state);
    ended.id = 'contract-ended';
    ended.status = 'ended';
    ended.renegotiatedPrice = ended.pricePerPiece;
    state.contracts.push(ended);
    return { state, ended };
  }

  it('is refused in words, and the ended term stays on the page with its offer', () => {
    const { state, ended } = shop(CONTRACTS_MAX);
    expect(activeContracts(state)).toHaveLength(CONTRACTS_MAX);
    expect(renewContractCheck(state, ended.id, true)).toEqual({ ok: false, reason: contractsFullLine() });
    expect(renewContract(state, ended.id, true)).toEqual({ ok: false, reason: contractsFullLine() });
    // Until v65 the ended term was taken off the books first and the new one then refused.
    expect(endedContracts(state).map((contract) => contract.id)).toEqual([ended.id]);
    expect(state.contracts).toHaveLength(CONTRACTS_MAX + 1);
    expect(activeContracts(state)).toHaveLength(CONTRACTS_MAX);
  });

  it('is taken the minute one of the others has ended, and letting it go is always allowed', () => {
    const { state, ended } = shop(CONTRACTS_MAX - 1);
    expect(renewContractCheck(state, ended.id, true).ok).toBe(true);
    expect(renewContract(state, ended.id, true).ok).toBe(true);
    expect(activeContracts(state)).toHaveLength(CONTRACTS_MAX);
    expect(endedContracts(state)).toHaveLength(0);
    const full = shop(CONTRACTS_MAX);
    expect(renewContractCheck(full.state, full.ended.id, false).ok).toBe(true);
    expect(renewContract(full.state, full.ended.id, false).ok).toBe(true);
    expect(full.state.contracts.some((contract) => contract.id === full.ended.id)).toBe(false);
  });
});

describe('the men who do not fit beside a machine', () => {
  it('stand on the floor reached from beside it, and never on the far side of what stands next to it', () => {
    const state = hall(0);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('a saw is wanted');
    const cells = placeCellsAt(state, saw, 8);
    expect(cells).toHaveLength(8);
    // Every one of them a cell of his own, on the floor.
    expect(new Set(cells.map(cellKey)).size).toBe(8);
    for (const cell of cells) expect(isWalkable(state, cell)).toBe(true);
    // And every one of them joined to the rest by floor: from the first man's cell the others are
    // reached a step at a time without crossing a footprint, so nobody is cut off behind a
    // machine.
    const reached = new Set([cellKey(cells[0] as { x: number; y: number }), ...floorFrom(state, [cells[0] as { x: number; y: number }], 400).map(cellKey)]);
    for (const cell of cells) expect(reached.has(cellKey(cell))).toBe(true);
  });

  it('reads the floor nearest first, off the seeds, and through nothing that stands on it', () => {
    const state = hall(0);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('a saw is wanted');
    const box = footprintCells(saw);
    const onTheSaw = (cell: { x: number; y: number }): boolean =>
      cell.x >= box.x && cell.x < box.x + box.width && cell.y >= box.y && cell.y < box.y + box.depth;
    const seed = placeCellsAt(state, saw, 1)[0];
    if (!seed) throw new Error('a cell beside the saw is wanted');
    const floor = floorFrom(state, [seed], 12);
    expect(floor).toHaveLength(12);
    expect(floor.some((cell) => cellKey(cell) === cellKey(seed))).toBe(false);
    for (const cell of floor) {
      expect(onTheSaw(cell)).toBe(false);
      expect(isWalkable(state, cell)).toBe(true);
    }
    // The first cells listed are a step from the seed.
    const first = floor[0] as { x: number; y: number };
    expect(Math.abs(first.x - seed.x) + Math.abs(first.y - seed.y)).toBe(1);
  });
});
