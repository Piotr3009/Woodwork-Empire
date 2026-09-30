// @vitest-environment jsdom
// v59 (PIOTR, 30.09): a man waiting for the boss stands at the canteen door and not at his bench;
// the first two joiners and the first two production managers are Jack T and Jack B; Jack B is
// the red haired one, drawn from his own sheet wherever the joiner is drawn.

import { describe, expect, it } from 'vitest';
import { SIGNATURE_LOOKS, SIGNATURE_NAMES } from '../../src/engine/constants';
import { STATION_IDLE } from '../../src/engine/stations';
import { characterSheet, sheetRoleFor } from '../../src/render/characters';
import { renderHall } from '../../src/render/hall';
import { renderPerson } from '../../src/ui/personCard';
import { missingForHire } from '../../src/engine/staff';
import { buyNow, buyStartingKit, fillRack, hireNow, newGame, runClock } from '../helpers';
import type { GameState } from '../../src/engine/index';

/** A joiner taken on with everything the gate wants bought first. */
function hireJoiner(state: GameState): GameState {
  let next = state;
  let guard = 0;
  while (missingForHire(next, 'joiner').length > 0 && guard < 20) {
    for (const specId of missingForHire(next, 'joiner')) {
      next = buyNow(next, specId, specId === 'workbench' ? 'standard' : undefined);
    }
    guard += 1;
  }
  return hireNow(next, 'joiner', 'novice');
}

describe('the signature men', () => {
  it('names the first two joiners Jack T and Jack B, in that order, and the third off the dice', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.cash = 200000;
    state = hireJoiner(hireJoiner(hireJoiner(state)));
    expect(state.workers.map((worker) => worker.name).slice(0, 2)).toEqual(['Jack T', 'Jack B']);
    expect(['Jack T', 'Jack B']).not.toContain(state.workers[2]?.name);
    expect(SIGNATURE_NAMES.joiner).toEqual(['Jack T', 'Jack B']);
    expect(SIGNATURE_NAMES.productionManager).toEqual(['Jack T', 'Jack B']);
  });

  it('gives a production manager the next free of the two, and never a second Jack B', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.reputation = 60;
    state.cash = 200000;
    state = hireJoiner(state);
    expect(state.workers[0]?.name).toBe('Jack T');
    state = hireNow(state, 'productionManager', 'novice');
    const manager = state.workers.find((worker) => worker.role === 'productionManager');
    expect(manager?.name).toBe('Jack B');
    state = hireJoiner(state);
    expect(state.workers.filter((worker) => worker.name === 'Jack B')).toHaveLength(1);
  });

  it('draws Jack B from the red sheet, on the hall and on his card, and everybody else plain', () => {
    expect(SIGNATURE_LOOKS['Jack B']).toBe('Red');
    expect(characterSheet('joinerRed', 'idle')).not.toBeNull();
    expect(sheetRoleFor('joiner', 'Jack B')).toBe('joinerRed');
    expect(sheetRoleFor('joiner', 'Jack T')).toBe('joiner');
    // A look with no sheet delivered costs nothing but the hair.
    expect(sheetRoleFor('helper', 'Jack B')).toBe('helper');
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 40);
    state.cash = 200000;
    state = hireJoiner(hireJoiner(state));
    for (const worker of state.workers) worker.startDay = state.clock.day;
    const svg = renderHall(state);
    expect(svg).toContain('character.joinerRed.idle.sheet');
    expect(svg).toContain('character.joiner.idle.sheet');
    const jackB = state.workers.find((worker) => worker.name === 'Jack B');
    if (!jackB) throw new Error('Jack B is wanted');
    expect(renderPerson(state, jackB.id, 'card')).toContain('joinerRed');
  });
});

describe('a man waiting for the boss', () => {
  it('stands at the canteen door and not at his bench', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 40);
    state.cash = 200000;
    state = hireJoiner(state);
    for (const worker of state.workers) worker.startDay = state.clock.day;
    state = runClock(state, 2);
    const man = state.workers[0];
    if (!man) throw new Error('a joiner is wanted');
    expect(man.jobId).toBeNull();
    expect(man.station).toBe(STATION_IDLE);
  });
});
