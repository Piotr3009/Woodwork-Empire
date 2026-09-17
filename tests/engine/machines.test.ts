import { describe, expect, it } from 'vitest';
import {
  ACCIDENT_DAYS_OFF,
  EQUIPMENT_SPECS,
  CLEANING_MINUTES,
  DUST_BANDS,
  DUST_PER_PRODUCTION_MINUTE,
  EXTRACTOR_BREAKDOWN_CHANCE,
  EXTRACTOR_BREAKDOWN_CHANCE_HIGH_DUST,
  EXTRACTOR_BROKEN_DUST_MULTIPLIER,
  EXTRACTOR_BROKEN_OUTPUT_FACTOR,
  MACHINE_REPAIR_COST_FRACTION,
  OVERDUE_BREAKDOWN_CHANCE,
  SERVICE_COST_FRACTION,
  SERVICE_INTERVAL_HOURS,
  SERVICE_MINUTES,
  EXTRACTOR_REPAIR_COST,
  REPAIR_MINUTES,
  NO_HELPER_DUST_MULTIPLIER,
  GATE_OUTPUT_BONUS,
  GATE_PRICE,
} from '../../src/engine/constants';
import { addWorkingDays } from '../../src/engine/clock';
import {
  familyShareOfJob,
  machineHoursPerDay,
  serviceDueOn,
} from '../../src/engine/production';
import {
  accidentRisk,
  familyStopped,
  hasExtraction,
  overdueBreakdownChance,
  serviceCostFor,

  machinesDueService,
  serviceDueIn,
  serviceIsDue,
  hasBenchFor,
  bagsExist,
  dustBand,
  dustFactor,
  dustGainPerMinute,
  extractorBreakdownChance,
  countOf,
  has,
  bestOutputFactor,
  claimMachine,
  gateCheck,
  hasGate,
  machineOutputFactor,
  outputFactorOf,
  variantFor,
} from '../../src/engine/machines';
import { canBuy } from '../../src/engine/game';
import { startProductionCheck } from '../../src/engine/jobs';
import { STATION_NO_BENCH, tick } from '../../src/engine/index';
import type { Equipment, GameEvent, GameState } from '../../src/engine/index';
import { renderHall } from '../../src/render/hall';
import {
  acceptNow,
  act,
  buyNow,
  buyStartingKit,
  eventsOfKind,
  fillRack,
  firstJob,
  hireNow,
  newGame,
  placeEnquiry,
  placeEquipment,
  runClock,
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
    acceptNow(state, enquiry.id, false),
  );
  firstJob(accepted).stage = 'ready';
  return act(accepted, { type: 'WORK_HERE', jobId: null });
}

describe('the catalogue', () => {
  it('locks nothing in the catalogue any more, and still asks for what a machine needs', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    // The CNC is unlocked from Turn 7 and wants extraction like any machine (T7 3.4).
    expect(canBuy(state, 'cnc').reason).toBe(
      'Needs Extractor or Central dust extraction system or Flexi extraction system first',
    );
    // The booth is unlocked in Turn 11: there are two products that ask for a sprayed finish now
    // (CLAUDE.md T11 3.7).
    expect(canBuy(state, 'sprayBooth').ok).toBe(true);
    const bought = buyNow(state, 'sprayBooth');
    expect(bought.equipment.some((item) => item.specId === 'sprayBooth')).toBe(true);
    // And nothing at all in the catalogue is behind a "coming later" now.
    expect(EQUIPMENT_SPECS.filter((spec) => spec.locked)).toEqual([]);
  });

  it('asks for the thing a machine needs first', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    // The pelletiser works off either ducted system (CLAUDE.md T4 3.5).
    expect(canBuy(state, 'pelletiser').reason).toBe(
      'Needs Central dust extraction system or Flexi extraction system first',
    );
    expect(canBuy(state, 'laptop').reason).toBe('Needs Desk first');
  });

  it('refuses a second one of something that stands alone', () => {
    // An extractor and a compressor may be owned several times over from Turn 10, because the
    // hall adds their capacity up (CLAUDE.md T10 3.1, 3.2). A thicknesser still stands alone.
    const state = buyNow(newGame(), 'thicknesser');
    expect(canBuy(state, 'thicknesser')).toEqual({ ok: false, reason: 'Already owned' });
    expect(canBuy(state, 'extractor').ok).toBe(true);
    const two = buyNow(buyNow(state, 'extractor'), 'extractor');
    expect(countOf(two, 'extractor')).toBe(2);
    expect(canBuy(two, 'extractor').ok).toBe(true);
  });
});

describe('the automatic gate (CLAUDE.md T13 3.11)', () => {
  /** A hall with a standard saw and a standard extractor, and money in the bank. */
  function shop(): GameState {
    const state = newGame({ difficulty: 'veryEasy' });
    placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 6, y: 1, id: 'kit-saw' });
    placeEquipment(state, 'extractor', { variantId: 'standard', x: 18, y: 6 });
    return state;
  }

  it('is worth two per cent of output on that machine and on nothing else', () => {
    const state = shop();
    const saw = state.equipment.find((item) => item.id === 'kit-saw');
    if (!saw) throw new Error('no saw');
    const base = variantFor(saw)?.outputFactor ?? 0;
    expect(base).toBe(1.05);
    expect(outputFactorOf(state, saw)).toBe(base);
    expect(hasGate(state, saw)).toBe(false);
    // Fitted through the action, which pays for it (game.ts, phase A) and marks the machine.
    const fitted = act(state, { type: 'BUY_GATE', equipmentId: 'kit-saw' });
    const gated = fitted.equipment.find((item) => item.id === 'kit-saw');
    if (!gated) throw new Error('no saw');
    expect(hasGate(fitted, gated)).toBe(true);
    expect(fitted.cash).toBe(state.cash - GATE_PRICE);
    expect(GATE_OUTPUT_BONUS).toBe(0.02);
    expect(outputFactorOf(fitted, gated)).toBe(1.071);
    // The projection and the board read the same factor as the man on it (CLAUDE.md T7 3.1).
    expect(bestOutputFactor(fitted, 'tableSaw')).toBe(1.071);
    expect(machineOutputFactor(fitted, 'sheet')).toBe(1.071);
    // A second saw of the same class without a gate is the one nobody prefers.
    placeEquipment(fitted, 'tableSaw', { variantId: 'standard', x: 10, y: 1, id: 'kit-saw-2' });
    expect(claimMachine(fitted, 'owner', 'tableSaw')?.id).toBe('kit-saw');
  });

  it('is refused on a machine with no extraction demand, twice on one machine, and without the cash', () => {
    const state = shop();
    placeEquipment(state, 'workbench', { variantId: 'budget', x: 2, y: 8, id: 'kit-bench' });
    placeEquipment(state, 'edgebander', { variantId: 'budget', x: 2, y: 4, id: 'kit-hand' });
    expect(gateCheck(state, 'kit-bench')).toEqual({ ok: false, reason: 'It wants no extraction' });
    // A hand edgebander is used at a bench and wants none either (CLAUDE.md T10 3.1).
    expect(gateCheck(state, 'kit-hand')).toEqual({ ok: false, reason: 'It wants no extraction' });
    expect(gateCheck(state, 'nothing')).toEqual({ ok: false, reason: 'No such machine' });
    expect(gateCheck(state, 'kit-saw')).toEqual({ ok: true, reason: '' });
    const fitted = act(state, { type: 'BUY_GATE', equipmentId: 'kit-saw' });
    expect(gateCheck(fitted, 'kit-saw')).toEqual({ ok: false, reason: 'Fitted already' });
    // A second click on the same button does nothing more (CLAUDE.md T13 1).
    const again = act(fitted, { type: 'BUY_GATE', equipmentId: 'kit-saw' });
    expect(again.cash).toBe(fitted.cash);
    expect(again.gates).toEqual(['kit-saw']);
    // And the bench refused by the action too, with nothing paid.
    const bench = act(state, { type: 'BUY_GATE', equipmentId: 'kit-bench' });
    expect(bench.cash).toBe(state.cash);
    expect(bench.gates).toEqual([]);
    const broke = shop();
    broke.cash = GATE_PRICE - 1;
    broke.finance.overdraftLimit = 0;
    expect(gateCheck(broke, 'kit-saw')).toEqual({ ok: false, reason: 'Not enough cash' });
  });
});

describe('bags', () => {
  it('only exist with an extractor, and not with the central system', () => {
    const plain = newGame({ difficulty: 'veryEasy' });
    expect(bagsExist(plain)).toBe(false);
    const withExtractor = buyNow(plain, 'extractor');
    expect(bagsExist(withExtractor)).toBe(true);
    const withSystem = buyNow(withExtractor, 'dustSystem');
    expect(bagsExist(withSystem)).toBe(false);
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
        minutesWorked: 0,
        ordersToday: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
        station: 'idle',
        productionMinutes: 0,
        absentDaysRemaining: 0,
        shift: 'day',
        dayLog: [],
        monthMinutes: 0,
        monthDaysOff: 0,
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

  it('is swept by the helper the moment the hall stops being clean, at no cost to the owner', () => {
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
      minutesWorked: 0,
      ordersToday: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
      station: 'idle',
      productionMinutes: 0,
      absentDaysRemaining: 0,
      shift: 'day',
      dayLog: [],
      monthMinutes: 0,
      monthDaysOff: 0,
      anchorX: 0,
      anchorY: 4,
    });
    state.dust = 60;
    // Past clean, so the brush comes out that morning without anybody asking, and the two hours
    // are his (PIOTR, 16.09; CLAUDE.md T17 2.3).
    const swept = runClock(state, CLEANING_MINUTES + 30);
    expect(swept.dust).toBeLessThan(DUST_BANDS[0]?.max ?? 40);
    expect(swept.tasks.find((task) => task.kind === 'cleaning')?.doneBy).toBe('staff-h');
    // Not a minute of the owner's day went on it: his are at the bench where they were.
    expect(swept.owner.dayLog.some((entry) => entry.category === 'fixing')).toBe(false);
    // And the standing Friday clean is on the list on the Friday, his as well.
    const friday = runToDay(swept, 5).state;
    expect(
      friday.tasks.some((task) => task.kind === 'cleaning' && task.label === 'Weekly clean'),
    ).toBe(true);
    expect(friday.owner.dayLog.some((entry) => entry.category === 'fixing')).toBe(false);
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
        minutesWorked: 0,
        ordersToday: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
        station: 'idle',
        productionMinutes: 0,
        absentDaysRemaining: 0,
        shift: 'day',
        dayLog: [],
        monthMinutes: 0,
        monthDaysOff: 0,
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
    const state = buyNow(newGame({ difficulty: 'veryEasy' }), 'extractor');
    expect(extractorBreakdownChance(state)).toBe(EXTRACTOR_BREAKDOWN_CHANCE);
    state.dust = 80;
    expect(extractorBreakdownChance(state)).toBe(EXTRACTOR_BREAKDOWN_CHANCE_HIGH_DUST);
    const withSystem = buyNow(state, 'dustSystem');
    expect(extractorBreakdownChance(withSystem)).toBe(0);
  });

  it('lets the hall crawl on at a quarter speed, and costs time and parts to put right', () => {
    let state = atTheBench();
    const extractor = state.equipment.find((item) => item.specId === 'extractor');
    if (extractor) extractor.broken = true;
    const before = firstJob(state).labourRemaining;
    const slow = tick(state, 30);
    const doneBroken = before - firstJob(slow).labourRemaining;
    expect(doneBroken).toBeGreaterThan(0);
    expect(dustGainPerMinute(state)).toBeCloseTo(
      DUST_PER_PRODUCTION_MINUTE * EXTRACTOR_BROKEN_DUST_MULTIPLIER,
      10,
    );
    const cash = state.cash;
    state = act(state, { type: 'REPAIR_MACHINE', equipmentId: extractor?.id ?? '' });
    const task = state.tasks.find((entry) => entry.kind === 'repair');
    expect(task?.minutesTotal).toBe(REPAIR_MINUTES);
    state = tick(state, REPAIR_MINUTES);
    expect(state.equipment.find((item) => item.specId === 'extractor')?.broken).toBe(false);
    expect(cash - state.cash).toBe(EXTRACTOR_REPAIR_COST);
    // Mended, and the same half hour now does four times the work (CLAUDE.md T2 3.9).
    const running = tick(state, 30);
    const doneMended = firstJob(state).labourRemaining - firstJob(running).labourRemaining;
    expect(doneMended / doneBroken).toBeCloseTo(1 / EXTRACTOR_BROKEN_OUTPUT_FACTOR, 6);
  });

  it('cannot break down when the central system is in', () => {
    let state = atTheBench();
    state = buyNow(state, 'dustSystem');
    expect(has(state, 'dustSystem')).toBe(true);
    const run = runToDay(state, 40);
    expect(eventsOfKind(run.events, 'machineBroken')).toHaveLength(0);
  });

  it('does break down eventually on its own', () => {
    let broken = 0;
    for (const seed of [1, 2, 3, 4]) {
      const state = atTheBench({ seed });
      state.dust = 80;
      broken += eventsOfKind(runToDay(state, 100).events, 'machineBroken').length;
    }
    expect(broken).toBeGreaterThanOrEqual(1);
  });
});

describe('the messy to dirty edge', () => {
  it('is read the same way everywhere', () => {
    const state = buyNow(newGame({ difficulty: 'veryEasy' }), 'extractor');
    state.dust = 70;
    expect(dustBand(state.dust).label).toBe('messy');
    expect(extractorBreakdownChance(state)).toBe(EXTRACTOR_BREAKDOWN_CHANCE);
    state.dust = 70.5;
    expect(dustBand(state.dust).label).toBe('dirty');
    expect(extractorBreakdownChance(state)).toBe(EXTRACTOR_BREAKDOWN_CHANCE_HIGH_DUST);
  });
});

describe('no extraction at all', () => {
  it('refuses to run the machines and says why on the job', () => {
    let state = atTheBench();
    // Take the extractor out of the hall, the way the bailiff would.
    state.equipment = state.equipment.filter((item) => item.specId !== 'extractor');
    expect(hasExtraction(state)).toBe(false);
    const before = firstJob(state).labourRemaining;
    state = tick(state, 60);
    expect(firstJob(state).labourRemaining).toBe(before);
    expect(firstJob(state).blockedBy).toBe('no extraction');
    expect(renderHall(state)).toContain('No extraction in the hall');
    // Buy one and the bench starts again.
    const fixed = tick(buyNow(state, 'extractor'), 10);
    expect(firstJob(fixed).labourRemaining).toBeLessThan(before);
    expect(firstJob(fixed).blockedBy).toBe('');
  });

  it('lets a by hand job carry on without any extraction at all', () => {
    let state = atTheBench();
    state.equipment = state.equipment.filter((item) => item.specId !== 'extractor');
    firstJob(state).byHand = true;
    const before = firstJob(state).labourRemaining;
    state = tick(state, 60);
    expect(firstJob(state).labourRemaining).toBeLessThan(before);
  });
});

describe('no bench in the hall', () => {
  it('will not start production with a saw and no bench, and a bench unblocks it', () => {
    let state = atTheBench();
    // Take the bench out of the hall, leaving the saw and the extraction standing.
    state.equipment = state.equipment.filter((item) => item.specId !== 'workbench');
    expect(has(state, 'tableSaw')).toBe(true);
    expect(hasExtraction(state)).toBe(true);
    expect(hasBenchFor(state, firstJob(state).id)).toBe(false);
    const before = firstJob(state).labourRemaining;
    state = tick(state, 60);
    expect(firstJob(state).labourRemaining).toBe(before);
    expect(firstJob(state).blockedBy).toBe('no bench');
    // The extraction comes first in the list, so the bench is the next thing it names.
    expect(startProductionCheck(state, firstJob(state)).reason).toBe('no bench');
    const bought = tick(buyNow(state, 'workbench'), 10);
    expect(firstJob(bought).labourRemaining).toBeLessThan(before);
    expect(firstJob(bought).blockedBy).toBe('');
  });

  it('says no extraction before it says no bench', () => {
    const state = atTheBench();
    state.equipment = state.equipment.filter(
      (item) => item.specId !== 'workbench' && item.specId !== 'extractor',
    );
    expect(startProductionCheck(state, firstJob(state)).reason).toBe('no extraction');
  });

  it('never turns a man off a bench he is already standing at', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    for (const specId of ['locker', 'canteenSeat', 'toolCabinet', 'handToolSet']) {
      state = buyNow(state, specId);
    }
    state = hireNow(state, 'joiner', 'poor');
    const joiner = state.workers[0];
    if (!joiner) throw new Error('nobody was hired');
    joiner.startDay = state.clock.day;
    // Two jobs, in the order they were accepted, and one bench in the hall.
    for (const name of ['Accepted first', 'Accepted second']) {
      const enquiry = placeEnquiry(state, { price: 400, name, deadlineDays: 90 });
      state = acceptNow(state, enquiry.id, false);
    }
    const first = state.jobs[0];
    const second = state.jobs[1];
    if (!first || !second) throw new Error('two jobs wanted');
    second.stage = 'ready';
    expect(state.equipment.filter((item) => item.specId === 'workbench')).toHaveLength(1);
    // The second job gets to the one bench first, with the owner on it.
    state = act(state, { type: 'ASSIGN_JOB', jobId: second.id, workerId: 'owner' });
    expect(hasBenchFor(state, second.id)).toBe(true);
    state = tick(state, 1);
    // A minute later the joiner is put on the first job, which sits earlier on the books.
    const waiting = state.jobs[0];
    if (!waiting) throw new Error('no first job');
    waiting.stage = 'ready';
    state = act(state, { type: 'ASSIGN_JOB', jobId: first.id, workerId: joiner.id });
    expect(state.jobs[0]?.id).toBe(first.id);
    // The owner keeps the bench he is standing at; the joiner is the one with nowhere to work.
    expect(hasBenchFor(state, second.id)).toBe(true);
    expect(hasBenchFor(state, first.id)).toBe(false);
    // And what holds it is the claim on the bench itself, not a minute written on the job
    // (CLAUDE.md T7 3.1).
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    expect(bench?.takenBy).toBe('owner');
  });

  it('stands a joiner with nowhere to work at the canteen door', () => {
    let state = atTheBench();
    // He is taken on while there is a bench, with the kit a joiner has to have, and starts today.
    for (const specId of ['locker', 'canteenSeat', 'toolCabinet', 'handToolSet']) {
      state = buyNow(state, specId);
    }
    state = hireNow(state, 'joiner', 'poor');
    const joiner = state.workers[0];
    if (!joiner) throw new Error('nobody was hired');
    joiner.startDay = state.clock.day;
    // A second job with its material in the hall, and then the bailiff takes the bench.
    const second = placeEnquiry(state, { price: 400, name: 'Garage shelves' });
    state = acceptNow(state, second.id, false);
    const waiting = state.jobs[1];
    if (!waiting) throw new Error('no second job');
    waiting.stage = 'ready';
    state.equipment = state.equipment.filter((item) => item.specId !== 'workbench');
    state = tick(state, 1);
    expect(state.workers[0]?.station).toBe(STATION_NO_BENCH);
    expect(state.owner.station).toBe(STATION_NO_BENCH);
    expect(renderHall(state)).toContain('no bench');
  });
});

/** Puts hours on a machine without running the workshop for weeks to get them. */
function withHours(state: GameState, specId: string, hours: number): GameState {
  const next = { ...state, equipment: state.equipment.map((item) => ({ ...item })) };
  const machine = next.equipment.find((item) => item.specId === specId);
  if (machine) machine.hoursUsed = hours;
  return next;
}

describe('the service, counted on the machine\u0027s own clock', () => {
  it('falls due after its hours, not after a month of the calendar', () => {
    const state = atTheBench();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(saw?.serviceHours).toBe(0);
    expect(serviceIsDue(saw as Equipment)).toBe(false);
    expect(serviceCostFor(saw as Equipment)).toBe(1800 * SERVICE_COST_FRACTION);
    // A month of the calendar with nothing put through it is not a service.
    const idle = runToDay({ ...state, jobs: [] }, 1 + 30);
    expect(machinesDueService(idle.state)).toEqual([]);
    // Its hours are what bring it due.
    const worn = withHours(state, 'tableSaw', SERVICE_INTERVAL_HOURS);
    const wornSaw = worn.equipment.find((item) => item.specId === 'tableSaw');
    expect(serviceIsDue(wornSaw as Equipment)).toBe(true);
    expect(serviceDueIn(wornSaw as Equipment)).toBe(0);
  });

  it('says which day it lands on at the rate the machine is used, or that it never will', () => {
    const state = atTheBench();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    const job = state.jobs.find((entry) => entry.stage === 'inProduction');
    if (!job) throw new Error('nobody at a bench');
    // One man, and the cutting is the only stage of his job that wants the saw (T7 3.1).
    const perDay = familyShareOfJob(state, job, 'tableSaw') * 8;
    expect(machineHoursPerDay(state, saw as Equipment)).toBeCloseTo(perDay, 6);
    const days = Math.ceil(SERVICE_INTERVAL_HOURS / perDay);
    // Working days, not days of the calendar: the saw gains nothing over a weekend, so counting
    // the weekends in would put every service a fortnight too early.
    expect(serviceDueOn(state, saw as Equipment)).toBe(addWorkingDays(state.clock.day, days));
    expect(serviceDueOn(state, saw as Equipment)).toBeGreaterThan(state.clock.day + days);
    // Nothing on the bench and nothing wears out.
    const quiet = { ...state, jobs: [] };
    expect(machineHoursPerDay(quiet, saw as Equipment)).toBe(0);
    expect(serviceDueOn(quiet, saw as Equipment)).toBeNull();
  });

  it('raises the service and is done in half an hour, and the clock starts again', () => {
    let state = withHours(atTheBench(), 'tableSaw', SERVICE_INTERVAL_HOURS);
    const run = runToDay(state, state.clock.day + 1);
    const due = eventsOfKind(run.events, 'serviceDue');
    expect(due.length).toBeGreaterThanOrEqual(1);
    expect(due[0]?.title).toContain('Service due');
    state = run.state;
    const task = state.tasks.find((entry) => entry.kind === 'service' && !entry.done);
    expect(task?.minutesTotal).toBe(SERVICE_MINUTES);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    const cash = state.cash;
    state = act(state, { type: 'SERVICE_MACHINE', equipmentId: saw?.id ?? '' });
    state = tick(state, SERVICE_MINUTES);
    const serviced = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(serviced?.serviceHours).toBe(serviced?.hoursUsed);
    expect(serviceIsDue(serviced as Equipment)).toBe(false);
    expect(cash - state.cash).toBeCloseTo(serviceCostFor(saw as Equipment), 6);
  });

  it('gives an overdue machine a 2% chance a day of giving up, and it is out until repaired', () => {
    const state = atTheBench();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(overdueBreakdownChance(saw as Equipment)).toBe(0);
    // Put a month of hours on the saw, so it is the only machine that is overdue.
    const broken = { ...state, equipment: state.equipment.map((item) => ({ ...item })) };
    const target = broken.equipment.find((item) => item.specId === 'tableSaw');
    if (target) target.hoursUsed = SERVICE_INTERVAL_HOURS;
    expect(overdueBreakdownChance(target as Equipment)).toBe(OVERDUE_BREAKDOWN_CHANCE);
    if (target) target.broken = true;
    expect(familyStopped(broken, 'tableSaw')?.item.specId).toBe('tableSaw');
    const before = firstJob(broken).labourRemaining;
    const idle = tick(broken, 60);
    expect(firstJob(idle).labourRemaining).toBe(before);
    expect(firstJob(idle).blockedBy).toBe('table saw is broken');
    // The repair is 90 minutes and 5% of what the saw cost.
    const cash = idle.cash;
    let fixed = act(idle, { type: 'REPAIR_MACHINE', equipmentId: target?.id ?? '' });
    fixed = tick(fixed, REPAIR_MINUTES);
    expect(fixed.equipment.find((item) => item.specId === 'tableSaw')?.broken).toBe(false);
    expect(cash - fixed.cash).toBeCloseTo(1800 * MACHINE_REPAIR_COST_FRACTION, 6);
  });

  it('breaks an overdue machine sooner or later, and never a serviced one', () => {
    let broken = 0;
    for (const seed of [1, 2, 3, 4]) {
      // The saw starts the run with a month of hours on it and no service against them, and the
      // owner never gets round to it, which is the case the roll is about.
      let state = withHours(atTheBench({ seed }), 'tableSaw', SERVICE_INTERVAL_HOURS);
      // The extractor gives up on dust, not on a service it never had: it is not counted here.
      const machines = new Set(
        state.equipment.filter((item) => item.specId !== 'extractor').map((item) => item.id),
      );
      const seen: GameEvent[] = [];
      let guard = 0;
      while (state.clock.day < 120 && state.gameOver === null && guard < 8000) {
        guard += 1;
        const event = state.activeEvent;
        if (event !== null) {
          seen.push(event);
          const wanted = event.kind === 'serviceDue' ? 'later' : event.choices[0]?.id ?? 'ok';
          state = act(state, { type: 'RESOLVE_EVENT', choiceId: wanted });
          continue;
        }
        const stepped = tick(state, 60);
        if (stepped.clock.day === state.clock.day && stepped.clock.minute === state.clock.minute) {
          state = act(state, { type: 'END_DAY' });
          continue;
        }
        state = stepped;
      }
      broken += seen
        .filter((event) => event.kind === 'machineBroken')
        .filter((event) => machines.has(String(event.data.equipmentId))).length;
    }
    expect(broken).toBeGreaterThanOrEqual(1);
  });
});
