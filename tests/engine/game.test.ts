import { describe, expect, it } from 'vitest';
import { applyAction, createGame, gameMinutesPerRealSecond, runMinutes, tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import {
  DAYS_PER_MONTH,
  LIVING_COST_PER_WORKING_DAY,
  POWER_BASE_DAILY,
  unitDepositFor,
} from '../../src/engine/constants';
import { createTask } from '../../src/engine/tasks';
import { DEFAULT_OPTIONS as OPTIONS, clearEvents, nextDay, withLicence } from '../helpers';

/** What day 1 takes out before the player does anything: deposit, rent, rates, power, living. */
function dayOneCosts(rentMonthly: number, ratesMonthly: number): number {
  return (
    unitDepositFor(rentMonthly) +
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
    expect(state.cash).toBeCloseTo(20000 - dayOneCosts(720, 450), 6);
    expect(state.difficulty).toBe('easy');
    expect(state.activeEvent).toBeNull();
  });

  it('gives each difficulty its cash and unit', () => {
    expect(createGame({ ...OPTIONS, difficulty: 'veryEasy' }).cash).toBeCloseTo(
      50000 - dayOneCosts(1080, 450),
      6,
    );
    expect(createGame({ ...OPTIONS, difficulty: 'hard' }).cash).toBeCloseTo(
      -dayOneCosts(720, 450),
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
  it('keeps the clock running past 16:00 while the owner is still in', () => {
    const state = tick(createGame(OPTIONS), 600);
    expect(state.clock.minute).toBe(600);
    expect(state.activeEvent).toBeNull();
  });

  it('ends the day when the owner says so, any time after 16:00', () => {
    const state = applyAction(tick(createGame(OPTIONS), 500), { type: 'END_DAY' });
    expect(state.activeEvent?.kind).toBe('dayEnd');
  });

  it('ends the day at 16:00 once the owner has gone home', () => {
    let state = applyAction(tick(createGame(OPTIONS), 100), { type: 'END_DAY' });
    expect(state.activeEvent).toBeNull();
    state = tick(state, 379);
    expect(state.activeEvent).toBeNull();
    state = tick(state, 1);
    expect(state.clock.minute).toBe(480);
    expect(state.activeEvent?.kind).toBe('dayEnd');
  });

  it('moves to the next day when the summary is clicked away', () => {
    const state = nextDay(createGame(OPTIONS));
    expect(state.clock).toEqual({ day: 2, minute: 0 });
    expect(state.activeEvent).toBeNull();
  });

  it('walks over the weekend from Friday to Monday', () => {
    let state = createGame(OPTIONS);
    for (let day = 1; day <= 5; day += 1) {
      expect(state.clock.day).toBe(day);
      state = nextDay(state);
    }
    expect(state.clock.day).toBe(8);
  });

  it('reports the weekend once, not twice', () => {
    let state = createGame(OPTIONS);
    for (let day = 1; day <= 4; day += 1) state = nextDay(state);
    const friday = applyAction(tick(state, 480), { type: 'END_DAY' });
    const afterDayEnd = applyAction(friday, { type: 'RESOLVE_EVENT', choiceId: 'next' });
    expect(afterDayEnd.activeEvent?.kind).toBe('weekend');
    expect(afterDayEnd.activeEvent?.data.days).toBe(2);
    const monday = clearEvents(afterDayEnd);
    expect(monday.clock.day).toBe(8);
    expect(monday.activeEvent).toBeNull();
  });

  it('rolls into the second month on day 31', () => {
    let state = createGame(OPTIONS);
    while (state.clock.day < 31) state = nextDay(state);
    expect(state.clock.day).toBe(31);
  });

  it('freezes the clock while an event is open', () => {
    const state = applyAction(tick(createGame(OPTIONS), 480), { type: 'END_DAY' });
    expect(state.activeEvent?.kind).toBe('dayEnd');
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
    expect(state.clock.minute).toBe(480);
    expect(state.activeEvent?.kind).toBe('dayEnd');
  });

  it('stops the day at the 12 hour hard stop', () => {
    let state = withLicence(createGame(OPTIONS));
    // A drawing far too long for one day keeps the owner in past 16:00. Twelve hours is the wall.
    const design = createTask(state, { kind: 'design', label: 'Endless drawing', minutes: 2000 });
    state = applyAction(state, { type: 'START_TASK', taskId: design.id });
    state = tick(state, 900);
    expect(state.clock.minute).toBe(720);
    expect(state.activeEvent?.kind).toBe('dayEnd');
  });
});

describe('the loop the UI drives', () => {
  it('advances exactly 4000 game minutes in 1000 real seconds at 4x, across day boundaries', () => {
    const perSecond = gameMinutesPerRealSecond(4);
    let state = createGame(OPTIONS);
    let accumulator = 0;
    let minutesRun = 0;
    for (let second = 0; second < 1000; second += 1) {
      accumulator += perSecond;
      let whole = Math.floor(accumulator);
      accumulator -= whole;
      let guard = 0;
      while (whole > 0 && state.gameOver === null && guard < 50) {
        guard += 1;
        const result = runMinutes(state, whole);
        state = result.state;
        minutesRun += result.minutesRun;
        // What the engine could not run stays in hand: the modal is answered and the rest goes in.
        whole -= result.minutesRun;
        if (whole > 0) state = clearEvents(state);
      }
    }
    // Nothing was dropped on the way, and the accumulator never carried a whole minute over.
    expect(minutesRun).toBe(4000);
    expect(accumulator).toBe(0);
    expect(state.clock.day).toBeGreaterThan(5);
  });

  it('stops on the minute an event fires and hands the rest of the batch back', () => {
    // The twelve hour wall is at minute 720, so a 800 minute batch from minute 0 stops there.
    let state = withLicence(createGame(OPTIONS));
    const design = createTask(state, { kind: 'design', label: 'Endless drawing', minutes: 2000 });
    state = applyAction(state, { type: 'START_TASK', taskId: design.id });
    const result = runMinutes(state, 800);
    expect(result.minutesRun).toBe(720);
    expect(result.state.clock.minute).toBe(720);
    expect(result.state.activeEvent?.kind).toBe('dayEnd');
    expect(runMinutes(result.state, 80).minutesRun).toBe(0);
  });
});

describe('a day off with nobody in the hall', () => {
  it('jumps straight to the summary and on to the next morning at 08:00', () => {
    const state = applyAction(createGame(OPTIONS), { type: 'SKIP_DAY' });
    expect(state.clock.minute).toBe(0);
    expect(state.activeEvent?.kind).toBe('dayEnd');
    const tomorrow = clearEvents(state);
    expect(tomorrow.clock).toEqual({ day: 2, minute: 0 });
  });

  it('runs the day at the selected speed while staff are working', () => {
    let state = createGame(OPTIONS);
    state.workers.push({
      id: 'staff-1',
      name: 'Ben',
      role: 'joiner',
      tier: 'poor',
      rate: 0.6,
      weeklyWage: 480,
      monthlyWage: 0,
      startDay: 1,
      jobId: null,
      taskId: null,
      absentDaysRemaining: 0,
      anchorX: 0,
      anchorY: 4,
    });
    state = applyAction(state, { type: 'SKIP_DAY' });
    expect(state.activeEvent).toBeNull();
    state = tick(state, 100);
    expect(state.clock.minute).toBe(100);
  });
});

describe('determinism', () => {
  it('replays to the same JSON from the same seed and the same actions', () => {
    const run = (): GameState => {
      let state = applyAction(createGame(OPTIONS), { type: 'SET_SPEED', speed: 4 });
      for (let index = 0; index < 10; index += 1) state = nextDay(state);
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
