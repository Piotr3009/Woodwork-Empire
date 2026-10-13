/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The Turn 32 scenarios of CLAUDE.md T32 E2. The letters follow Turn 31's (lll).
//
// (mmm) A company in the 800 m2 hall with one timber rack (40 boards) and one glass rack (40 units)
//       restocks 60 boards and 30 glass units: the ladder's price for the boards, 200 a unit for the
//       glass, the 20 boards past the rack's room into the paid store and fetched the next morning.
//       It takes a casement window job that holds 12 boards and 7 glass units at once and makes it
//       through its Glazing, taking its glass there; a second window, taken by a company of the same
//       shape with its stores empty, has its shortfall of both ordered by the office admin and in on
//       the next working day's two lorries.
// (nnn) A line on its contract with an office admin and both stores runs a played month without
//       standing for material, every board and glass unit it used bought by his restocks; the same
//       line with no admin stands with `no timber` once the stores run dry, and a player's Restock of
//       each sets it going again.
// (ooo) A v95 save of a running line with its boards, its glass at module 6, glass on its way, a
//       load of its timber on the road and a timber job with its glass ordered opens on v96 and plays
//       a week: nothing lost, nothing bought twice, the line and the job carry on.

import { describe, expect, it } from 'vitest';
import { LINE_MODULES, TEMP_STORAGE_COST } from '../../src/engine/constants';
import { applyAction, runMinutes, tick } from '../../src/engine/index';
import type { GameEvent, GameState, Job, Worker } from '../../src/engine/index';
import { isOvertime, isWorkingDay } from '../../src/engine/clock';
import { lineShortOf, lineState, lineWindowsAWeek, runLineDay } from '../../src/engine/lineContract';
import { migrateState } from '../../src/engine/migrate';
import { warnings } from '../../src/engine/warnings';
import { acceptNow, act, buyStartingKit, newGame, nextDay, placeEnquiry, placeEquipment, placeGlassRack, testJoiner, withAir } from '../helpers';

// ---------------------------------------------------------------------------------------------
// The plays
// ---------------------------------------------------------------------------------------------

/** The answer a script gives a card: the line's offer taken, every other card its first choice. */
function answer(event: GameEvent): string {
  if (event.kind === 'lineContractOffered') return 'take';
  return event.choices[0]?.id ?? 'ok';
}

/** One hour of the clock, every card answered, home at five. */
function hour(state: GameState, seen: GameEvent[]): GameState {
  let next = tick(state, 60);
  for (let guard = 0; guard < 500; guard += 1) {
    if (next.activeEvent === null) {
      if (isOvertime(next.clock.minute) && !next.owner.wentHome) {
        next = applyAction(next, { type: 'END_DAY' });
        continue;
      }
      break;
    }
    seen.push(next.activeEvent);
    next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: answer(next.activeEvent) });
  }
  return next;
}

/** Plays to the open of the next day. */
function day(state: GameState, seen: GameEvent[] = []): GameState {
  let next = state;
  const today = next.clock.day;
  for (let guard = 0; next.clock.day === today && next.gameOver === null && guard < 200; guard += 1) next = hour(next, seen);
  return next;
}

/** The desk work of a job the owner does himself (CLAUDE.md T7 3.11, T13 3.8): when his hands are
 *  free he starts the oldest open one, through the same click the player makes. */
const DESK_WORK: ReadonlyArray<string> = ['emails', 'clientMeeting', 'clientCall', 'design', 'materialTakeOff'];

function deskWork(state: GameState): GameState {
  if (state.owner.currentTaskId !== null) return state;
  const task = state.tasks.find((entry) => !entry.done && entry.jobId !== null && DESK_WORK.includes(entry.kind));
  return task === undefined ? state : applyAction(state, { type: 'START_TASK', taskId: task.id });
}

/** Plays minutes of the clock, every card answered and the owner at his desk work. */
function minutes(state: GameState, count: number): GameState {
  let next = state;
  let left = count;
  for (let guard = 0; left > 0 && guard < 400; guard += 1) {
    if (next.activeEvent !== null) {
      next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: answer(next.activeEvent) });
      continue;
    }
    next = deskWork(next);
    const result = runMinutes(next, Math.min(left, 30));
    next = result.state;
    left -= result.minutesRun;
    if (result.minutesRun === 0 && next.activeEvent === null) break;
  }
  return next;
}

/** The ledger's lines of this label. */
function line(state: GameState, label: string): number[] {
  return state.ledger.filter((entry) => entry.label === label).map((entry) => entry.amount);
}

function admin(): Worker {
  return { ...testJoiner('adm-1', 'Anna'), role: 'officeAdmin', tier: null, rate: 0, monthlyWage: 2000 };
}

/** A labourer, who takes every unloading as it comes (CLAUDE.md T11 3.4): two lorries in one morning
 *  are one after the other, as the owner can hold one task at a time. */
function labourer(): Worker {
  return { ...testJoiner('w-gus', 'Gus'), role: 'helper', tier: null, rate: 0 };
}

function engineer(id: string): Worker {
  return { ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
}

/** The 800 m2 unit with the day one kit and air for the timber machines. */
function bigUnit(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 500000;
  state.reputation = 40;
  state.enquiries = [];
  return state;
}

/** The timber machines at their standard class and the casement cutters, as `bigUnit` of the Turn
 *  29 tests stands them, one timber rack of 40 boards and one glass rack of 40 units, two joiners
 *  and a labourer. */
function windowShop(withAdmin: boolean): GameState {
  const state = bigUnit();
  const kit: Array<[string, number, number]> = [
    ['crossCut', 20, 2],
    ['planer', 26, 2],
    ['spindleMoulder', 32, 2],
    ['sander', 20, 6],
    ['framePress', 26, 6],
    ['cuttersCasement', 0, 0],
    ['timberRack', 2, 6],
  ];
  for (const [id, x, y] of kit) placeEquipment(state, id, { variantId: 'standard', x, y, id: `kit-${id}` });
  placeGlassRack(state);
  state.workers.push(testJoiner('w-tom', 'Tom', 20, 9), testJoiner('w-ben', 'Ben', 26, 9), labourer());
  if (withAdmin) state.workers.push(admin());
  return state;
}

/** A casement window job of 9,000 put on the board and taken: 3,600 of material, 12 boards and 7
 *  glass units. Laminate, so its Finishing wants no booth. */
function takeCasement(state: GameState, name: string): GameState {
  const enquiry = placeEnquiry(state, {
    templateId: 'casementWindows',
    name,
    price: 9000,
    basePrice: 9000,
    finish: 'laminate',
    materialKind: 'solidWood',
    deadlineDays: 60,
    expiresOnDay: state.clock.day + 5,
  });
  return acceptNow(state, enquiry.id);
}

function jobNamed(state: GameState, name: string): Job {
  const job = state.jobs.find((entry) => entry.name === name);
  if (job === undefined) throw new Error(`${name} is on the books`);
  return job;
}

/** Plays the clock an hour at a time, the boss putting every free joiner on the oldest job (the
 *  first through the Work Plan's click, the rest added to it: a job takes as many men as the boss
 *  puts on it), until the test says stop. */
function playUntil(state: GameState, done: (state: GameState) => boolean, most = 40): GameState {
  let next = state;
  for (let guard = 0; !done(next) && guard < most; guard += 1) {
    for (const worker of next.workers) {
      if (worker.role !== 'joiner' || worker.jobId !== null) continue;
      const job = next.jobs.find((entry) => entry.stage === 'ready' || entry.stage === 'inProduction');
      if (job === undefined) continue;
      const manned = next.workers.some((entry) => entry.jobId === job.id);
      next = applyAction(next, manned ? { type: 'ADD_TO_JOB', jobId: job.id, workerId: worker.id } : { type: 'ASSIGN_JOB', jobId: job.id, workerId: worker.id });
    }
    next = minutes(next, 60);
    if (isOvertime(next.clock.minute) || !isWorkingDay(next.clock.day)) next = day(next);
  }
  return next;
}

// ---------------------------------------------------------------------------------------------
// (mmm)
// ---------------------------------------------------------------------------------------------

describe('(mmm) a window s boards and glass bought and kept as the sheets are (CLAUDE.md T32 2.3, 2.4, 2.6)', () => {
  const shop = windowShop(false);
  const cash = shop.cash;
  let bought = act(shop, { type: 'RESTOCK', kind: 'boards', sheets: 60 });
  bought = act(bought, { type: 'RESTOCK', kind: 'glass', sheets: 30 });
  // The next working morning: the two lorries at the gate, unloaded by whoever is free.
  let landed = day(bought);
  for (let guard = 0; landed.deliveries.some((delivery) => !delivery.unloaded) && guard < 20; guard += 1) landed = minutes(landed, 30);
  // And the morning after, the paid store's boards fetched back.
  let fetched = day(landed);
  for (let guard = 0; fetched.stock.tempStorageBoards > 0 && guard < 20; guard += 1) fetched = minutes(fetched, 30);
  const taken = takeCasement(fetched, 'Oak Lane');
  const job = jobNamed(taken, 'Oak Lane');
  // Its desk work and then its making, through the Glazing.
  const atGlazing = playUntil(taken, (state) => jobNamed(state, 'Oak Lane').glassUsed > 0 || state.gameOver !== null, 600);
  const glazed = jobNamed(atGlazing, 'Oak Lane');

  it('buys the boards on the ladder and the glass at 200 a unit, each on the material line', () => {
    expect(line(bought, '60 boards for stock')).toEqual([-60 * 170]);
    expect(line(bought, '30 glass units for stock')).toEqual([-30 * 200]);
    expect(bought.cash).toBe(cash - 60 * 170 - 30 * 200);
  });

  it('puts what fits on the rack and the twenty boards past it in the paid store, fetched the next morning', () => {
    expect([landed.stock.boards, landed.stock.tempStorageBoards]).toEqual([40, 20]);
    expect([landed.stock.glass, landed.stock.tempStorageGlass]).toEqual([30, 0]);
    expect(line(landed, 'Temporary storage for 20 boards')).toEqual([-TEMP_STORAGE_COST]);
    expect(fetched.tasks.some((task) => task.kind === 'fetchStorage' && task.label === 'Fetch 20 boards from storage')).toBe(true);
    expect([fetched.stock.boards, fetched.stock.tempStorageBoards]).toEqual([60, 0]);
  });

  it('holds the window s 12 boards and 7 glass units at the click, and orders nothing for it', () => {
    expect([job.sheets, job.sheetsReserved, job.glassUnits, job.glassReserved]).toEqual([12, 12, 7, 7]);
    expect(taken.deliveries.filter((delivery) => !delivery.unloaded)).toEqual([]);
  });

  it('makes it through its Glazing, taking its whole glass off the rack there', () => {
    expect(glazed.glassUsed).toBe(7);
    expect(glazed.glassReserved).toBe(0);
    expect(atGlazing.stock.glass).toBe(30 - 7);
    expect(atGlazing.ledger.some((entry) => entry.label.startsWith('Material for Oak Lane'))).toBe(false);
  });

  // A second window, taken by a company of the same shape whose stores are empty, with Anna in the
  // office.
  const empty = windowShop(true);
  const second = takeCasement(empty, 'Elm Row');
  let ordered = second;
  for (let guard = 0; ordered.deliveries.length < 2 && guard < 30; guard += 1) ordered = minutes(ordered, 60);
  const orderDay = ordered.clock.day;
  let unloaded = day(ordered);
  while (!isWorkingDay(unloaded.clock.day)) unloaded = day(unloaded);
  const lorryDay = unloaded.clock.day;
  for (let guard = 0; unloaded.deliveries.some((delivery) => !delivery.unloaded) && guard < 20; guard += 1) unloaded = minutes(unloaded, 30);

  it('has the admin order its shortfall of both by himself, on two lorries at the two prices', () => {
    expect(ordered.deliveries.map((delivery) => [delivery.material, delivery.sheets, delivery.pricePaid])).toEqual([
      ['boards', 12, 12 * 190],
      ['glass', 7, 7 * 200],
    ]);
    expect(line(ordered, 'Material for Elm Row: boards, ordered by Anna')).toEqual([-12 * 190]);
    expect(line(ordered, 'Material for Elm Row: glass, ordered by Anna')).toEqual([-7 * 200]);
  });

  it('has both lorries in on the next working day, unloaded, and the window holding all it needs', () => {
    expect(ordered.deliveries.every((delivery) => delivery.arriveDay === lorryDay)).toBe(true);
    expect(lorryDay).toBeGreaterThan(orderDay);
    const elm = jobNamed(unloaded, 'Elm Row');
    expect([elm.sheetsReserved + elm.sheetsUsed, elm.glassReserved + elm.glassUsed]).toEqual([12, 7]);
    expect(['ready', 'inProduction']).toContain(elm.stage);
  });
});

// ---------------------------------------------------------------------------------------------
// (nnn)
// ---------------------------------------------------------------------------------------------

/** The line standing whole at (2, 14) with its two engineers, a timber rack and a glass rack, two
 *  joiners and a labourer to unload, and an office admin when asked for. */
function lineCompany(withAdmin: boolean): GameState {
  const state = bigUnit();
  state.cash = 12000000;
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  placeEquipment(state, 'timberRack', { variantId: 'standard', x: 30, y: 2, id: 'kit-timber' });
  placeGlassRack(state);
  state.workers.push(engineer('eng-1'), engineer('eng-2'), testJoiner('w-tom', 'Tom'), testJoiner('w-ben', 'Ben'), labourer());
  if (withAdmin) state.workers.push(admin());
  return state;
}

/** Played to the morning the line's offer is taken, at its card. */
function taken(state: GameState): GameState {
  let next = state;
  for (let guard = 0; lineState(next, 1).contract?.status !== 'active' && guard < 10; guard += 1) next = day(next);
  if (lineState(next, 1).contract?.status !== 'active') throw new Error('the line s offer never came');
  return next;
}

describe('(nnn) the line fed from the stores by the office for a month (CLAUDE.md T32 2.5)', () => {
  const office = taken(lineCompany(true));
  let firstIn = office;
  for (let guard = 0; (firstIn.stock.boards === 0 || firstIn.stock.glass === 0) && guard < 40; guard += 1) firstIn = minutes(firstIn, 30);
  const inFrom = firstIn.clock.day;
  let month = firstIn;
  for (let guard = 0; month.clock.day < inFrom + 30 && guard < 40; guard += 1) month = day(month);
  month = minutes(month, 300);
  const made = lineState(month, 1).contract?.windowsMade ?? 0;
  const restocks = month.ledger.filter((entry) => / for stock, ordered by Anna$/.test(entry.label));
  const boughtOf = (unit: string): number =>
    restocks.filter((entry) => entry.label.includes(` ${unit} for stock`)).reduce((total, entry) => total + Number(entry.label.split(' ')[0]), 0);

  it('stands for no minute of material from the day after its first restocks are in', () => {
    const material = lineState(month, 1).days.filter((record) => record.day > inFrom);
    expect(material.length).toBeGreaterThan(25);
    for (const record of material) {
      expect(record.lost.timber + record.lost.glass + record.lost.timberAndGlass, `day ${record.day}`).toBe(0);
    }
    expect(made).toBeGreaterThan(60);
  });

  it('has every board and glass unit it used bought by Anna s restocks, and nothing bought for the line otherwise', () => {
    expect(restocks.length).toBeGreaterThan(2);
    expect(boughtOf('boards')).toBeGreaterThanOrEqual(2 * made);
    expect(boughtOf('glass units')).toBeGreaterThanOrEqual(made);
    // What was bought and not used is on the counters or on its way, never lost.
    const onTheWay = (kind: 'boards' | 'glass'): number =>
      month.deliveries.filter((delivery) => !delivery.unloaded && delivery.material === kind).reduce((total, delivery) => total + delivery.sheets, 0);
    expect(month.stock.boards + month.stock.tempStorageBoards + onTheWay('boards')).toBe(boughtOf('boards') - 2 * made);
    expect(month.stock.glass + month.stock.tempStorageGlass + onTheWay('glass')).toBe(boughtOf('glass units') - made);
    // Into the free places, never the paid store.
    expect(month.ledger.some((entry) => entry.label.startsWith('Temporary storage'))).toBe(false);
  });

  // The same line with nobody in the office, a little of each on the stores.
  const alone = lineCompany(false);
  alone.stock.boards = 10;
  alone.stock.glass = 10;
  const started = taken(alone);
  let dry = started;
  for (let guard = 0; lineShortOf(dry, 1) === null && guard < 40; guard += 1) dry = minutes(dry, 60);
  let onDuty = minutes(dry, 30);
  for (let guard = 0; !(isWorkingDay(onDuty.clock.day) && onDuty.clock.minute >= 60 && onDuty.clock.minute < 480) && guard < 100; guard += 1) {
    onDuty = minutes(onDuty, 30);
  }
  const standing = lineState(onDuty, 1).contract?.windowsMade ?? 0;
  let restocked = act(onDuty, { type: 'RESTOCK', kind: 'boards' });
  restocked = act(restocked, { type: 'RESTOCK', kind: 'glass' });
  let going = day(restocked);
  while (!isWorkingDay(going.clock.day)) going = day(going);
  // The lorries in and unloaded in the morning, the line going again within its working day.
  going = minutes(going, 480);

  it('buys nothing with no admin, and stands with no timber once the boards run dry, said on the strip', () => {
    expect(started.ledger.some((entry) => / for stock/.test(entry.label))).toBe(false);
    expect(lineShortOf(onDuty, 1)).toBe('timber');
    expect(warnings(onDuty).find((warning) => warning.key === 'lineNeedsMaterial')?.text).toBe('Line 1 stands: no timber for its next window');
    expect(standing).toBe(5);
  });

  it('goes again once the player restocks each kind, on the next working day', () => {
    expect(line(restocked, '40 boards for stock')).toEqual([-40 * 180]);
    expect(line(restocked, `${40 - onDuty.stock.glass} glass units for stock`)).toEqual([-(40 - onDuty.stock.glass) * 200]);
    expect(lineShortOf(going, 1)).toBeNull();
    expect(lineState(going, 1).contract?.windowsMade ?? 0).toBeGreaterThan(standing);
  });
});

// ---------------------------------------------------------------------------------------------
// (ooo)
// ---------------------------------------------------------------------------------------------

type Raw = Record<string, unknown>;

/** A whole v95 save: the line on its contract with 24 boards of its own on the old one counter, glass
 *  for 8 windows at module 6 and for 20 more on its way, a load of its timber on the road, and a
 *  casement window job holding 12 boards with its glass ordered from the glazier; written raw from
 *  a game of today and put back in v95's shape. */
function v95Save(): { raw: Raw; sheets: number; cash: number } {
  const state = lineCompany(false);
  state.stock.sheets = 20;
  const withJob = takeCasement(state, 'Oak Lane');
  const job = jobNamed(withJob, 'Oak Lane');
  // Its desk work done: a window ready to be made, its boards in hand.
  withJob.tasks = withJob.tasks.filter((task) => task.jobId !== job.id);
  job.designMinutesRemaining = 0;
  job.stage = 'ready';
  lineState(withJob, 1).contract = {
    status: 'active',
    startDay: withJob.clock.day,
    windowsThisWeek: 0,
    weekStartDay: withJob.clock.day,
    windowsMade: 30,
    revenue: 45000,
    materialCost: 18000,
    boardsReserved: 0,
    glassReserved: 0,
  };
  const raw = JSON.parse(JSON.stringify(withJob)) as Raw;
  raw.version = 47;
  // v95's one counter: the sheets, the job's 12 boards and the line's 24.
  raw.stock = { sheets: 20 + 12 + 24, tempStorageSheets: 0 };
  const jobs = raw.jobs as Raw[];
  for (const entry of jobs) {
    delete entry.glassUnits;
    delete entry.glassReserved;
    delete entry.glassUsed;
    entry.glass = entry.timber === true ? 'ordered' : 'none';
    entry.glassDay = entry.timber === true ? withJob.clock.day + 1 : null;
    if (entry.timber === true) entry.sheetsReserved = 12;
  }
  const lines = raw.windowLines as Raw[];
  const record = lines[0] as Raw;
  record.boards = 24;
  record.glass = 8;
  record.glassOnTheWay = [{ windows: 20, day: withJob.clock.day + 1 }];
  const contract = record.contract as Raw;
  delete contract.boardsReserved;
  delete contract.glassReserved;
  raw.deliveries = [
    {
      id: 'del-line-1',
      jobId: null,
      sheets: 40,
      orderedDay: withJob.clock.day,
      pricePaid: 8000,
      arriveDay: withJob.clock.day + 1,
      arrived: false,
      unloaded: false,
      bespoke: false,
      overflowSheets: 0,
      boards: true,
      line: 1,
    },
  ];
  // Its rack of glass is v96's: a v95 hall has none, and the lift buys nothing.
  raw.equipment = (raw.equipment as Raw[]).filter((item) => item.specId !== 'glassRack');
  return { raw, sheets: 20, cash: withJob.cash };
}

describe('(ooo) a v95 save of a running line and a window with its glass ordered, opened on v96 (CLAUDE.md T32 section 4)', () => {
  const { raw, sheets, cash } = v95Save();
  const opened = migrateState(raw, 47);
  if (opened === null) throw new Error('the v95 save opens');
  // A week of it, the line's lorry unloaded by the labourer as any load is, and Tom on the window.
  const window = jobNamed(opened, 'Oak Lane');
  let week = applyAction(opened, { type: 'ASSIGN_JOB', jobId: window.id, workerId: 'w-tom' });
  for (let guard = 0; week.clock.day < opened.clock.day + 7 && guard < 20; guard += 1) week = day(week);
  const oak = jobNamed(week, 'Oak Lane');

  it('opens with every board and glass unit on its own counter, the cash as it was', () => {
    expect(opened.stock).toMatchObject({ sheets, boards: 12 + 24, glass: 7 + 8 + 20, tempStorageBoards: 0, tempStorageGlass: 0 });
    expect(opened.cash).toBe(cash);
    const job = jobNamed(opened, 'Oak Lane');
    expect([job.sheetsReserved, job.glassUnits, job.glassReserved, job.glassUsed]).toEqual([12, 7, 7, 0]);
    expect(opened.deliveries.map((delivery) => [delivery.material, delivery.jobId, delivery.sheets])).toEqual([['boards', null, 40]]);
    // The contract comes in holding nothing, and holds its week at its first open, out of what the
    // window does not hold: 36 boards less its 12, 35 glass units less its 7.
    expect(lineState(opened, 1).contract).toMatchObject({ boardsReserved: 0, glassReserved: 0 });
    const first = JSON.parse(JSON.stringify(opened)) as GameState;
    runLineDay(first);
    const weekly = lineWindowsAWeek(first, 1);
    expect(lineState(first, 1).contract).toMatchObject({
      boardsReserved: Math.min(2 * weekly, 36 - 12),
      glassReserved: Math.min(weekly, 35 - 7),
    });
  });

  it('plays a week: nothing lost, nothing bought twice, the line and the job carry on', () => {
    // Nothing ordered for the window again, and nothing written off.
    expect(week.ledger.some((entry) => entry.label.startsWith('Material for Oak Lane'))).toBe(false);
    expect(week.ledger.some((entry) => entry.label.startsWith('Material written off'))).toBe(false);
    expect(week.ledger.some((entry) => / for stock/.test(entry.label))).toBe(false);
    // The line's load came in as stock, and the line made windows of what it had.
    expect(week.deliveries.every((delivery) => delivery.unloaded)).toBe(true);
    const made = (lineState(week, 1).contract?.windowsMade ?? 0) - 30;
    expect(made).toBeGreaterThan(0);
    // Every board and glass unit is on a counter, in the window or in the windows made.
    const job = oak;
    expect(week.stock.boards + job.sheetsUsed + 2 * made).toBe(12 + 24 + 40);
    expect(week.stock.glass + job.glassUsed + made).toBe(7 + 8 + 20);
    expect(job.glassReserved + job.glassUsed).toBe(7);
    // The window was worked all week on what it held, short of nothing.
    expect(job.labourRemaining).toBeLessThan(window.labourRemaining);
    expect(job.sheetsReserved + job.sheetsUsed).toBe(12);
  });
});
