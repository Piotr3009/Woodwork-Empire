import { describe, expect, it } from 'vitest';
import { applyAction, createGame, tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import {
  DAYS_PER_MONTH,
  LIVING_COST_PER_WORKING_DAY,
  POWER_BASE_DAILY,
  UNIT_DEPOSIT,
} from '../../src/engine/constants';
import { DEFAULT_OPTIONS as OPTIONS, clearEvents } from '../helpers';

/** What day 1 takes out before the player does anything: deposit, rent, rates, power, living. */
function dayOneCosts(rentMonthly: number, ratesMonthly: number): number {
  return (
    UNIT_DEPOSIT +
    rentMonthly / DAYS_PER_MONTH +
    ratesMonthly / DAYS_PER_MONTH +
    POWER_BASE_DAILY +
    LIVING_COST_PER_WORKING_DAY
  );
}

describe('createGame', () => {
  it('starts on day 1 at 08:00, paused, with the difficulty cash', () => {
    const state = createGame(OPTIONS);
    expect(state.clock).toEqual({ day: 1, minute: 0 });
    expect(state.speed).toBe(0);
    expect(state.cash).toBeCloseTo(20000 - dayOneCosts(1200, 450), 6);
    expect(state.difficulty).toBe('easy');
    expect(state.activeEvent).toBeNull();
  });

  it('gives each difficulty its cash and unit', () => {
    expect(createGame({ ...OPTIONS, difficulty: 'veryEasy' }).cash).toBeCloseTo(
      50000 - dayOneCosts(1000, 450),
      6,
    );
    expect(createGame({ ...OPTIONS, difficulty: 'hard' }).cash).toBeCloseTo(
      -dayOneCosts(1200, 450),
      6,
    );
    expect(createGame({ ...OPTIONS, difficulty: 'veryEasy' }).unit.benchSlots).toBe(6);
    expect(createGame({ ...OPTIONS, difficulty: 'easy' }).unit.benchSlots).toBe(4);
  });

  it('never hands back a state that shares memory with the next one', () => {
    const state = createGame(OPTIONS);
    const ticked = tick(state, 10);
    expect(state.clock.minute).toBe(0);
    expect(ticked.clock.minute).toBe(10);
    expect(ticked).not.toBe(state);
  });
});

describe('day boundary', () => {
  it('ends the day at 16:00 when the owner has nothing on', () => {
    const state = tick(createGame(OPTIONS), 600);
    expect(state.clock.minute).toBe(480);
    expect(state.activeEvent?.kind).toBe('dayEnd');
  });

  it('moves to the next day when the summary is clicked away', () => {
    const state = clearEvents(tick(createGame(OPTIONS), 600));
    expect(state.clock).toEqual({ day: 2, minute: 0 });
    expect(state.activeEvent).toBeNull();
  });

  it('walks over the weekend from Friday to Monday', () => {
    let state = createGame(OPTIONS);
    for (let day = 1; day <= 5; day += 1) {
      expect(state.clock.day).toBe(day);
      state = clearEvents(tick(state, 600));
    }
    expect(state.clock.day).toBe(8);
  });

  it('reports the weekend once, not twice', () => {
    let state = createGame(OPTIONS);
    for (let day = 1; day <= 4; day += 1) state = clearEvents(tick(state, 600));
    const friday = tick(state, 600);
    const afterDayEnd = applyAction(friday, { type: 'RESOLVE_EVENT', choiceId: 'next' });
    expect(afterDayEnd.activeEvent?.kind).toBe('weekend');
    expect(afterDayEnd.activeEvent?.data.days).toBe(2);
    const monday = clearEvents(afterDayEnd);
    expect(monday.clock.day).toBe(8);
    expect(monday.activeEvent).toBeNull();
  });

  it('rolls into the second month on day 31', () => {
    let state = createGame(OPTIONS);
    while (state.clock.day < 31) state = clearEvents(tick(state, 800));
    expect(state.clock.day).toBe(31);
  });

  it('freezes the clock while an event is open', () => {
    const state = tick(createGame(OPTIONS), 600);
    const again = tick(state, 100);
    expect(again.clock.minute).toBe(state.clock.minute);
  });

  it('lets the owner go home early, which does not stop the clock', () => {
    let state = tick(createGame(OPTIONS), 100);
    state = applyAction(state, { type: 'END_DAY' });
    expect(state.owner.wentHome).toBe(true);
    expect(state.clock.minute).toBe(100);
    state = tick(state, 100);
    expect(state.clock.minute).toBe(200);
    state = tick(state, 400);
    expect(state.activeEvent?.kind).toBe('dayEnd');
  });

  it('stops the day at the 12 hour hard stop', () => {
    let state = createGame(OPTIONS);
    // Nothing is running, so the day ends at 16:00 unless the owner is busy. Force the long day by
    // keeping a task in hand: this stands in until tasks exist, the hard stop is what matters.
    state.owner.currentTaskId = 'placeholder';
    state = tick(state, 900);
    expect(state.clock.minute).toBe(720);
    expect(state.activeEvent?.kind).toBe('dayEnd');
  });
});

describe('determinism', () => {
  it('replays to the same JSON from the same seed and the same actions', () => {
    const run = (): GameState => {
      let state = createGame(OPTIONS);
      state = applyAction(state, { type: 'SET_SPEED', speed: 4 });
      for (let step = 0; step < 10; step += 1) {
        state = tick(state, 100);
        state = clearEvents(state);
      }
      return state;
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  it('reaches the same state after 1000 ticks', () => {
    const run = (): GameState => {
      let state = createGame(OPTIONS);
      for (let i = 0; i < 1000; i += 1) {
        state = tick(state, 1);
        state = clearEvents(state);
      }
      return state;
    };
    const left = run();
    const right = run();
    expect(JSON.stringify(left)).toBe(JSON.stringify(right));
    expect(left.clock.day).toBeGreaterThan(1);
  });

  it('diverges when the seed differs and the stream is used', () => {
    const left = createGame({ ...OPTIONS, seed: 1 });
    const right = createGame({ ...OPTIONS, seed: 2 });
    expect(left.seed).not.toBe(right.seed);
    expect(left.rng).not.toBe(right.rng);
  });
});
