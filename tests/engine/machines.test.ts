import { describe, expect, it } from 'vitest';
import {
  ACCIDENT_DAYS_OFF,
  BAG_CHANGE_MINUTES,
  CLEANING_MINUTES,
  DUST_BANDS,
  DUST_PER_PRODUCTION_MINUTE,
  EXTRACTOR_BREAKDOWN_CHANCE,
  EXTRACTOR_BREAKDOWN_CHANCE_HIGH_DUST,
  EXTRACTOR_BROKEN_DUST_MULTIPLIER,
  EXTRACTOR_REPAIR_COST,
  EXTRACTOR_REPAIR_MINUTES,
  NO_HELPER_DUST_MULTIPLIER,
} from '../../src/engine/constants';
import {
  accidentRisk,
  bagBlocked,
  bagMachinesFor,
  bagsExist,
  dustBand,
  dustFactor,
  dustGainPerMinute,
  extractorBreakdownChance,
  has,
} from '../../src/engine/machines';
import { canBuy } from '../../src/engine/game';
import { tick } from '../../src/engine/index';
import type { GameEvent, GameState } from '../../src/engine/index';
import {
  act,
  buyStartingKit,
  clearEvents,
  eventsOfKind,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  runToDay,
} from '../helpers';

/** A workshop with the day 1 kit and a 400 job already at the bench. */
function atTheBench(options: { price?: number; seed?: number } = {}): GameState {
  const state = buyStartingKit(
    newGame({ difficulty: 'veryEasy', ...(options.seed === undefined ? {} : { seed: options.seed }) }),
  );
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: options.price ?? 4000, deadlineDays: 90 });
  const accepted = fillRack(
    act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false }),
  );
  firstJob(accepted).stage = 'ready';
  return act(accepted, { type: 'WORK_HERE', jobId: null });
}

describe('the catalogue', () => {
  it('shows the locked machines with a reason and refuses the sale', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    expect(canBuy(state, 'cnc')).toEqual({ ok: false, reason: 'Coming in a later stage.' });
    expect(canBuy(state, 'sprayBooth').ok).toBe(false);
    const tried = act(state, { type: 'BUY_EQUIPMENT', specId: 'sprayBooth' });
    expect(tried.equipment).toHaveLength(0);
  });

  it('asks for the thing a machine needs first', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    expect(canBuy(state, 'pelletiser').reason).toBe('Needs Central dust extraction system first');
    expect(canBuy(state, 'laptop').reason).toBe('Needs Desk first');
  });

  it('refuses a second one of something that stands alone', () => {
    const state = act(newGame(), { type: 'BUY_EQUIPMENT', specId: 'extractor' });
    expect(canBuy(state, 'extractor')).toEqual({ ok: false, reason: 'Already owned' });
    expect(canBuy(state, 'tableSaw').ok).toBe(true);
  });
});

describe('bags', () => {
  it('only exist with an extractor, and not with the central system', () => {
    const plain = newGame({ difficulty: 'veryEasy' });
    expect(bagsExist(plain)).toBe(false);
    const withExtractor = act(plain, { type: 'BUY_EQUIPMENT', specId: 'extractor' });
    expect(bagsExist(withExtractor)).toBe(true);
    const withSystem = act(withExtractor, { type: 'BUY_EQUIPMENT', specId: 'dustSystem' });
    expect(bagsExist(withSystem)).toBe(false);
  });

  it('belongs to the machines the material runs through', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'thicknesser' });
    expect(bagMachinesFor(state, 'sheet').map((item) => item.specId)).toEqual([
      'tableSaw',
      'edgebander',
    ]);
    expect(bagMachinesFor(state, 'solidWood').map((item) => item.specId)).toEqual(['thicknesser']);
  });

  it('stops the saw after 2400 minutes of use and asks who changes it', () => {
    const run = runToDay(atTheBench(), 8);
    const state = run.state;
    const bagEvents = eventsOfKind(run.events, 'bagFull');
    expect(bagEvents.length).toBeGreaterThanOrEqual(1);
    expect(bagEvents[0]?.title).toBe('Bag full: table saw');
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(saw?.minutesUsed).toBeLessThanOrEqual(2400);
    expect(bagEvents[0]?.choices.map((choice) => choice.id)).toEqual(['owner', 'later']);
  });

  it('costs the owner 15 minutes to change, and clears the machine', () => {
    let state = atTheBench();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw) saw.minutesUsed = 2399;
    state = tick(state, 1);
    expect(state.activeEvent?.kind).toBe('bagFull');
    expect(bagBlocked(state, 'sheet')).toBe(true);
    const stuck = tick(state, 10);
    expect(stuck.clock.minute).toBe(state.clock.minute);
    state = act(state, { type: 'RESOLVE_EVENT', choiceId: 'owner' });
    const task = state.tasks.find((entry) => entry.kind === 'bagChange');
    expect(task?.minutesTotal).toBe(BAG_CHANGE_MINUTES);
    expect(state.owner.currentTaskId).toBe(task?.id);
    state = tick(state, BAG_CHANGE_MINUTES);
    expect(bagBlocked(state, 'sheet')).toBe(false);
    const changed = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(changed?.bagFull).toBe(false);
    // The owner is back at the bench the moment the bag is on, so a minute of use may be on it.
    expect(changed?.minutesUsed).toBeLessThanOrEqual(1);
  });

  it('takes 15 minutes off a joiner when the owner has no minutes left', () => {
    let state = atTheBench();
    state.workers.push({
      id: 'staff-1',
      name: 'Ben',
      role: 'joiner',
      tier: 'normal',
      rate: 0.8,
      weeklyWage: 640,
      monthlyWage: 0,
      startDay: 1,
      jobId: null,
      taskId: null,
      absentDaysRemaining: 0,
      anchorX: 0,
      anchorY: 4,
    });
    // The joiner is at the bench and the owner has gone home, so only the joiner can do it.
    state = act(state, { type: 'ASSIGN_JOB', jobId: firstJob(state).id, workerId: 'staff-1' });
    state = act(state, { type: 'END_DAY' });
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw) saw.minutesUsed = 2399;
    state = tick(state, 1);
    expect(state.activeEvent?.kind).toBe('bagFull');
    expect(state.activeEvent?.choices.map((choice) => choice.id)).toEqual(['joiner', 'later']);
    state = act(state, { type: 'RESOLVE_EVENT', choiceId: 'joiner' });
    expect(state.workers[0]?.taskId).not.toBeNull();
    const job = firstJob(state);
    const before = job.labourRemaining;
    state = tick(state, 15);
    // He spent the quarter of an hour on the bag, not at his bench.
    expect(firstJob(state).labourRemaining).toBe(before);
    expect(state.workers[0]?.taskId).toBeNull();
    expect(bagBlocked(state, 'sheet')).toBe(false);
  });

  it('lets a helper change it for nothing and says nothing about it', () => {
    let state = atTheBench();
    state.workers.push({
      id: 'staff-h',
      name: 'Wes',
      role: 'helper',
      tier: null,
      rate: 0,
      weeklyWage: 420,
      monthlyWage: 0,
      startDay: 1,
      jobId: null,
      taskId: null,
      absentDaysRemaining: 0,
      anchorX: 0,
      anchorY: 4,
    });
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw) saw.minutesUsed = 2399;
    state = tick(state, 2);
    expect(state.activeEvent).toBeNull();
    expect(bagBlocked(state, 'sheet')).toBe(false);
    expect(state.owner.minutesByCategory.workshop).toBe(2);
  });

  it('never fills a bag once the central system is in', () => {
    let state = atTheBench();
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'dustSystem' });
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw) saw.minutesUsed = 2399;
    const events: GameEvent[] = [];
    state = clearEvents(tick(state, 300), events);
    expect(eventsOfKind(events, 'bagFull')).toHaveLength(0);
    expect(state.equipment.find((item) => item.specId === 'tableSaw')?.minutesUsed).toBe(2399);
  });
});

describe('dust', () => {
  it('rises with every minute of production', () => {
    const state = tick(atTheBench(), 100);
    expect(state.dust).toBeCloseTo(100 * DUST_PER_PRODUCTION_MINUTE, 6);
  });

  it('does not rise while nothing is being made', () => {
    const state = tick(buyStartingKit(newGame()), 200);
    expect(state.dust).toBe(0);
  });

  it('maps to the bands of CLAUDE.md 9.7', () => {
    expect(dustBand(0).label).toBe('clean');
    expect(dustFactor(40)).toBe(1);
    expect(dustBand(41).label).toBe('messy');
    expect(dustFactor(70)).toBe(0.95);
    expect(dustBand(71).label).toBe('dirty');
    expect(dustFactor(90)).toBe(0.85);
    expect(dustBand(91).label).toBe('dangerous');
    expect(dustFactor(100)).toBe(0.7);
    expect(DUST_BANDS).toHaveLength(4);
  });

  it('slows production once it is past 70', () => {
    const state = atTheBench();
    state.dust = 75;
    const before = firstJob(state).labourRemaining;
    const after = firstJob(tick(state, 60)).labourRemaining;
    const clean = atTheBench();
    const cleanDone =
      firstJob(clean).labourRemaining - firstJob(tick(clean, 60)).labourRemaining;
    expect(before - after).toBeCloseTo(cleanDone * 0.85, 4);
  });

  it('is doubled when the crew is too big to have no helper', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    expect(dustGainPerMinute(state)).toBeCloseTo(DUST_PER_PRODUCTION_MINUTE, 10);
    for (let index = 0; index < 5; index += 1) {
      state.workers.push({
        id: `staff-${index}`,
        name: `J${index}`,
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
    }
    expect(dustGainPerMinute(state)).toBeCloseTo(
      DUST_PER_PRODUCTION_MINUTE * NO_HELPER_DUST_MULTIPLIER,
      10,
    );
  });

  it('is cleared by the 120 minute clean', () => {
    let state = atTheBench();
    state.dust = 55;
    state = act(state, { type: 'START_CLEANING' });
    const task = state.tasks.find((entry) => entry.kind === 'cleaning');
    expect(task?.minutesTotal).toBe(CLEANING_MINUTES);
    state = tick(state, CLEANING_MINUTES);
    expect(state.dust).toBeLessThan(0.05);
    expect(state.owner.minutesByCategory.workshop).toBeGreaterThanOrEqual(CLEANING_MINUTES);
  });

  it('is cleared by the helper every Friday at no cost to the owner', () => {
    const state = atTheBench();
    state.workers.push({
      id: 'staff-h',
      name: 'Wes',
      role: 'helper',
      tier: null,
      rate: 0,
      weeklyWage: 420,
      monthlyWage: 0,
      startDay: 1,
      jobId: null,
      taskId: null,
      absentDaysRemaining: 0,
      anchorX: 0,
      anchorY: 4,
    });
    state.dust = 60;
    const friday = runToDay(state, 5).state;
    expect(friday.dust).toBe(0);
    expect(friday.owner.minutesByCategory.workshop).toBe(0);
  });

  it('marks the hall dangerous above 90', () => {
    const state = newGame();
    expect(accidentRisk(state)).toBe(false);
    state.dust = 95;
    expect(accidentRisk(state)).toBe(true);
  });

  it('puts a joiner off for three days when the hall is dangerous', () => {
    // 2% a day. One seed is a coin toss over two months, so four of them are run and the test
    // asks only that somebody gets hurt somewhere in them.
    const accidents: GameEvent[] = [];
    for (const seed of [1, 2, 3, 4]) {
      const state = atTheBench({ seed });
      state.dust = 95;
      state.workers.push({
        id: 'staff-1',
        name: 'Ben',
        role: 'joiner',
        tier: 'normal',
        rate: 0.8,
        weeklyWage: 640,
        monthlyWage: 0,
        startDay: 1,
        jobId: null,
        taskId: null,
        absentDaysRemaining: 0,
        anchorX: 0,
        anchorY: 4,
      });
      accidents.push(...eventsOfKind(runToDay(state, 60).events, 'accident'));
    }
    expect(accidents.length).toBeGreaterThanOrEqual(1);
    expect(accidents[0]?.data.days).toBe(ACCIDENT_DAYS_OFF);
  });
});

describe('the extractor', () => {
  it('breaks down more often when the hall is filthy', () => {
    const state = act(newGame({ difficulty: 'veryEasy' }), {
      type: 'BUY_EQUIPMENT',
      specId: 'extractor',
    });
    expect(extractorBreakdownChance(state)).toBe(EXTRACTOR_BREAKDOWN_CHANCE);
    state.dust = 80;
    expect(extractorBreakdownChance(state)).toBe(EXTRACTOR_BREAKDOWN_CHANCE_HIGH_DUST);
    const withSystem = act(state, { type: 'BUY_EQUIPMENT', specId: 'dustSystem' });
    expect(extractorBreakdownChance(withSystem)).toBe(0);
  });

  it('stops every machine until it is repaired, and the repair costs time and parts', () => {
    let state = atTheBench();
    const extractor = state.equipment.find((item) => item.specId === 'extractor');
    if (extractor) extractor.broken = true;
    const before = firstJob(state).labourRemaining;
    state = tick(state, 30);
    expect(firstJob(state).labourRemaining).toBe(before);
    expect(dustGainPerMinute(state)).toBeCloseTo(
      DUST_PER_PRODUCTION_MINUTE * EXTRACTOR_BROKEN_DUST_MULTIPLIER,
      10,
    );
    const cash = state.cash;
    state = act(state, { type: 'REPAIR_EXTRACTOR' });
    const task = state.tasks.find((entry) => entry.kind === 'repairExtractor');
    expect(task?.minutesTotal).toBe(EXTRACTOR_REPAIR_MINUTES);
    state = tick(state, EXTRACTOR_REPAIR_MINUTES);
    expect(state.equipment.find((item) => item.specId === 'extractor')?.broken).toBe(false);
    expect(cash - state.cash).toBe(EXTRACTOR_REPAIR_COST);
    const running = tick(state, 10);
    expect(firstJob(running).labourRemaining).toBeLessThan(before);
  });

  it('cannot break down when the central system is in', () => {
    let state = atTheBench();
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'dustSystem' });
    expect(has(state, 'dustSystem')).toBe(true);
    const run = runToDay(state, 40);
    expect(eventsOfKind(run.events, 'extractorBroken')).toHaveLength(0);
  });

  it('does break down eventually on its own', () => {
    let broken = 0;
    for (const seed of [1, 2, 3, 4]) {
      const state = atTheBench({ seed });
      state.dust = 80;
      broken += eventsOfKind(runToDay(state, 100).events, 'extractorBroken').length;
    }
    expect(broken).toBeGreaterThanOrEqual(1);
  });
});

describe('the central system and a bag that was already full', () => {
  it('unblocks the machine, because with the system there are no bags at all', () => {
    let state = atTheBench();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw) saw.bagFull = true;
    expect(bagBlocked(state, 'sheet')).toBe(true);
    state = act(state, { type: 'BUY_EQUIPMENT', specId: 'dustSystem' });
    expect(bagBlocked(state, 'sheet')).toBe(false);
    const working = tick(state, 30);
    expect(firstJob(working).labourRemaining).toBeLessThan(firstJob(state).labourRemaining);
  });

  it('reads the messy to dirty edge the same way everywhere', () => {
    const state = act(newGame({ difficulty: 'veryEasy' }), {
      type: 'BUY_EQUIPMENT',
      specId: 'extractor',
    });
    state.dust = 70;
    expect(dustBand(state.dust).label).toBe('messy');
    expect(extractorBreakdownChance(state)).toBe(EXTRACTOR_BREAKDOWN_CHANCE);
    state.dust = 70.5;
    expect(dustBand(state.dust).label).toBe('dirty');
    expect(extractorBreakdownChance(state)).toBe(EXTRACTOR_BREAKDOWN_CHANCE_HIGH_DUST);
  });
});

describe('a stopped machine can always be dealt with', () => {
  it('asks again who changes the bag when the machine is clicked', () => {
    let state = atTheBench();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw) saw.minutesUsed = 2399;
    state = tick(state, 1);
    expect(state.activeEvent?.kind).toBe('bagFull');
    // The player puts it off, and then thinks better of it.
    state = act(state, { type: 'RESOLVE_EVENT', choiceId: 'later' });
    expect(state.activeEvent).toBeNull();
    expect(bagBlocked(state, 'sheet')).toBe(true);
    state = act(state, { type: 'ASK_BAG_CHANGE', equipmentId: saw?.id ?? '' });
    expect(state.activeEvent?.kind).toBe('bagFull');
    state = act(state, { type: 'RESOLVE_EVENT', choiceId: 'owner' });
    state = tick(state, BAG_CHANGE_MINUTES);
    expect(bagBlocked(state, 'sheet')).toBe(false);
  });

  it('says nothing when the machine is running', () => {
    const state = atTheBench();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    const asked = act(state, { type: 'ASK_BAG_CHANGE', equipmentId: saw?.id ?? '' });
    expect(asked.activeEvent).toBeNull();
  });
});
