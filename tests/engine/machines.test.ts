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
  SERVICE_INTERVAL_DAYS,
  EXTRACTOR_REPAIR_COST,
  REPAIR_MINUTES,
  NO_HELPER_DUST_MULTIPLIER,
  GATE_OUTPUT_BONUS,
  GATE_PRICE,
} from '../../src/engine/constants';
import {
  accidentRisk,
  familyStopped,
  hasExtraction,
  overdueBreakdownChance,
  serviceCostFor,

  machinesDueService,
  serviceDueIn,
  serviceDueOn,
  serviceIsDue,
  benchOf,
  benchPlacesOf,
  hallHasABench,
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
import { hallProblems, renderHall } from '../../src/render/hall';
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

  it('lets a second one of anything be bought, floor and money allowing', () => {
    // Nothing stands alone since v37: a second thicknesser, edgebander or booth is bought like a
    // second extractor, and only the floor, the money and the extraction say no
    // (PIOTR, 20.09: "everything in any number").
    const state = buyNow(newGame(), 'thicknesser');
    expect(canBuy(state, 'thicknesser').ok).toBe(true);
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
        tier: 'novice',
        rate: 0.6,
        monthlyWage: 1950,
        leavesOnDay: null,
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
        idleMinutes: 0,
        idleByReason: { waitingForBoss: 0, noMachine: 0, noMaterial: 0 },
        accidents: 0,
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
      monthlyWage: 1800,
      leavesOnDay: null,
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
      idleMinutes: 0,
      idleByReason: { waitingForBoss: 0, noMachine: 0, noMaterial: 0 },
      accidents: 0,
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
    // The sweeping is raised the moment there is dirt on the floor now (CLAUDE.md T20 2.8), so by
    // Friday morning one of his is usually open already, `ensureTask` finds it and keeps its own
    // label, `Sweep the hall`. The Friday clean still happens and is still his, which is what this
    // test is about; the label is not.
    expect(friday.tasks.some((task) => task.kind === 'cleaning' && !task.done)).toBe(true);
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
        tier: 'experienced',
        rate: 0.8,
        monthlyWage: 2600,
        leavesOnDay: null,
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
        idleMinutes: 0,
        idleByReason: { waitingForBoss: 0, noMachine: 0, noMaterial: 0 },
        accidents: 0,
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
    // And the hall says so on a chip over the floor (CLAUDE.md T17 2.5).
    expect(hallProblems(state).some((problem) => problem.text.startsWith('No extraction'))).toBe(
      true,
    );
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
    expect(hallHasABench(state)).toBe(false);
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
    for (const specId of ['locker', 'toolCabinet', 'handToolSet']) {
      state = buyNow(state, specId);
    }
    state = hireNow(state, 'joiner', 'novice');
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
    // It was a claim on the bench until Turn 23 and it is a place at one now, so nobody is ever
    // turned off one: there is nothing to turn him off. The one bench of this hall holds one man,
    // and the man who has him is the joiner, because the crew fill the benches in the order they
    // were hired and the owner takes what is left over. The gate bought that bench for the
    // joiner, so the joiner is not the one standing at the canteen door (CLAUDE.md T7 3.1,
    // T23 2.17).
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    if (!bench) throw new Error('one bench wanted');
    expect(benchPlacesOf(bench)).toBe(1);
    expect(benchOf(state, joiner.id)?.id ?? null).toBe(bench.id);
    expect(benchOf(state, 'owner')).toBeNull();
    // The owner is put on the second job with no place at a bench and the joiner on the first
    // with one. The hall has a bench, so neither job is stopped by the hall; the owner's own
    // question is asked of him at the stages done at a bench, in `placeHand` (v47).
    state = act(state, { type: 'ASSIGN_JOB', jobId: second.id, workerId: 'owner' });
    expect(hallHasABench(state)).toBe(true);
    state = tick(state, 1);
    const waiting = state.jobs[0];
    if (!waiting) throw new Error('no first job');
    waiting.stage = 'ready';
    state = act(state, { type: 'ASSIGN_JOB', jobId: first.id, workerId: joiner.id });
    expect(state.jobs[0]?.id).toBe(first.id);
    expect(benchOf(state, joiner.id)?.id ?? null).toBe(bench.id);
    expect(benchOf(state, 'owner')).toBeNull();
  });

  it('stands a joiner with nowhere to work at the canteen door', () => {
    let state = atTheBench();
    // He is taken on while there is a bench, with the kit a joiner has to have, and starts today.
    for (const specId of ['locker', 'toolCabinet', 'handToolSet']) {
      state = buyNow(state, specId);
    }
    state = hireNow(state, 'joiner', 'novice');
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

/** Backdates a machine's last service so that the six months to the next one are up today,
 *  without running the workshop for six months to get there (v50). */
function withServiceDue(state: GameState, specId: string): GameState {
  const next = { ...state, equipment: state.equipment.map((item) => ({ ...item })) };
  const machine = next.equipment.find((item) => item.specId === specId);
  if (machine) machine.servicedDay = state.clock.day - SERVICE_INTERVAL_DAYS;
  return next;
}

describe('the service, every six months on the calendar (PIOTR, 22.09; v50)', () => {
  it('falls due six months after the purchase or the last service, whatever hours it has run', () => {
    // Until v50 it fell due after 80 hours of the machine's own clock, so a saw with three men on
    // it went in every nine working days (twenty services in Piotr's first 115 days).
    const state = atTheBench();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(saw?.servicedDay).toBe(state.clock.day);
    expect(serviceIsDue(saw as Equipment, state.clock.day)).toBe(false);
    expect(serviceCostFor(saw as Equipment)).toBe(1800 * SERVICE_COST_FRACTION);
    // A month of the calendar, run or not, is not a service.
    const idle = runToDay({ ...state, jobs: [] }, 1 + 30);
    expect(machinesDueService(idle.state)).toEqual([]);
    // Hours on it bring nothing due.
    const worn = { ...state, equipment: state.equipment.map((item) => ({ ...item, hoursUsed: 500 })) };
    expect(machinesDueService(worn)).toEqual([]);
    // The calendar does.
    const due = withServiceDue(state, 'tableSaw');
    const dueSaw = due.equipment.find((item) => item.specId === 'tableSaw');
    expect(serviceIsDue(dueSaw as Equipment, state.clock.day)).toBe(true);
    expect(serviceDueIn(dueSaw as Equipment, state.clock.day)).toBe(0);
    expect(machinesDueService(due).map((item) => item.specId)).toEqual(['tableSaw']);
  });

  it('says which day it lands on: six months on from the last one, whether the machine runs or stands', () => {
    const state = atTheBench();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(serviceDueOn(saw as Equipment)).toBe(state.clock.day + SERVICE_INTERVAL_DAYS);
    expect(serviceDueIn(saw as Equipment, state.clock.day)).toBe(SERVICE_INTERVAL_DAYS);
    expect(serviceDueIn(saw as Equipment, state.clock.day + 100)).toBe(SERVICE_INTERVAL_DAYS - 100);
    // Nothing on the bench, the same date: the calendar does not care.
    const quiet = { ...state, jobs: [] };
    expect(serviceDueOn(quiet.equipment.find((item) => item.specId === 'tableSaw') as Equipment)).toBe(
      state.clock.day + SERVICE_INTERVAL_DAYS,
    );
  });

  it('raises the service, and calling it in pays for it and starts the six months again', () => {
    // Turn 8's half hour at the spanner is gone: a service is called in and paid for at the call,
    // and the machine is away for the working day (PIOTR, 18.09; CLAUDE.md T20 2.9.2, 2.9.3).
    let state = withServiceDue(atTheBench(), 'tableSaw');
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    // `runToDay` answers whatever the day throws up with its first choice, which is Call it in.
    const run = runToDay(state, state.clock.day + 1);
    const due = eventsOfKind(run.events, 'serviceDue');
    expect(due.length).toBeGreaterThanOrEqual(1);
    expect(due[0]?.title).toContain('Service due');
    expect(due[0]?.body).toContain('6 months since the last one');
    expect(due[0]?.choices[0]?.id).toBe('service');
    state = run.state;
    // Nothing is left on the list for anybody to stand at.
    expect(state.tasks.some((entry) => entry.kind === 'service' && !entry.done)).toBe(false);
    const serviced = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(serviced?.servicedDay).toBeGreaterThanOrEqual(1);
    expect(serviced?.servicedDay).toBeLessThanOrEqual(state.clock.day);
    expect(serviceIsDue(serviced as Equipment, state.clock.day)).toBe(false);
    expect(serviceDueOn(serviced as Equipment)).toBe((serviced?.servicedDay ?? 0) + SERVICE_INTERVAL_DAYS);
    // The bill went out at the call, on its own line, and it is a tenth of what the saw cost.
    const bill = state.ledger.find((entry) => entry.label.endsWith('service'));
    expect(bill?.amount).toBeCloseTo(-serviceCostFor(saw as Equipment), 6);
  });

  it('gives an overdue machine a 2% chance a day of giving up, and it is out until repaired', () => {
    const state = atTheBench();
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(overdueBreakdownChance(saw as Equipment, state.clock.day)).toBe(0);
    // Let the saw's six months run out, so it is the only machine that is overdue.
    const broken = withServiceDue(state, 'tableSaw');
    const target = broken.equipment.find((item) => item.specId === 'tableSaw');
    expect(overdueBreakdownChance(target as Equipment, state.clock.day)).toBe(OVERDUE_BREAKDOWN_CHANCE);
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
      // The saw starts the run with its six months up and no service called, and the owner never
      // gets round to it, which is the case the roll is about.
      let state = withServiceDue(atTheBench({ seed }), 'tableSaw');
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
