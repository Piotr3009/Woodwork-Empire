import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createGame,
  formatTime,
  gameMinutesPerRealSecond,
  runMinutes,
  tick,
} from '../../src/engine/index';
import { missingForHire } from '../../src/engine/staff';
import type { GameState } from '../../src/engine/index';
import {
  BREAK_MINUTES,
  BREAK_START_MINUTE,
  DAYS_PER_MONTH,
  DAY_END_MINUTE,
  LIVING_COST_PER_WORKING_DAY,
  MINUTES_PER_WORKING_DAY,
  OVERTIME_END_MINUTE,
  POWER_BASE_DAILY,
  unitDepositFor,
} from '../../src/engine/constants';
import { createTask } from '../../src/engine/tasks';
import {
  DEFAULT_OPTIONS as OPTIONS,
  act,
  buyNow,
  buyStartingKit,
  choose,
  clearEvents,
  fillRack,
  firstJob,
  hireNow,
  newGame,
  nextDay,
  placeEnquiry,
  withLicence,
} from '../helpers';

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
    // One painted hall of 200 m2 at 12 a metre (docs/art/SPRITES.md 9.1).
    expect(state.cash).toBeCloseTo(20000 - dayOneCosts(2400, 450), 6);
    expect(state.difficulty).toBe('easy');
    expect(state.activeEvent).toBeNull();
  });

  it('gives each difficulty its cash and unit', () => {
    // Every difficulty rents the same hall now, so only the cash and the benches differ.
    expect(createGame({ ...OPTIONS, difficulty: 'veryEasy' }).cash).toBeCloseTo(
      50000 - dayOneCosts(2400, 450),
      6,
    );
    expect(createGame({ ...OPTIONS, difficulty: 'hard' }).cash).toBeCloseTo(
      -dayOneCosts(2400, 450),
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
  it('keeps the clock running past 17:00 once the owner has said he is staying', () => {
    let state = clearEvents(tick(createGame(OPTIONS), BREAK_START_MINUTE + 1));
    state = tick(state, DAY_END_MINUTE);
    expect(state.activeEvent?.kind).toBe('goingHome');
    state = tick(applyAction(state, { type: 'RESOLVE_EVENT', choiceId: 'overtime' }), 60);
    expect(state.clock.minute).toBe(DAY_END_MINUTE + 60);
    expect(state.activeEvent).toBeNull();
  });

  it('ends the day when the owner says so, any time after his 480 are in', () => {
    let state = clearEvents(tick(createGame(OPTIONS), BREAK_START_MINUTE + 1));
    state = applyAction(tick(state, DAY_END_MINUTE), { type: 'RESOLVE_EVENT', choiceId: 'overtime' });
    state = applyAction(tick(state, 20), { type: 'END_DAY' });
    expect(state.activeEvent?.kind).toBe('dayEnd');
  });

  it('ends the day at 17:00 once the owner has gone home', () => {
    let state = applyAction(tick(createGame(OPTIONS), 100), { type: 'END_DAY' });
    expect(state.activeEvent).toBeNull();
    state = tick(state, DAY_END_MINUTE - 101);
    expect(state.activeEvent).toBeNull();
    state = tick(state, 1);
    // The 480 minutes of work are in, and the clock reads an hour further for the dinner.
    expect(state.clock.minute).toBe(DAY_END_MINUTE);
    expect(formatTime(state.clock.minute)).toBe('17:00');
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
    const noon = clearEvents(tick(state, BREAK_START_MINUTE + 1));
    const friday = applyAction(tick(noon, DAY_END_MINUTE), { type: 'RESOLVE_EVENT', choiceId: 'home' });
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
    const noon = clearEvents(tick(createGame(OPTIONS), BREAK_START_MINUTE + 1));
    const state = applyAction(tick(noon, DAY_END_MINUTE), { type: 'RESOLVE_EVENT', choiceId: 'home' });
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
    expect(state.clock.minute).toBe(DAY_END_MINUTE);
    expect(state.activeEvent?.kind).toBe('dayEnd');
  });

  it('stops the day at 19:00 whatever the owner wants', () => {
    let state = withLicence(createGame(OPTIONS));
    // A drawing far too long for one day keeps the owner in past five. Seven is the wall.
    const design = createTask(state, { kind: 'design', label: 'Endless drawing', minutes: 2000 });
    state = applyAction(state, { type: 'START_TASK', taskId: design.id });
    state = clearEvents(tick(state, BREAK_START_MINUTE + 1));
    state = applyAction(tick(state, DAY_END_MINUTE), { type: 'RESOLVE_EVENT', choiceId: 'overtime' });
    state = tick(state, 900);
    expect(state.clock.minute).toBe(OVERTIME_END_MINUTE);
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
    // Noon is the first question of the day, so a 400 minute batch from 08:00 stops there with
    // 160 of it still in hand, and the batch after it stops at five.
    let state = withLicence(createGame(OPTIONS));
    const design = createTask(state, { kind: 'design', label: 'Endless drawing', minutes: 2000 });
    state = applyAction(state, { type: 'START_TASK', taskId: design.id });
    const noon = runMinutes(state, 400);
    expect(noon.minutesRun).toBe(BREAK_START_MINUTE);
    expect(noon.state.activeEvent?.kind).toBe('breakTime');
    expect(runMinutes(noon.state, 80).minutesRun).toBe(0);
    const afternoon = runMinutes(
      applyAction(noon.state, { type: 'RESOLVE_EVENT', choiceId: 'take' }),
      600,
    );
    expect(afternoon.minutesRun).toBe(DAY_END_MINUTE - BREAK_START_MINUTE);
    expect(afternoon.state.clock.minute).toBe(DAY_END_MINUTE);
    expect(afternoon.state.activeEvent?.kind).toBe('goingHome');
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
      minutesWorked: 0,
      ordersToday: 0,
      station: 'idle',
      productionMinutes: 0,
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

describe('the minute the owner spends', () => {
  /** The day 1 kit, a job at the bench and the owner standing at it. */
  function atTheBench(): GameState {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 90 });
    state = fillRack(act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false }));
    firstJob(state).stage = 'ready';
    return clearEvents(act(state, { type: 'WORK_HERE', jobId: null }));
  }

  it('goes on the task or on the bench, never on both in the same minute', () => {
    let state = atTheBench();
    const task = createTask(state, { kind: 'emails', label: 'An email', minutes: 3 });
    state = clearEvents(applyAction(state, { type: 'START_TASK', taskId: task.id }));
    state = clearEvents(tick(state, 3));
    // The third minute is the one that finishes the email. It is not also a minute at the bench.
    expect(state.owner.minutesWorked).toBe(3);
    expect(state.owner.minutesByCategory.admin).toBe(3);
    expect(state.owner.minutesByCategory.workshop).toBe(0);
    // From the next minute he is back on the job.
    state = clearEvents(tick(state, 1));
    expect(state.owner.minutesWorked).toBe(4);
    expect(state.owner.minutesByCategory.workshop).toBe(1);
  });
});

describe('ending the day', () => {
  it('ends it once however many times the button is pressed', () => {
    const state = clearEvents(createGame(OPTIONS));
    state.clock.minute = MINUTES_PER_WORKING_DAY + BREAK_MINUTES;
    const once = applyAction(state, { type: 'END_DAY' });
    expect(once.activeEvent?.kind).toBe('dayEnd');
    const twice = applyAction(once, { type: 'END_DAY' });
    expect(twice.eventQueue.filter((event) => event.kind === 'dayEnd')).toHaveLength(0);
    expect(clearEvents(choose(twice, 'next')).clock.day).toBe(2);
  });
});

describe('who can be sent at a job of work', () => {
  it('never offers a man who is not in the hall today', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    for (const specId of missingForHire(state, 'joiner')) {
      state = buyNow(state, specId);
    }
    state = clearEvents(hireNow(state, 'joiner', 'poor'));
    expect(state.workers).toHaveLength(1);
    // He does not start for a few days yet, so sending him would do nothing at all.
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw) saw.bagFull = true;
    const sawId = saw?.id ?? '';
    const ids = (next: GameState): string[] =>
      (next.activeEvent?.choices ?? []).map((choice) => choice.id);
    // He does not start for a few days yet, so sending him would do nothing at all.
    expect(ids(act(state, { type: 'ASK_BAG_CHANGE', equipmentId: sawId }))).toEqual([
      'owner',
      'later',
    ]);
    const joiner = state.workers[0];
    if (joiner) joiner.startDay = state.clock.day;
    expect(ids(act(state, { type: 'ASK_BAG_CHANGE', equipmentId: sawId }))).toEqual([
      'owner',
      'joiner',
      'later',
    ]);
    // Hurt in the hall and off for three days: he is not offered again either.
    if (joiner) joiner.absentDaysRemaining = 3;
    expect(ids(act(state, { type: 'ASK_BAG_CHANGE', equipmentId: sawId }))).toEqual([
      'owner',
      'later',
    ]);
  });
});
