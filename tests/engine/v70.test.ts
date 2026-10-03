// v70 (PIOTR, 03.10), three things off an evening with twelve men in the long hall.
//
// The Break card carries a tick, `Do not ask again`: ticked, the answer he gives is every noon's
// and the card is not raised again; Settings has the row that takes it back.
//
// The men go to the best machine of a family first and the old one takes the overflow. Until
// tonight they filled the machines in the order they were bought, so an industrial edgebander
// bought after the floor one "did nothing": its pace was the hall's, and nobody ever stood at it.
//
// The manager's points reach a man on a standing contract. His row had printed them since v61 and
// his minute had never had them.

import { describe, expect, it } from 'vitest';
import { PRODUCTION_MANAGER_PACE } from '../../src/engine/constants';
import { acceptContract, assignContract, drawContract } from '../../src/engine/contracts';
import { applyAction, runMinutes } from '../../src/engine/game';
import type { GameState, Worker } from '../../src/engine/index';
import { machineForPlace, placedMachines } from '../../src/engine/machines';
import { migrateState } from '../../src/engine/migrate';
import {
  buyStartingKit,
  fillRack,
  newGame,
  placeEquipment,
  runClock,
  testJoiner,
  withAir,
  withExtraction,
} from '../helpers';

const NOON = 240;

/** A hall five minutes before noon, the owner in. */
function beforeNoon(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.enquiries = [];
  state.clock.minute = NOON - 5;
  return state;
}

/** Runs to the first thing the day asks, or ten minutes past noon. */
function toNoon(state: GameState): GameState {
  return runMinutes(state, 15).state;
}

describe('the Break card asked once and for all', () => {
  it('asks every day until the tick is set, and a new game and an old save are both asked', () => {
    const state = toNoon(beforeNoon());
    expect(state.settings.noonBreak).toBe('ask');
    expect(state.activeEvent?.kind).toBe('breakTime');
    // An answer without the tick is today's answer and nothing more.
    const answered = applyAction(state, { type: 'RESOLVE_EVENT', choiceId: 'skip' });
    expect(answered.owner.breakSkipped).toBe(true);
    expect(answered.settings.noonBreak).toBe('ask');
    // A save of the version before the tick (35) is lifted to being asked. The number is written
    // out: `STATE_VERSION - 1` was the same thing only until the next bump.
    const old = JSON.parse(JSON.stringify(beforeNoon())) as { version: number; settings: Record<string, unknown> };
    old.version = 35;
    delete old.settings.noonBreak;
    expect(migrateState(old, 35)?.settings.noonBreak).toBe('ask');
  });

  it('keeps a ticked answer, and gives it at noon without raising the card', () => {
    for (const choiceId of ['take', 'skip'] as const) {
      const asked = toNoon(beforeNoon());
      const kept = applyAction(asked, { type: 'RESOLVE_EVENT', choiceId, remember: true });
      expect(kept.settings.noonBreak).toBe(choiceId);
      // The next noon: no card, and the answer is the one he ticked.
      kept.clock.minute = NOON - 5;
      kept.owner.breakAsked = false;
      kept.owner.breakSkipped = false;
      const next = toNoon(kept);
      expect(next.activeEvent, choiceId).toBeNull();
      expect(next.clock.minute, choiceId).toBe(NOON + 10);
      expect(next.owner.breakSkipped, choiceId).toBe(choiceId === 'skip');
    }
  });

  it('is asked again once Settings says Ask me', () => {
    const state = applyAction(beforeNoon(), { type: 'SET_NOON_BREAK', choice: 'skip' });
    expect(state.settings.noonBreak).toBe('skip');
    const back = applyAction(state, { type: 'SET_NOON_BREAK', choice: 'ask' });
    expect(toNoon(back).activeEvent?.kind).toBe('breakTime');
  });
});

describe('the best machine first', () => {
  it('fills the industrial edgebander before the floor one bought before it', () => {
    const state = withAir(withExtraction(buyStartingKit(newGame({ difficulty: 'veryEasy' }))));
    // The day one edgebander lives in a cabinet; the floor one is the first that stands in the hall.
    const first = placeEquipment(state, 'edgebander', { variantId: 'standard', x: 2, y: 6, id: 'kit-floor' });
    expect(machineForPlace(state, 'edgebander', 0)?.item.id).toBe(first.id);
    const industrial = placeEquipment(state, 'edgebander', { variantId: 'industrial', x: 12, y: 6, id: 'kit-industrial' });
    const twin = placeEquipment(state, 'edgebander', { variantId: 'industrial', x: 12, y: 2, id: 'kit-twin' });
    // The two of one class in the order they were bought, the lesser class after them.
    expect(placedMachines(state, 'edgebander').map((item) => item.id)).toEqual([industrial.id, twin.id, first.id]);
    expect(machineForPlace(state, 'edgebander', 0)?.item.id).toBe(industrial.id);
    // A gate is part of a machine's pace: the twin with one fitted is the better of the two.
    state.gates.push(twin.id);
    expect(machineForPlace(state, 'edgebander', 0)?.item.id).toBe(twin.id);
  });
});

describe('the manager over a man on a contract', () => {
  /** A joiner on a cut sheet pack contract, and what a minute of his was worth after an hour. */
  function minuteWorth(withManager: boolean): number {
    let state = withAir(withExtraction(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60)));
    placeEquipment(state, 'workbench', { variantId: 'budget', x: 6, y: 6 });
    state.enquiries = [];
    state.workers.push(testJoiner('staff-1', 'Ben'));
    if (withManager) {
      const manager: Worker = { ...testJoiner('staff-2', 'Ollie'), role: 'productionManager', tier: 'master' };
      state.workers.push(manager);
    }
    state.clock.minute = 60;
    const contract = drawContract(state);
    contract.pieceId = 'cutSheetPack';
    state.contracts.push(contract);
    expect(acceptContract(state, contract.id).ok).toBe(true);
    expect(assignContract(state, contract.id, 'staff-1', true).ok).toBe(true);
    state = runClock(state, 60);
    const booked = state.dayStats.byMan['staff-1'];
    if (!booked || booked.minutes <= 0) throw new Error('the man on the contract is wanted at work');
    return booked.worth / booked.minutes;
  }

  it('adds his points to the minute, at the rate of the man', () => {
    const rate = testJoiner('x', 'x').rate;
    const gained = minuteWorth(true) - minuteWorth(false);
    expect(gained).toBeCloseTo(rate * (PRODUCTION_MANAGER_PACE.master - 1), 3);
  });
});
