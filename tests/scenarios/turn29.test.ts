/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// The Turn 29 scenarios of CLAUDE.md T29 E2. The letters follow Turn 28's (ww).
//
// (xx)  A save with seven men on one contract opens with four on it, three waiting for work and
//       the card; a fifth man is refused on both tabs in the engine's words; a man is taken off
//       the full contract and another put on.
// (yy)  A company in the 800 m² unit with the timber kit buys a five axis CNC and a robot; a
//       window's Moulding moves to the CNC at the engine's own sum; with the CNC away for its
//       service the Moulding is back at the moulders that day; a lacquered kitchen's Finishing is
//       faster and nothing else of it has moved.
// (zz)  The same company orders module 1, is refused with a rack on its cells, moves the rack,
//       orders, hires an engineer; the module lands by itself on its day; the window's Cross
//       cutting and Planing are on it at the engine's sum at level 1; all five and two engineers
//       give level 5; one engineer let go gives three modules and the strip's line; none gives a
//       line that stands still and the old machines' pace; module 3 is refused for sale while 4
//       stands.
// (aaa) Played with a labourer on duty: a window's boards arrive with no timber store, are refused,
//       and the card and the strip say so; with a timber rack they come in onto it and the sheet
//       racks count sheets only; a second window's boards that the rack has no room for stand at
//       the gate and come in whole once the first has drawn its own; a window dropped with its
//       boards at the gate leaves no load and no board behind.
// (bbb) A company in the 800 m² unit is offered sash windows as a contract, takes it with four
//       men, is paid for every window with nothing off the racks, and makes more of them a week
//       with the line than without; a company in the 400 m² unit is never offered one and its
//       seeded offer is what it was on v83.

import { describe, expect, it } from 'vitest';
import {
  CNC5_STAGE_FACTOR,
  CONTRACT_OFFER_CHANCE_PER_DAY,
  CONTRACT_PIECES,
  CONTRACT_WEEKLY_OFFER_REPUTATION,
  LINE_FACTOR,
  LINE_MODULES,
  SPRAY_ROBOT_FINISH_FACTOR,
} from '../../src/engine/constants';
import {
  contractAssignCheck,
  contractCrewFullLine,
  contractCrewLine,
  contractMarker,
  contractOfWorker,
  contractPiece,
  contractPriceFor,
  drawContract,
  offeredContract,
} from '../../src/engine/contracts';
import { applyAction } from '../../src/engine/index';
import type { Contract, Delivery, GameEvent, GameState, StagedJob } from '../../src/engine/index';
import { addWorkingDays } from '../../src/engine/clock';
import { freeJoiners, stagedJob } from '../../src/engine/jobs';
import { boardsHeld, hallPace, lineLevel, lineModules, sheetsOnCounter } from '../../src/engine/machines';
import { boardsOnStore, canUnload, sheetsOnRack } from '../../src/engine/materials';
import { migrateState } from '../../src/engine/migrate';
import { chance, pick } from '../../src/engine/rng';
import { hiringOptions } from '../../src/engine/staff';
import { jobPace, stagePlanFor } from '../../src/engine/stages';
import { canBuy, canSell, tick } from '../../src/engine/game';
import { warnings } from '../../src/engine/warnings';
import { renderContracts } from '../../src/ui/contracts';
import { renderWorkPlan } from '../../src/ui/workPlan';
import { CAREFUL, playDay, type Policy } from './autopilot';
import {
  act,
  acceptNow,
  buyStartingKit,
  connectAll,
  fillRack,
  newGame,
  nextDay,
  placeEnquiry,
  placeEquipment,
  sixJoinersOnSheetWork,
  testJoiner,
  withAir,
  withExtraction,
} from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** A window as the plan reads it: solid wood, lacquered, the timber plan. */
function windowJob(): StagedJob {
  return stagedJob(100, 'solidWood', false, 'lacquer', false, true);
}

/** A lacquered kitchen: a sheet job with the booth's Finishing. */
function kitchenJob(): StagedJob {
  return stagedJob(100, 'sheet', false, 'lacquer', true, false);
}

/** The plan as family and speed by stage. */
function planOf(state: GameState, job: StagedJob): Record<string, { family: string | null; speed: number }> {
  const plan: Record<string, { family: string | null; speed: number }> = {};
  for (const stage of stagePlanFor(state, job)) plan[stage.id] = { family: stage.family, speed: stage.speed };
  return plan;
}

/** The engine's own sum: the shares over the shares at their speeds, the arithmetic of the one
 *  pace of a job (`jobPace`), written out from the stages' figures. */
function sumOf(state: GameState, job: StagedJob, speeds: Record<string, number>): number {
  let minutes = 0;
  let labour = 0;
  for (const stage of stagePlanFor(state, job)) {
    const speed = speeds[stage.id];
    if (speed === undefined) throw new Error(`no speed for ${stage.id}`);
    minutes += stage.share / speed;
    labour += stage.share;
  }
  return labour / minutes;
}

/** Plays whole days, answering every card with its first choice. */
function playDays(state: GameState, days: number, seen: GameEvent[] = []): GameState {
  let next = state;
  for (let day = 0; day < days; day += 1) next = nextDay(next, seen);
  return next;
}

// ---------------------------------------------------------------------------------------------
// (xx)
// ---------------------------------------------------------------------------------------------

describe('(xx) a save with seven men on one contract (CLAUDE.md T29 2.3, section 4)', () => {
  // Six joiners of the sheet hall and a seventh, all seven on one contract for cut sheet packs, as
  // v83 let the boss put them, saved at version 41.
  const built = sixJoinersOnSheetWork();
  built.jobs = [];
  built.workers.push({ ...testJoiner('staff-7', 'Ravi'), tier: 'experienced', rate: 0.8, monthlyWage: 2600 });
  const offer = drawContract(built);
  offer.id = 'contract-northgate';
  offer.pieceId = 'cutSheetPack';
  offer.name = 'Cut sheet packs for Northgate Interiors';
  offer.pricePerPiece = contractPriceFor(contractPiece(offer));
  offer.quantityPerWeek = 60;
  built.contracts = [offer];
  expect(applyAction(built, { type: 'ACCEPT_CONTRACT', contractId: offer.id }).contracts[0]?.status).toBe('active');
  const signed = applyAction(built, { type: 'ACCEPT_CONTRACT', contractId: offer.id });
  const seven = signed.workers.filter((worker) => worker.role === 'joiner').map((worker) => worker.id);
  const contract = signed.contracts[0];
  if (contract === undefined) throw new Error('the contract is signed');
  contract.assigned = [...seven];
  for (const worker of signed.workers) if (seven.includes(worker.id)) worker.jobId = contractMarker(contract.id);
  const raw = JSON.parse(JSON.stringify(signed)) as Record<string, unknown>;
  raw.version = 41;
  const opened = migrateState(raw, 41);
  if (opened === null) throw new Error('the save opens');
  const settled = tick(opened, 1);

  it('opens with the first four on it, three waiting for work, and the card at its first settle', () => {
    expect(seven).toHaveLength(7);
    const kept = settled.contracts[0];
    expect(kept?.assigned).toEqual(seven.slice(0, 4));
    for (const id of seven.slice(4)) {
      const man = settled.workers.find((worker) => worker.id === id);
      expect(man?.jobId, id).toBeNull();
      expect(contractOfWorker(settled, id), id).toBeNull();
    }
    // Seen by the lists of free men from the first minute.
    const free = freeJoiners(settled).map((worker) => worker.id);
    for (const id of seven.slice(4)) expect(free, id).toContain(id);
    expect(settled.activeEvent?.kind).toBe('contractsTrimmed');
    expect(settled.activeEvent?.title).toBe('Contracts take four joiners');
    const names = seven.slice(4).map((id) => settled.workers.find((worker) => worker.id === id)?.name ?? '');
    expect(settled.activeEvent?.body).toBe(
      'A standing contract takes four joiners at the most from now on. ' +
        `Taken off Cut sheet packs for Northgate Interiors: ${names[0]}, ${names[1]} and ${names[2]}. ` +
        'They are waiting for work.',
    );
    expect(settled.activeEvent?.choices).toEqual([{ id: 'ok', label: 'Right' }]);
    expect(settled.clock.day).toBe(opened.clock.day);
  });

  it('refuses a fifth man on both tabs in the engine s words, takes one off and puts another on', () => {
    let state = applyAction(settled, { type: 'RESOLVE_EVENT', choiceId: 'ok' });
    const running = state.contracts[0];
    if (running === undefined) throw new Error('the contract runs');
    const id = running.id;
    const fifth = seven[4] as string;
    expect(contractAssignCheck(state, running, fifth)).toEqual({ ok: false, reason: contractCrewFullLine() });
    expect(contractCrewFullLine()).toBe('A contract takes four joiners at the most');
    // The Orders board's tab: the count, and the locked Put on it with the engine's reason.
    const board = parse(renderContracts(state));
    expect(board.textContent).toContain(`On it${contractCrewLine(running)}`);
    const locked = board.querySelector(`.contract-active .row[data-worker="${fifth}"] .row-action button`);
    expect(locked?.getAttribute('disabled')).not.toBeNull();
    expect(locked?.getAttribute('title')).toBe(contractCrewFullLine());
    // The Work Plan's tab: the reason in place of the button, and no list.
    const plan = parse(renderWorkPlan(state, 'contracts', id, null)).querySelector('.contract-bar');
    expect(plan?.querySelector('.assign-open')).toBeNull();
    expect(plan?.querySelector('.assign-line .reason')?.textContent).toBe(contractCrewFullLine());
    expect(plan?.textContent).not.toContain('Nobody is free');
    // The action itself refuses him: nothing moves.
    const refused = applyAction(state, { type: 'ASSIGN_CONTRACT', contractId: id, workerId: fifth, on: true });
    expect(refused.contracts[0]?.assigned).toEqual(seven.slice(0, 4));
    expect(refused.workers.find((worker) => worker.id === fifth)?.jobId).toBeNull();
    // One taken off a full contract, and the fifth put on in his place.
    state = applyAction(state, { type: 'ASSIGN_CONTRACT', contractId: id, workerId: seven[1] as string, on: false });
    expect(state.contracts[0]?.assigned).toEqual([seven[0], seven[2], seven[3]]);
    state = applyAction(state, { type: 'ASSIGN_CONTRACT', contractId: id, workerId: fifth, on: true });
    expect(state.contracts[0]?.assigned).toEqual([seven[0], seven[2], seven[3], fifth]);
    expect(contractOfWorker(state, fifth)?.id).toBe(id);
  });
});

// ---------------------------------------------------------------------------------------------
// (yy)
// ---------------------------------------------------------------------------------------------

/** The 800 m² company: both extensions bought and opened through the engine, the day one kit, an
 *  industrial extractor connected to everything and an industrial compressor, the timber kit of
 *  Turn 28 at its standard class with the sash cutters, a timber store, two joiners and cash. */
function timberCompany(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withExtraction(withAir(buyStartingKit(state), 'industrial'));
  state.cash = 9000000;
  state.reputation = 40;
  state.enquiries = [];
  const kit: Array<[string, number, number]> = [
    ['crossCut', 20, 2],
    ['planer', 26, 2],
    ['spindleMoulder', 32, 2],
    ['sander', 20, 6],
    ['framePress', 26, 6],
    ['sprayBooth', 32, 6],
    ['cuttersSash', 0, 0],
    ['timberShelter', 40, 1],
  ];
  for (const [id, x, y] of kit) placeEquipment(state, id, { variantId: 'standard', x, y, id: `kit-${id}` });
  state.workers.push(testJoiner('w-tom', 'Tom'), testJoiner('w-ben', 'Ben'));
  return connectAll(state);
}

/** Orders this kit through the engine and brings its day to tomorrow, then plays to the morning it
 *  stands. The days of the order are the catalogue's, and asserted beside it; the scenario does not
 *  wait them out. */
function buyAndLand(state: GameState, specId: string, variantId?: string): GameState {
  const cash = state.cash;
  let next = act(state, { type: 'BUY_EQUIPMENT', specId, variantId });
  const order = next.onOrder.find((item) => item.specId === specId);
  if (order === undefined) throw new Error(`${specId} is on order`);
  expect(next.cash).toBeLessThan(cash);
  order.dueDay = next.clock.day + 1;
  let guard = 0;
  while (!next.equipment.some((item) => item.specId === specId && item.anchorX >= 0) && guard < 6) {
    guard += 1;
    next = playDays(next, 1);
    // Heavy kit at the gate: the men carry it in with the day's own unloading.
    for (const task of next.tasks.filter((entry) => entry.kind === 'unload' && !entry.done)) {
      next = act(next, { type: 'START_TASK', taskId: task.id });
    }
  }
  return connectAll(next);
}

describe('(yy) the five axis CNC and the spraying robot, bought (CLAUDE.md T29 2.6, 2.7)', () => {
  const before = timberCompany();
  const window = windowJob();
  const kitchen = kitchenJob();
  const plainWindow = planOf(before, window);
  const plainKitchen = planOf(before, kitchen);
  let state = buyAndLand(before, 'cnc5', 'standard');
  state = buyAndLand(state, 'sprayRobot');

  it('stands both, and the window s Moulding is on the CNC at the engine s own sum', () => {
    expect(state.equipment.some((item) => item.specId === 'cnc5')).toBe(true);
    expect(state.equipment.some((item) => item.specId === 'sprayRobot')).toBe(true);
    expect(plainWindow.moulding?.family).toBe('spindleMoulder');
    const plan = planOf(state, window);
    expect(plan.moulding?.family).toBe('cnc5');
    expect(plan.moulding?.speed).toBeCloseTo(CNC5_STAGE_FACTOR * hallPace(state, 'cnc5'), 10);
    expect(plan.finishing?.speed).toBeCloseTo(SPRAY_ROBOT_FINISH_FACTOR * hallPace(state, 'sprayBooth'), 10);
    const pace = sumOf(state, window, {
      crossCutting: hallPace(state, 'crossCut'),
      planing: hallPace(state, 'planer'),
      moulding: CNC5_STAGE_FACTOR * hallPace(state, 'cnc5'),
      pressing: hallPace(state, 'framePress'),
      sanding: hallPace(state, 'sander'),
      finishing: SPRAY_ROBOT_FINISH_FACTOR * hallPace(state, 'sprayBooth'),
      assembly: hallPace(state, 'workbench'),
    });
    expect(jobPace(state, window)).toBeCloseTo(pace, 10);
    expect(jobPace(state, window)).toBeGreaterThan(jobPace(before, window));
  });

  it('puts the Moulding back at the moulders the day the CNC is away for its service', () => {
    const cnc = state.equipment.find((item) => item.specId === 'cnc5');
    if (cnc === undefined) throw new Error('the CNC stands');
    const away = act(state, { type: 'SERVICE_MACHINE', equipmentId: cnc.id });
    expect(away.equipment.find((item) => item.id === cnc.id)?.inServiceUntilDay).not.toBeNull();
    const plan = planOf(away, window);
    expect(plan.moulding?.family).toBe('spindleMoulder');
    expect(plan.moulding?.speed).toBeCloseTo(hallPace(away, 'spindleMoulder'), 10);
  });

  it('speeds a lacquered kitchen s Finishing and nothing else of it', () => {
    const plan = planOf(state, kitchen);
    expect(Object.keys(plan)).toEqual(Object.keys(plainKitchen));
    for (const [stage, entry] of Object.entries(plan)) {
      expect(entry.family, stage).toBe(plainKitchen[stage]?.family);
      const expected = (plainKitchen[stage]?.speed ?? 0) * (stage === 'finishing' ? SPRAY_ROBOT_FINISH_FACTOR : 1);
      expect(entry.speed, stage).toBeCloseTo(expected, 10);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// (zz)
// ---------------------------------------------------------------------------------------------

/** Plays to the morning a man let go is off the books: his notice worked out. */
function untilGone(state: GameState, id: string): GameState {
  let next = state;
  let guard = 0;
  while (next.workers.some((worker) => worker.id === id) && guard < 30) {
    guard += 1;
    next = nextDay(next);
  }
  return next;
}

/** True while the Workshop tab offers the role with no refusal of its own. */
function canHire(state: GameState, role: string): boolean {
  return hiringOptions(state).some((option) => option.role === role && option.blockReason === '');
}

describe('(zz) the production line, bought and run (CLAUDE.md T29 2.8 to 2.10)', () => {
  const industrial = 1.12;
  const company = buyAndLand(timberCompany(), 'cnc5', 'standard');
  // A sheet rack stands on module 1's cells.
  placeEquipment(company, 'sheetRack', { variantId: 'standard', x: 7, y: 15, id: 'kit-rack-in-the-way' });
  const refused = canBuy(company, 'windowLine1');
  let state = act(company, { type: 'MOVE_ITEM', itemId: 'kit-rack-in-the-way', x: 2, y: 17 });
  const halfShifted = canBuy(state, 'windowLine1');
  state = act(state, { type: 'END_SETUP', speed: 1 });
  const cash = state.cash;
  state = act(state, { type: 'BUY_EQUIPMENT', specId: 'windowLine1' });
  const order = state.onOrder.find((item) => item.specId === 'windowLine1');
  const ordered = { cash: cash - state.cash, day: state.clock.day, dueDay: order?.dueDay ?? 0 };
  // The engineer is hired once the module is on order: the interview is the owner's hour, and he
  // starts on the books after it (CLAUDE.md T7 3.10).
  const hireable = canHire(state, 'lineEngineer');
  state = act(state, { type: 'HIRE', role: 'lineEngineer', tier: null });
  // Thirty working days played to the morning it is due, answering every card with its first
  // choice.
  const seen: GameEvent[] = [];
  let guard = 0;
  while (state.clock.day < ordered.dueDay && guard < 60) {
    guard += 1;
    state = nextDay(state, seen);
  }
  const landed = state;

  it('is refused with the rack on its cells, then half shifted, and ordered once the rack is moved', () => {
    expect(refused).toEqual({ ok: false, reason: "Move the sheet rack off the line's 6 m by 3 m" });
    expect(halfShifted).toEqual({ ok: false, reason: 'The kit is half shifted. Finish the move first' });
    expect(ordered.cash).toBe(1500000);
    expect(order).toMatchObject({ anchorX: 5, anchorY: 14 });
    expect(hireable).toBe(true);
  });

  it('lands by itself on its day, with nobody to unload it, and runs the Cross cutting and the Planing', () => {
    expect(landed.clock.day).toBe(ordered.dueDay);
    expect(landed.workers.filter((worker) => worker.role === 'lineEngineer')).toHaveLength(1);
    expect(lineModules(landed)).toBe(1);
    expect(landed.tasks.some((task) => task.kind === 'unload' && !task.done)).toBe(false);
    expect(lineLevel(landed)).toBe(1);
    const plan = planOf(landed, windowJob());
    const factor = LINE_FACTOR[1] ?? 1;
    expect(plan.crossCutting).toEqual({ family: 'windowLine1', speed: factor * industrial });
    expect(plan.planing).toEqual({ family: 'windowLine1', speed: factor * industrial });
    const pace = sumOf(landed, windowJob(), {
      crossCutting: factor * industrial,
      planing: factor * industrial,
      moulding: factor * CNC5_STAGE_FACTOR * hallPace(landed, 'cnc5'),
      pressing: factor * hallPace(landed, 'framePress'),
      sanding: factor * hallPace(landed, 'sander'),
      finishing: hallPace(landed, 'sprayBooth'),
      assembly: factor * hallPace(landed, 'workbench'),
    });
    expect(jobPace(landed, windowJob())).toBeCloseTo(pace, 10);
  });

  it('runs all five with two engineers, three with one, stands still with none, and sells only from the end', () => {
    let state = landed;
    for (const id of LINE_MODULES.slice(1)) {
      state = act(state, { type: 'BUY_EQUIPMENT', specId: id });
      const next = state.onOrder.find((item) => item.specId === id);
      if (next === undefined) throw new Error(`${id} is on order`);
      next.dueDay = state.clock.day + 1;
    }
    state = act(state, { type: 'HIRE', role: 'lineEngineer', tier: null });
    state = playDays(state, 3);
    expect(lineModules(state)).toBe(5);
    expect(lineLevel(state)).toBe(5);
    expect(warnings(state).some((entry) => entry.key === 'lineNeedsEngineer')).toBe(false);
    // One let go: three modules, and the strip says so.
    const engineers = state.workers.filter((worker) => worker.role === 'lineEngineer');
    const one = untilGone(act(state, { type: 'LET_GO', workerId: engineers[1]?.id ?? '' }), engineers[1]?.id ?? '');
    expect(lineLevel(one)).toBe(3);
    expect(warnings(one).find((entry) => entry.key === 'lineNeedsEngineer')?.text).toBe(
      'The line runs as three modules: one engineer on duty',
    );
    expect(planOf(one, windowJob()).pressing?.family).toBe('framePress');
    // None: the line stands still and the old machines do what they did, at their own pace.
    const none = untilGone(act(one, { type: 'LET_GO', workerId: engineers[0]?.id ?? '' }), engineers[0]?.id ?? '');
    expect(lineLevel(none)).toBe(0);
    expect(warnings(none).find((entry) => entry.key === 'lineNeedsEngineer')?.text).toBe(
      'The line stands still: no engineer on duty',
    );
    const still = planOf(none, windowJob());
    expect(still.crossCutting).toEqual({ family: 'crossCut', speed: hallPace(none, 'crossCut') });
    expect(still.moulding).toEqual({ family: 'cnc5', speed: CNC5_STAGE_FACTOR * hallPace(none, 'cnc5') });
    // Module 3 is not sold while 4 stands; 5 is.
    const third = none.equipment.find((item) => item.specId === 'windowLine3');
    const fifth = none.equipment.find((item) => item.specId === 'windowLine5');
    expect(canSell(none, third?.id ?? '')).toEqual({ ok: false, reason: 'Sell the module after it first' });
    expect(canSell(none, fifth?.id ?? '')).toEqual({ ok: true, reason: '' });
  });
});

// ---------------------------------------------------------------------------------------------
// (aaa)
// ---------------------------------------------------------------------------------------------

/** The script that plays (aaa): it takes no work of its own, orders a job's boards once its
 *  paperwork is done, does the desk work, and puts a free joiner on a job; the unloading is the
 *  labourer's. */
const STORES_SCRIPT: Policy = { ...CAREFUL, buyKit: false, maxOpenJobs: 0, wanted: [] };

/** A window of the board, taken as the engine takes it, and the job it became. */
function takeWindow(state: GameState, price: number, name: string): { state: GameState; jobId: string } {
  const enquiry = placeEnquiry(state, {
    templateId: 'sashWindows',
    name,
    price,
    basePrice: price,
    finish: 'lacquer',
    materialKind: 'solidWood',
    deadlineDays: 90,
  });
  const before = new Set(state.jobs.map((job) => job.id));
  const next = acceptNow(state, enquiry.id);
  const job = next.jobs.find((entry) => !before.has(entry.id));
  if (job === undefined) throw new Error(`${name} is taken`);
  return { state: next, jobId: job.id };
}

/** Plays days with the script until the condition holds, at most this many days. */
function playUntil(
  state: GameState,
  done: (now: GameState) => boolean,
  seen: GameEvent[],
  most = 40,
  policy: Policy = STORES_SCRIPT,
): GameState {
  let next = state;
  let guard = 0;
  while (!done(next) && guard < most && next.gameOver === null) {
    guard += 1;
    next = playDay(next, policy, seen);
  }
  return next;
}

function loadOf(state: GameState, jobId: string): Delivery | undefined {
  return state.deliveries.find((delivery) => delivery.jobId === jobId);
}

function atTheGate(state: GameState, jobId: string): boolean {
  const load = loadOf(state, jobId);
  return load !== undefined && !load.unloaded && load.arriveDay <= state.clock.day;
}

describe('(aaa) boards and the timber stores, played with a labourer on duty (CLAUDE.md T29 2.11)', () => {
  // The company of a save made before the stores: the timber kit and no store, a labourer on the
  // books, and a window of 19 boards taken as v83 took it.
  // Twenty sheets of MFC on the sheet rack beside them, so its plate has something to count.
  const company = fillRack(timberCompany(), 20);
  company.equipment = company.equipment.filter((item) => item.specId !== 'timberShelter');
  company.workers.push({ ...testJoiner('w-gus', 'Gus'), role: 'helper', tier: null, rate: 0 });
  const first = takeWindow(company, 14000, 'Sash windows for Mrs Patel');
  const seen: GameEvent[] = [];
  // The boards ordered, come, and standing at the gate with nowhere to go.
  const waiting = playUntil(first.state, (now) => atTheGate(now, first.jobId), seen);
  // The card is raised the morning the lorry comes: on the screen, or answered already.
  const refusedCard = [...seen, waiting.activeEvent, ...waiting.eventQueue].find(
    (event) => event?.kind === 'deliveryArrived',
  );
  const firstLoad = loadOf(waiting, first.jobId);
  const sheetsBefore = sheetsOnCounter(waiting);
  // A day at the gate, the labourer on duty and nothing for him to put it on.
  const stood = playDay(waiting, STORES_SCRIPT, seen);
  // A timber rack bought; it comes, and the labourer takes the boards in onto it.
  const rackDay = stood.clock.day;
  const bought = act(stood, { type: 'BUY_EQUIPMENT', specId: 'timberRack' });
  const rackOrder = bought.onOrder.find((item) => item.specId === 'timberRack');
  const inside = playUntil(bought, (now) => loadOf(now, first.jobId)?.unloaded === true, seen);

  it('refuses the boards with no timber store, and the card and the strip say so', () => {
    expect(firstLoad?.boards).toBe(true);
    expect(firstLoad?.sheets).toBe(19);
    expect(refusedCard?.body).toBe(
      '19 boards have arrived and there is no timber store to put them on. Buy one from the catalogue.',
    );
    expect(refusedCard?.choices).toEqual([{ id: 'later', label: 'Leave it at the gate' }]);
    expect(warnings(waiting).find((entry) => entry.key === 'boardsAtTheGate')?.text).toBe(
      'Boards at the gate, no timber store: Sash windows for Mrs Patel',
    );
    // A whole day on and the labourer has not taken it in, nor sent any of it to the paid store.
    expect(loadOf(stood, first.jobId)?.unloaded).toBe(false);
    expect(stood.stock.tempStorageSheets).toBe(0);
    expect(sheetsOnCounter(stood)).toBe(sheetsBefore);
  });

  it('takes them in whole onto a timber rack, and the sheet racks count sheets only', () => {
    expect(rackOrder?.dueDay).toBe(addWorkingDays(rackDay, 3));
    expect(inside.equipment.some((item) => item.specId === 'timberRack')).toBe(true);
    expect(boardsHeld(inside)).toBeGreaterThan(0);
    expect(inside.stock.tempStorageSheets).toBe(0);
    expect(sheetsOnCounter(inside)).toBe(sheetsBefore);
    expect(sheetsBefore).toBe(20);
    const rack = inside.equipment.find((item) => item.specId === 'timberRack');
    const sheetRack = inside.equipment.find((item) => item.specId === 'sheetRack');
    if (rack === undefined || sheetRack === undefined) throw new Error('both racks stand');
    expect(boardsOnStore(inside, rack)).toBe(boardsHeld(inside));
    expect(sheetsOnRack(inside, sheetRack)).toBe(20);
    expect(warnings(inside).some((entry) => entry.key === 'boardsAtTheGate')).toBe(false);
  });

  it('keeps a second window s boards at the gate for room, and takes them in whole once the first has drawn its own', () => {
    // A second window of more boards than the rack has room for while the first holds its own, and
    // no more than the rack holds empty, so the board takes it.
    const second = takeWindow(inside, 26000, 'Sash windows for the Old Rectory');
    const wanted = second.state.jobs.find((job) => job.id === second.jobId)?.sheets ?? 0;
    expect(wanted).toBeGreaterThan(40 - 19);
    expect(wanted).toBeLessThanOrEqual(40);
    const seen2: GameEvent[] = [];
    const gate = playUntil(second.state, (now) => atTheGate(now, second.jobId), seen2);
    const load = loadOf(gate, second.jobId);
    expect(load?.boards).toBe(true);
    expect(canUnload(gate, load)).toBe(false);
    expect(warnings(gate).find((entry) => entry.key === 'boardsAtTheGate')?.text).toBe(
      'Boards at the gate, no room on the stores: Sash windows for the Old Rectory',
    );
    // A third window taken and dropped while its boards stand at the gate behind it: no load, no
    // task and no board left behind.
    const third = takeWindow(gate, 14000, 'Sash windows for the vicarage');
    const thirdAt = playUntil(third.state, (now) => atTheGate(now, third.jobId), seen2);
    const thirdLoad = loadOf(thirdAt, third.jobId);
    expect(thirdLoad).toBeDefined();
    const counter = thirdAt.stock.sheets;
    const dropped = act(thirdAt, { type: 'DROP_JOB', jobId: third.jobId });
    expect(dropped.deliveries.some((delivery) => delivery.id === thirdLoad?.id)).toBe(false);
    expect(dropped.tasks.some((task) => task.deliveryId === thirdLoad?.id)).toBe(false);
    expect(dropped.stock.sheets).toBe(counter);
    // Played on: the first window draws its boards as it is made, and the second load comes in
    // whole the day there is room for all of it, never a part to the paid store.
    let now = dropped;
    let guard = 0;
    while (loadOf(now, second.jobId)?.unloaded !== true && guard < 80 && now.gameOver === null) {
      guard += 1;
      now = playDay(now, STORES_SCRIPT, seen2);
      expect(now.stock.tempStorageSheets).toBe(0);
      expect(boardsHeld(now)).toBeLessThanOrEqual(40);
    }
    expect(loadOf(now, second.jobId)?.unloaded).toBe(true);
    const secondJob = now.jobs.find((job) => job.id === second.jobId);
    expect(secondJob?.sheetsReserved).toBe(wanted);
    // The first window had drawn its own by then: the rack never held more than its forty.
    expect(boardsHeld(now)).toBeLessThanOrEqual(40);
    expect(sheetsOnCounter(now)).toBe(20);
  });
});

// ---------------------------------------------------------------------------------------------
// (bbb)
// ---------------------------------------------------------------------------------------------

/** Plays days, declining every offer that is not for this piece, until one for it is on the
 *  board. */
function untilOffered(state: GameState, pieceId: string, offers: Contract[], most = 400): GameState {
  let next = state;
  let guard = 0;
  while (guard < most && next.gameOver === null) {
    guard += 1;
    next = nextDay(next);
    const offer = offeredContract(next);
    if (offer === null) continue;
    if (!offers.some((entry) => entry.id === offer.id)) offers.push({ ...offer });
    if (offer.pieceId === pieceId) return next;
    next = act(next, { type: 'DECLINE_CONTRACT', contractId: offer.id });
  }
  return next;
}

/** The pieces the contract makes over the next seven days, a full working week. */
function aWeek(state: GameState, contractId: string): { state: GameState; made: number } {
  const before = state.contracts.find((contract) => contract.id === contractId)?.piecesMade ?? 0;
  const next = playDays(state, 7);
  const after = next.contracts.find((contract) => contract.id === contractId)?.piecesMade ?? 0;
  return { state: next, made: after - before };
}

/** The offer v83 drew on this day: the same stream, the same throw of the day's chance when no
 *  offer was owed, and the three sheet pieces it had. */
function v83Piece(state: GameState, day: number, owed: boolean): string | undefined {
  const carrier = { rng: (state.seed ^ Math.imul(day + 1, 0x9e3779b1)) | 0 };
  if (!owed) chance(carrier, CONTRACT_OFFER_CHANCE_PER_DAY);
  return pick(carrier, CONTRACT_PIECES.slice(0, 3))?.id;
}

describe('(bbb) windows on a standing contract (CLAUDE.md T29 2.12)', () => {
  // The 800 m² company with four joiners of the experienced grade on the books and no work.
  const company = timberCompany();
  company.workers.push(
    { ...testJoiner('w-sam', 'Sam'), tier: 'experienced', rate: 0.8, monthlyWage: 2600 },
    { ...testJoiner('w-joe', 'Joe'), tier: 'experienced', rate: 0.8, monthlyWage: 2600 },
  );
  const offers: Contract[] = [];
  const offered = untilOffered(company, 'sashWindow', offers);
  const offer = offeredContract(offered);
  let state = offered;
  if (offer !== null) {
    state = act(state, { type: 'ACCEPT_CONTRACT', contractId: offer.id });
    for (const id of ['w-tom', 'w-ben', 'w-sam', 'w-joe']) {
      state = act(state, { type: 'ASSIGN_CONTRACT', contractId: offer.id, workerId: id, on: true });
    }
  }
  const signed = state;
  const sheets = signed.stock.sheets;
  const deliveries = signed.deliveries.length;
  const without = aWeek(signed, offer?.id ?? '');
  // The whole line, the five axis CNC its first module asks for, and its two engineers.
  const lined = without.state;
  placeEquipment(lined, 'cnc5', { variantId: 'standard', x: 20, y: 9, id: 'kit-cnc5' });
  for (let n = 1; n <= 5; n += 1) {
    placeEquipment(lined, `windowLine${n}`, { x: 5 + 6 * (n - 1), y: 14, id: `kit-line-${n}` });
  }
  for (const id of ['e-kev', 'e-raj']) {
    lined.workers.push({ ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 });
  }
  const withLine = aWeek(connectAll(lined), offer?.id ?? '');

  it('is offered sash windows in the 800 m² unit, named in the plural, and takes it with four men', () => {
    expect(offer?.pieceId).toBe('sashWindow');
    expect(offer?.name.startsWith('Sash windows for ')).toBe(true);
    const running = signed.contracts.find((contract) => contract.id === offer?.id);
    expect(running?.status).toBe('active');
    expect(running?.assigned).toEqual(['w-tom', 'w-ben', 'w-sam', 'w-joe']);
  });

  it('is paid for every window with nothing off the racks or the stores and nothing ordered', () => {
    const after = withLine.state.contracts.find((contract) => contract.id === offer?.id);
    expect(after?.piecesMade).toBeGreaterThan(0);
    expect(after?.revenue).toBeCloseTo((after?.piecesMade ?? 0) * (after?.pricePerPiece ?? 0), 2);
    expect(after?.materialCost).toBe(0);
    expect(without.state.stock.sheets).toBe(sheets);
    expect(withLine.state.stock.sheets).toBe(sheets);
    expect(without.state.deliveries).toHaveLength(deliveries);
    expect(withLine.state.deliveries).toHaveLength(deliveries);
  });

  it('makes more of them a week with the line than without', () => {
    expect(lineLevel(withLine.state)).toBe(5);
    expect(without.made).toBeGreaterThan(0);
    expect(withLine.made).toBeGreaterThan(without.made);
    console.log(`(bbb) sash windows a week, four men: ${without.made} without the line, ${withLine.made} with it`);
  });

  it('is never offered a window or a door in the 400 m² unit, and its offers are v83 s', () => {
    let small = newGame({ difficulty: 'veryEasy' });
    small.cash = 9000000;
    small = nextDay(act(small, { type: 'EXTEND_UNIT' }));
    small = buyStartingKit(small);
    small.reputation = 40;
    small.cash = 9000000;
    // Every offer of a hundred and twenty days, each declined the day it comes, and each beside the
    // piece v83's three would have given off the same stream: whether the day's chance was thrown
    // is read off the engine's own record of the last offer, before the day.
    const seen: Array<{ offer: Contract; owed: boolean }> = [];
    let now = small;
    const standing = offeredContract(now);
    if (standing !== null) now = act(now, { type: 'DECLINE_CONTRACT', contractId: standing.id });
    for (let day = 0; day < 120; day += 1) {
      const last = now.lastContractOfferDay;
      const owed = now.reputation >= CONTRACT_WEEKLY_OFFER_REPUTATION;
      now = nextDay(now);
      const offer = offeredContract(now);
      if (offer === null) continue;
      seen.push({ offer: { ...offer }, owed: owed && (last === null || offer.offeredDay - last >= 7) });
      now = act(now, { type: 'DECLINE_CONTRACT', contractId: offer.id });
    }
    expect(seen.length).toBeGreaterThan(5);
    for (const { offer, owed } of seen) {
      expect(CONTRACT_PIECES.find((piece) => piece.id === offer.pieceId)?.timber, offer.name).toBeUndefined();
      expect(offer.pieceId, `${offer.offeredDay}`).toBe(v83Piece(small, offer.offeredDay, owed));
    }
  });
});
