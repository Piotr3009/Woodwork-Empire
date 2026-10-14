/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// The Turn 30 scenarios of CLAUDE.md T30 E2. The letters follow Turn 29's (bbb).
//
// (ccc) A v42 save shaped as Piotr's (the 800 m² unit, module 1 on order) opens with 1,500,000 back
//       and the card; one with no module opens with no card.
// (ddd) A company in the 800 m² unit with the money is refused the line in a 400 m² unit, with too
//       little cash and with no free 36 by 3; buys it in one click; the six stand on one morning at
//       cells x 2 to 37, y 14 to 16; are moved as one in setup mode, refused onto a rack and refused
//       a turn, and put back; two engineers are hired; a window job's Cross cutting is on module 1,
//       its Finishing on module 5 and its Glazing on module 6, at the engine's own pace.
// (eee) The offer card comes at the first working morning with the six standing and two engineers
//       on the books; taken, and from Turn 32 its timber and glass restocked by the player at the
//       same minute onto the timber store and the glass rack, in the next working morning, the line
//       holding its week of them off the stores (CLAUDE.md T32 2.3, 2.5); a window every 120 minutes and four a working
//       day, each £1,500 in; none in the dinner hour when the owner works through it; the tenth goes
//       to the gate and is gone the next working morning; with one engineer away no window is made
//       that day; a window job taken while it runs gets no line and no boards saved; ended, the jobs
//       have the line again and the card comes back a week later.
// (fff) The four upgrades bring the window to 60 minutes and eight a day; the line sold takes them
//       with it, for 5,000,000 on one ledger line.
// (ggg) The hall draws the six from their sheets while the contract runs and the clock runs, and
//       from their pictures once the clock is paused and the page written again; module 6 shows the
//       overlay of the windows on its pallet, and none when it is empty.

import { describe, expect, it } from 'vitest';
import {
  BREAK_START_MINUTE,
  BREAK_MINUTES,
  CNC5_STAGE_FACTOR,
  LINE_FACTOR,
  LINE_MODULES,
  LINE_PALLET_WINDOWS,
  LINE_UPGRADES,
  LINE_WINDOW_PRICE,
} from '../../src/engine/constants';
import { applyAction, runMinutes, tick } from '../../src/engine/index';
import type { GameEvent, GameState, StagedJob } from '../../src/engine/index';
import { isOvertime, isWorkingDay } from '../../src/engine/clock';
import { canBuy } from '../../src/engine/game';
import { stagedJob } from '../../src/engine/jobs';
import { lineWindowMinutes, lineWindowsAWeek } from '../../src/engine/lineContract';
import { pendingStockSheets } from '../../src/engine/materials';
import { lineLevel, lineModules } from '../../src/engine/machines';
import { migrateState } from '../../src/engine/migrate';
import { jobPace, stagePlanFor } from '../../src/engine/stages';
import { renderHall } from '../../src/render/hall';
import {
  act,
  acceptNow,
  buyStartingKit,
  connectAll,
  newGame,
  nextDay,
  placeEnquiry,
  placeEquipment,
  placeGlassRack,
  testJoiner,
  withAir,
  withExtraction,
} from '../helpers';
import { lineState } from '../../src/engine/lineContract';

// ---------------------------------------------------------------------------------------------
// The plays
// ---------------------------------------------------------------------------------------------

/** The answer a script gives a card: the first choice, unless it says otherwise. */
type Answer = (event: GameEvent) => string | undefined;

/** One step of the clock the way the helpers' `nextDay` plays it: an hour, every card answered,
 *  home at five. The state at a card the watcher names is kept before the card is answered. */
function step(state: GameState, answer: Answer, seen: GameEvent[], watch: (at: GameState) => void): GameState {
  let next = tick(state, 60);
  let guard = 0;
  while (guard < 500) {
    guard += 1;
    if (next.activeEvent === null) {
      if (isOvertime(next.clock.minute) && !next.owner.wentHome) {
        next = applyAction(next, { type: 'END_DAY' });
        continue;
      }
      break;
    }
    watch(next);
    seen.push(next.activeEvent);
    const choice = answer(next.activeEvent) ?? next.activeEvent.choices[0]?.id ?? 'ok';
    next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: choice });
  }
  return next;
}

/** Plays to the open of the next day, every card answered by the script. */
function day(state: GameState, answer: Answer = () => undefined, seen: GameEvent[] = [], watch: (at: GameState) => void = () => undefined): GameState {
  let next = state;
  const today = next.clock.day;
  let guard = 0;
  while (next.clock.day === today && next.gameOver === null && guard < 200) {
    guard += 1;
    next = step(next, answer, seen, watch);
  }
  return next;
}

/** Plays minutes of the clock, answering every card by the script. */
function minutes(state: GameState, count: number, answer: Answer = () => undefined): GameState {
  let next = state;
  let left = count;
  let guard = 0;
  while (left > 0 && guard < 400) {
    guard += 1;
    if (next.activeEvent !== null) {
      next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: answer(next.activeEvent) ?? next.activeEvent.choices[0]?.id ?? 'ok' });
      continue;
    }
    const result = runMinutes(next, left);
    next = result.state;
    left -= result.minutesRun;
    if (result.minutesRun === 0 && next.activeEvent === null) break;
  }
  return next;
}

/** A window as the plan reads it: solid wood, lacquered, the timber plan. */
function windowJob(): StagedJob {
  return stagedJob(100, 'solidWood', false, 'lacquer', false, true);
}

function planOf(state: GameState): Record<string, { family: string | null; speed: number }> {
  const plan: Record<string, { family: string | null; speed: number }> = {};
  for (const stage of stagePlanFor(state, windowJob())) plan[stage.id] = { family: stage.family, speed: stage.speed };
  return plan;
}

/** The engine's own sum: the shares over the shares at their speeds, written out from the stages'
 *  figures. */
function sumOf(state: GameState, speeds: Record<string, number>): number {
  let spent = 0;
  let labour = 0;
  for (const stage of stagePlanFor(state, windowJob())) {
    const speed = speeds[stage.id];
    if (speed === undefined) throw new Error(`no speed for ${stage.id}`);
    spent += stage.share / speed;
    labour += stage.share;
  }
  return labour / spent;
}

/** The six modules' anchors along the line, in its order. */
function anchors(state: GameState): Array<[number, number]> {
  return LINE_MODULES.map((id) => {
    const item = state.equipment.find((entry) => entry.specId === id);
    return [item?.anchorX ?? -1, item?.anchorY ?? -1];
  });
}

/** The day's windows on its one growing line, and the material booked as they were made: none from
 *  Turn 31, which pays the timber and the glass when they are bought, from Turn 32 by the restock
 *  (CLAUDE.md T31 2.1, T32 2.5). */
function windowsBooked(state: GameState, on: number): { windows: number[]; material: number[] } {
  return {
    windows: state.ledger.filter((entry) => entry.label === 'Windows off line 1: windows' && entry.day === on).map((entry) => entry.amount),
    material: state.ledger
      .filter((entry) => entry.label === 'Windows off line 1: timber and glass' && entry.day === on)
      .map((entry) => entry.amount),
  };
}

/** Plays on in half hours until the boards and the glass bought for stock are off their lorries and
 *  on the timber store and the glass rack, which is the morning after the restock: the labourer
 *  takes them in (CLAUDE.md T32 2.6). Flipped in v96: the glass comes by lorry too. */
function untilTheMaterialIsIn(state: GameState): GameState {
  let next = state;
  for (let guard = 0; next.deliveries.some((delivery) => delivery.jobId === null && !delivery.unloaded) && guard < 200; guard += 1) {
    next = minutes(next, 30);
  }
  return next;
}

/** The player keeps the line in timber and glass, as the Materials page's Restock lets him: forty
 *  boards and twenty glass units for stock when what is on the stores and on its way would not last
 *  two days at an hour a window (CLAUDE.md T32 2.3, 2.5). Flipped in v96: the line's two order
 *  buttons are gone, and it takes its material from the stores. */
function keepInMaterial(state: GameState): GameState {
  let next = state;
  if (next.stock.boards + pendingStockSheets(next, 'boards') < 32) next = act(next, { type: 'RESTOCK', kind: 'boards', sheets: 40 });
  if (next.stock.glass + pendingStockSheets(next, 'glass') < 16) next = act(next, { type: 'RESTOCK', kind: 'glass', sheets: 20 });
  return next;
}

/** A company in the 800 m² unit, the second extension open, with the timber kit, a timber store
 *  and a glass rack, two joiners, and the money for the line. */
function timberCompany(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withExtraction(withAir(buyStartingKit(state), 'industrial'));
  state.cash = 12000000;
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
  // The line's glass is on the glass racks from Turn 32: a glass rack at the first free cells, at
  // the back wall and clear of the line and its lane (CLAUDE.md T32 2.1, 2.5).
  placeGlassRack(state);
  state.workers.push(testJoiner('w-tom', 'Tom'), testJoiner('w-ben', 'Ben'));
  return connectAll(state);
}

// ---------------------------------------------------------------------------------------------
// (ccc)
// ---------------------------------------------------------------------------------------------

/** A whole v42 save of an 800 m² company, as Piotr's own: written raw from a game of today, its
 *  version set back, its line field taken off (a v42 save has none) and the day set to 999. */
function v42Save(): Record<string, unknown> & { onOrder: Array<Record<string, unknown>>; clock: Record<string, unknown>; cash: number } {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = buyStartingKit(state);
  state.cash = 40000;
  const raw = JSON.parse(JSON.stringify(state)) as ReturnType<typeof v42Save>;
  raw.version = 42;
  delete raw.windowLine;
  raw.clock.day = 999;
  raw.clock.minute = 0;
  raw.activeEvent = null;
  raw.eventQueue = [];
  return raw;
}

describe('(ccc) a v42 save shaped as Piotr s (CLAUDE.md T30 section 4)', () => {
  it('opens with module 1 s 1,500,000 back, no module, and the card at its first settle', () => {
    const raw = v42Save();
    raw.onOrder.push({
      id: 'order-line-1',
      specId: 'windowLine1',
      variantId: 'standard',
      pricePaid: 1500000,
      orderedDay: 990,
      dueDay: 1020,
      anchorX: 5,
      anchorY: 14,
      arrived: false,
      orientation: 0,
    });
    const cash = raw.cash;
    const opened = migrateState(raw, 42);
    if (opened === null) throw new Error('the save opens');
    expect(opened.cash).toBe(cash + 1500000);
    expect(opened.onOrder.some((item) => LINE_MODULES.includes(item.specId))).toBe(false);
    expect(opened.equipment.some((item) => LINE_MODULES.includes(item.specId))).toBe(false);
    // Played: the card is the first thing the player sees, and Right is all it asks.
    const seen: GameEvent[] = [];
    const played = day({ ...opened, speed: 1 }, () => undefined, seen);
    expect(seen[0]?.kind).toBe('lineRefunded');
    expect(seen[0]?.title).toBe('The production line is sold whole');
    expect(seen[0]?.choices).toEqual([{ id: 'ok', label: 'Right' }]);
    expect(played.ledger.filter((entry) => entry.label === 'Production line refunded: it is sold whole now').map((entry) => entry.amount)).toEqual([
      1500000,
    ]);
  });

  it('opens a save with no module with no card', () => {
    const opened = migrateState(v42Save(), 42);
    if (opened === null) throw new Error('the save opens');
    const seen: GameEvent[] = [];
    day({ ...opened, speed: 1 }, () => undefined, seen);
    expect(seen.some((event) => event.kind === 'lineRefunded')).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
// (ddd) to (ggg): one company, played from the order of its line to its sale
// ---------------------------------------------------------------------------------------------

const industrial = 1.12;
const company = timberCompany();
// The refusals before the order (CLAUDE.md T30 2.3.4).
const small = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
small.cash = 12000000;
const smallRefusal = canBuy(small, 'windowLine1');
const poor = structuredClone(company);
poor.cash = 1000;
const poorRefusal = canBuy(poor, 'windowLine1');
const full = structuredClone(company);
for (let y = 0; y < full.unit.depthCells; y += 1) placeEquipment(full, 'planer', { variantId: 'standard', x: 18, y, id: `kit-wall-${y}` });
const fullRefusal = canBuy(full, 'windowLine1');
// One click.
const cashBefore = company.cash;
let flow = act(company, { type: 'BUY_EQUIPMENT', specId: 'windowLine1' });
const orders = flow.onOrder.filter((item) => LINE_MODULES.includes(item.specId));
const order = { cash: cashBefore - flow.cash, dueDays: new Set(orders.map((item) => item.dueDay)), dueDay: orders[0]?.dueDay ?? 0 };
const orderLedger = flow.ledger.filter((entry) => entry.label === 'Window production line, line 1, ordered').map((entry) => entry.amount);
// Played to the morning it is due.
for (let guard = 0; flow.clock.day < order.dueDay && guard < 60; guard += 1) flow = day(flow);
const landed = flow;

describe('(ddd) the line bought whole, stood, moved and run on the window jobs (CLAUDE.md T30 2.3 to 2.5)', () => {
  it('is refused in a 400 m² unit, with too little cash and with no free 36 m by 3 m', () => {
    expect(smallRefusal).toEqual({ ok: false, reason: 'Needs the 800 m² unit' });
    expect(poorRefusal).toEqual({ ok: false, reason: 'Not enough cash' });
    // From Turn 31 the line's lane is asked with it (CLAUDE.md T31 2.6).
    expect(fullRefusal).toEqual({ ok: false, reason: 'No room in the hall for the line and its lane' });
  });

  it('is bought in one click, six on order on one due day for 10,000,000 on one ledger line', () => {
    expect(orders.map((item) => item.specId)).toEqual([...LINE_MODULES]);
    expect(order.dueDays.size).toBe(1);
    expect(order.cash).toBe(10000000);
    expect(orderLedger).toEqual([-10000000]);
  });

  it('stands the six on one morning at cells x 2 to 37, y 14 to 16, with nobody to unload them', () => {
    expect(landed.clock.day).toBe(order.dueDay);
    expect(lineModules(landed, 1)).toBe(6);
    expect(anchors(landed)).toEqual(LINE_MODULES.map((_, index) => [2 + 6 * index, 14]));
    expect(landed.tasks.some((task) => task.kind === 'unload' && !task.done)).toBe(false);
  });

  it('is moved as one in setup mode, refused onto a rack and refused a turn, and put back', () => {
    const setup = { ...structuredClone(landed), speed: 0 } as GameState;
    const third = setup.equipment.find((item) => item.specId === 'windowLine3');
    if (third === undefined) throw new Error('module 3 stands');
    // From Turn 31 the rack stands behind the line, off its lane (CLAUDE.md T31 2.6), and from v93
    // off the metre behind the line's next place too.
    placeEquipment(setup, 'sheetRack', { variantId: 'standard', x: 20, y: 10, id: 'kit-rack-in-the-way' });
    // Onto the rack: refused, and nothing moves.
    const ontoRack = act(setup, { type: 'MOVE_ITEM', itemId: third.id, x: third.anchorX, y: 10 });
    expect(anchors(ontoRack)).toEqual(anchors(setup));
    expect(ontoRack.movedItems).toEqual([]);
    // Turned: refused, and nothing turns.
    const turned = act(setup, { type: 'MOVE_ITEM', itemId: third.id, x: third.anchorX, y: third.anchorY, orientation: 1 });
    expect(turned.equipment.filter((item) => LINE_MODULES.includes(item.specId)).map((item) => item.orientation)).toEqual([0, 0, 0, 0, 0, 0]);
    // A clear place one row towards the back wall: the six go by the same cells.
    const moved = act(setup, { type: 'MOVE_ITEM', itemId: third.id, x: third.anchorX, y: 13 });
    expect(anchors(moved)).toEqual(LINE_MODULES.map((_, index) => [2 + 6 * index, 13]));
    const asked = act(moved, { type: 'END_SETUP', speed: 1 });
    expect(asked.activeEvent?.body).toBe('Moving 6 machines takes 6 h. Do it?');
    const back = act(asked, { type: 'RESOLVE_EVENT', choiceId: 'back' });
    expect(anchors(back)).toEqual(anchors(landed));
  });
});

// Two engineers hired, one after the other, and played to the morning the line's contract is
// offered: the state at the card is kept, before it is answered.
let hiring = act(landed, { type: 'HIRE', role: 'lineEngineer', tier: null });
hiring = day(hiring);
hiring = act(hiring, { type: 'HIRE', role: 'lineEngineer', tier: null });
let atOffer: GameState | null = null;
const offerSeen: GameEvent[] = [];
for (let guard = 0; atOffer === null && guard < 10; guard += 1) {
  hiring = day(hiring, () => undefined, offerSeen, (at) => {
    if (at.activeEvent?.kind === 'lineContractOffered' && atOffer === null) atOffer = structuredClone(at);
  });
}
const offered: GameState = atOffer ?? hiring;
// Taken at the card, and from Turn 32 its timber and glass restocked at the same minute on the
// Materials page, forty boards and twenty glass units, in the next working morning: the windows
// start once both are off their lorries and the line holds its week of them (CLAUDE.md T32 2.3,
// 2.5). The glass comes by lorry as the boards do, so a morning may bring two loads to take in: a
// labourer on the books from the take does it, as the (aaa) company's does, so neither waits at
// the gate behind the other's card (CLAUDE.md T32 2.6) [TUNE].
const atTake = structuredClone(offered);
atTake.workers.push({ ...testJoiner('w-gus', 'Gus'), role: 'helper', tier: null, rate: 0 });
const ordered = act(act(act(atTake, { type: 'RESOLVE_EVENT', choiceId: 'take' }), { type: 'RESTOCK', kind: 'boards', sheets: 40 }), {
  type: 'RESTOCK',
  kind: 'glass',
  sheets: 20,
});
let reachedMorning = day(ordered);
while (!isWorkingDay(reachedMorning.clock.day)) reachedMorning = day(reachedMorning);
const taken = untilTheMaterialIsIn(reachedMorning);

describe('(ddd) with two engineers, before the contract (CLAUDE.md T30 2.5)', () => {
  it('does the window s Cross cutting on module 1, its Finishing on module 5 and its Glazing on module 6, at the engine s own pace', () => {
    expect(offered.workers.filter((worker) => worker.role === 'lineEngineer')).toHaveLength(2);
    expect(lineLevel(offered, 1)).toBe(6);
    const plan = planOf(offered);
    const factor = LINE_FACTOR[6] ?? 1;
    expect(plan.crossCutting).toEqual({ family: 'windowLine1', speed: factor * industrial });
    expect(plan.finishing?.family).toBe('windowLine5');
    expect(plan.assembly?.family).toBe('windowLine6');
    const pace = sumOf(offered, {
      crossCutting: factor * industrial,
      planing: factor * industrial,
      moulding: factor * CNC5_STAGE_FACTOR * industrial,
      sanding: factor * industrial,
      pressing: factor * industrial,
      finishing: factor * industrial,
      assembly: factor * industrial,
    });
    expect(jobPace(offered, windowJob())).toBeCloseTo(pace, 10);
  });
});

describe('(eee) the line s own contract, played (CLAUDE.md T30 2.6 to 2.8)', () => {
  it('is offered by the card at the first working morning with the six standing and two engineers on the books, and taken', () => {
    const card = offerSeen.find((event) => event.kind === 'lineContractOffered');
    expect(card?.title).toBe('Windows off line 1');
    expect(offered.clock.minute).toBe(0);
    expect(isWorkingDay(offered.clock.day)).toBe(true);
    expect(offered.workers.filter((worker) => worker.role === 'lineEngineer' && worker.startDay <= offered.clock.day)).toHaveLength(2);
    expect(lineState(taken, 1).contract?.status).toBe('active');
    // Not one of the standing contracts (played a day further from Turn 31, so a standing offer of
    // the card's morning may have lapsed by then, and the count is not the check).
    expect(taken.contracts.some((contract) => contract.name === 'Windows off line 1')).toBe(false);
    // Its timber and glass were paid at the click on the material line (CLAUDE.md T31 2.2). Flipped
    // in v96: bought for stock by the restock, the boards on the sheets' ladder (180 a board at
    // forty) and the glass at 200 a unit (CLAUDE.md T32 2.3).
    const orders = taken.ledger.filter((entry) => entry.day === offered.clock.day && / for stock$/.test(entry.label));
    expect(orders.map((entry) => [entry.label, entry.amount])).toEqual([
      ['40 boards for stock', -7200],
      ['20 glass units for stock', -4000],
    ]);
    // And the line holds its week of them off the stores, two boards and a glass unit a window, as
    // a sheet contract holds its week's sheets (CLAUDE.md T32 2.5).
    const contract = lineState(taken, 1).contract;
    expect(taken.stock.boards).toBe(40);
    expect(taken.stock.glass).toBe(20);
    expect(contract?.boardsReserved).toBe(Math.min(40, 2 * lineWindowsAWeek(taken, 1)));
    expect(contract?.glassReserved).toBe(Math.min(20, lineWindowsAWeek(taken, 1)));
  });

  it('makes a window every 60 minutes and eight a working day, each £1,500 in', () => {
    // From Turn 31 the windows start once the timber is on the stores, the morning after the order,
    // and none of their material is booked as they are made (CLAUDE.md T31 2.1, 2.2). Flipped in
    // v96: the labourer has both loads in by late morning, so the first window's two hours would run
    // across the dinner hour, in which the line stands; they are counted from one o'clock.
    const running = minutes(taken, BREAK_START_MINUTE + BREAK_MINUTES - taken.clock.minute);
    expect(running.clock.minute).toBe(BREAK_START_MINUTE + BREAK_MINUTES);
    expect(windowsBooked(day(offered), offered.clock.day).windows).toEqual([]);
    // Flipped in v97: an hour a window (PIOTR, 14.10).
    expect(lineWindowMinutes(running, 1)).toBe(60);
    // Counted from the minutes the window in hand already has: the half hour the material came in.
    const from = lineState(running, 1).minutes;
    expect(lineState(running, 1).contract?.windowsMade).toBe(0);
    expect(lineState(minutes(running, 59 - from), 1).contract?.windowsMade).toBe(0);
    expect(lineState(minutes(running, 60 - from), 1).contract?.windowsMade).toBe(1);
    let whole = day(running);
    while (!isWorkingDay(whole.clock.day)) whole = day(whole);
    const morning = whole.clock.day;
    whole = day(whole);
    // Eight a day from v97.
    expect(windowsBooked(whole, morning)).toEqual({ windows: [8 * LINE_WINDOW_PRICE], material: [] });
  });

  it('makes none in the dinner hour when the owner works through it', () => {
    const running = taken;
    const toNoon = minutes(running, BREAK_START_MINUTE - running.clock.minute);
    const through = minutes(toNoon, BREAK_MINUTES, (event) => (event.kind === 'breakTime' ? 'skip' : undefined));
    expect(through.clock.minute).toBeGreaterThanOrEqual(BREAK_START_MINUTE + BREAK_MINUTES);
    expect(lineState(through, 1).contract?.windowsMade).toBe(lineState(toNoon, 1).contract?.windowsMade);
    expect(lineState(through, 1).minutes).toBe(lineState(toNoon, 1).minutes);
  });

  it('sends the tenth to the gate, and the client takes it at the next working open', () => {
    let state = taken;
    let guard = 0;
    while ((lineState(state, 1).contract?.windowsMade ?? 0) < LINE_PALLET_WINDOWS && guard < 6) {
      guard += 1;
      // Played to five, so the pallet is seen at the gate before the morning takes it.
      state = minutes(state, 540 - state.clock.minute);
      if ((lineState(state, 1).contract?.windowsMade ?? 0) < LINE_PALLET_WINDOWS) state = day(state);
    }
    // From Turn 31 the first day starts once the timber is unloaded, so the count at the tenth's
    // evening moves with the hour it was in (CLAUDE.md T31 2.2).
    const made = lineState(state, 1).contract?.windowsMade ?? 0;
    expect(made).toBeGreaterThanOrEqual(LINE_PALLET_WINDOWS);
    expect(lineState(state, 1).palletsAtGate).toBe(1);
    expect(lineState(state, 1).onPallet).toBe(made - LINE_PALLET_WINDOWS);
    const ledger = state.ledger.length;
    let next = day(state);
    while (!isWorkingDay(next.clock.day)) next = day(next);
    expect(lineState(next, 1).palletsAtGate).toBe(0);
    // No line in the ledger for the collection: its windows were paid as they were made.
    expect(next.ledger.slice(ledger).some((entry) => /pallet|collect/i.test(entry.label))).toBe(false);
  });

  it('makes no window the day one engineer is away', () => {
    const state = structuredClone(taken);
    const engineer = state.workers.find((worker) => worker.role === 'lineEngineer');
    if (engineer === undefined) throw new Error('an engineer is wanted');
    engineer.absentDaysRemaining = 1;
    expect(lineLevel(state, 1)).toBe(3);
    const made = lineState(state, 1).contract?.windowsMade ?? 0;
    // Played to five. Flipped in v96: the material is in by late morning, so 540 minutes from here
    // would run into the next day, when he is back.
    expect(lineState(minutes(state, 540 - state.clock.minute), 1).contract?.windowsMade).toBe(made);
  });

  it('gives a window job taken while it runs no line and no boards saved, and gives the jobs the line back once ended', () => {
    const enquiry = { templateId: 'sashWindows', name: 'Mr Hall s sashes', price: 5600, basePrice: 5600, finish: 'lacquer', materialKind: 'solidWood', deadlineDays: 90 } as const;
    const running = structuredClone(taken);
    const jobOf = (state: GameState): { sheets: number } => {
      const placed = placeEnquiry(state, { ...enquiry });
      const before = new Set(state.jobs.map((job) => job.id));
      const after = acceptNow(state, placed.id);
      const job = after.jobs.find((entry) => !before.has(entry.id));
      if (job === undefined) throw new Error('the window is taken');
      return job;
    };
    // The same window in a company with no line at all.
    const without = structuredClone(taken);
    without.equipment = without.equipment.filter((item) => !LINE_MODULES.includes(item.specId));
    lineState(without, 1).contract = null;
    expect(jobOf(running).sheets).toBe(jobOf(without).sheets);
    expect(Object.values(planOf(running)).some((stage) => LINE_MODULES.includes(stage.family ?? ''))).toBe(false);
    // Ended: the line is the jobs' again, and its boards are saved again.
    const ended = act(taken, { type: 'END_LINE_CONTRACT', line: 1 });
    expect(planOf(ended).crossCutting?.family).toBe('windowLine1');
    expect(jobOf(structuredClone(ended)).sheets).toBeLessThan(jobOf(without).sheets);
  });

  it('comes back by its card a week after it is ended, and not before', () => {
    let state = act(taken, { type: 'END_LINE_CONTRACT', line: 1 });
    const again = state.clock.day + 7;
    const seen: Array<{ day: number; kind: string }> = [];
    for (let guard = 0; state.clock.day < again + 3 && guard < 14; guard += 1) {
      const events: GameEvent[] = [];
      const on = state.clock.day;
      state = day(state, () => undefined, events);
      for (const event of events) seen.push({ day: event.day ?? on, kind: event.kind });
    }
    const offers = seen.filter((entry) => entry.kind === 'lineContractOffered');
    expect(offers.length).toBe(1);
    expect(offers[0]?.day).toBeGreaterThanOrEqual(again);
  });
});

describe('(fff) the four upgrades, and the line sold (CLAUDE.md T30 2.10, 2.3.5)', () => {
  // The money for the four, on top of what the company has.
  let state = structuredClone(taken);
  state.cash += 2000000;
  for (const upgrade of LINE_UPGRADES) state = act(state, { type: 'BUY_LINE_UPGRADE', line: 1, upgradeId: upgrade.id });
  const bought = state;
  const ready = Math.max(...lineState(bought, 1).upgrades.map((upgrade) => upgrade.fittedOnDay));
  // The player keeps the line in timber and glass through the ten working days (CLAUDE.md T31 2.2).
  for (let guard = 0; state.clock.day < ready && guard < 30; guard += 1) state = day(keepInMaterial(state));
  const fitted = keepInMaterial(state);

  it('brings the window to 20 minutes and twenty four a working day', () => {
    expect(bought.ledger.filter((entry) => entry.label.startsWith('Line 1 upgrade: ')).map((entry) => entry.amount)).toEqual(
      LINE_UPGRADES.map((upgrade) => -upgrade.price),
    );
    // Flipped in v97: ten minutes an upgrade, twenty minutes with all four (PIOTR, 14.10).
    expect(lineWindowMinutes(fitted, 1)).toBe(20);
    expect(lineState(fitted, 1).contract?.status).toBe('active');
    // The second working day at 20 minutes: from Turn 31 the line stood now and then for its
    // material in the ten days before, so the first day's count carries the minutes of a slower
    // window in hand (CLAUDE.md T31 2.1).
    let next = day(fitted);
    while (!isWorkingDay(next.clock.day)) next = day(next);
    const morning = next.clock.day;
    // Twenty four windows a day want 48 boards and 24 units on the stores at the open, more than
    // one rack of each holds (v97): the shelter and the large glass rack, stocked for the day.
    placeEquipment(next, 'timberShelter', { variantId: 'standard', x: 30, y: 2, id: 'kit-shelter-fff' });
    placeGlassRack(next, 'glassRackLarge');
    next.stock.boards = 100;
    next.stock.glass = 50;
    const whole = day(next);
    expect(windowsBooked(whole, morning).windows).toEqual([24 * LINE_WINDOW_PRICE]);
  });

  it('is sold whole from one module s tile, takes the upgrades with it, and pays 5,000,000 on one ledger line', () => {
    const fifth = fitted.equipment.find((item) => item.specId === 'windowLine5');
    let sold = act(fitted, { type: 'SELL_MACHINE', equipmentId: fifth?.id ?? '' });
    expect(sold.equipment.filter((item) => LINE_MODULES.includes(item.specId)).every((item) => item.soldOnDay !== null)).toBe(true);
    expect(lineState(sold, 1).upgrades).toEqual([]);
    expect(lineState(sold, 1).contract).toBeNull();
    const seen: GameEvent[] = [];
    sold = day(sold, () => undefined, seen);
    while (!isWorkingDay(sold.clock.day)) sold = day(sold, () => undefined, seen);
    expect(sold.equipment.some((item) => LINE_MODULES.includes(item.specId))).toBe(false);
    expect(sold.ledger.filter((entry) => entry.label === 'Sold: Window production line, line 1').map((entry) => entry.amount)).toEqual([5000000]);
    expect(seen.filter((event) => event.kind === 'machineCollected').map((event) => event.title)).toEqual(['Window production line, line 1 collected']);
  });
});

describe('(ggg) the line on the hall, played (CLAUDE.md T30 2.11, 2.12)', () => {
  // Mid morning of a working day with the contract running and the clock at 1x.
  const running = minutes(taken, 90);
  running.speed = 1;

  function hall(state: GameState): HTMLElement {
    const page = document.createElement('div');
    page.innerHTML = renderHall(state);
    return page;
  }

  it('draws the six from their sheets while the contract runs and the clock runs', () => {
    const page = hall(running);
    expect(Array.from(page.querySelectorAll('[data-sheet]')).map((node) => node.getAttribute('data-sheet'))).toEqual([...LINE_MODULES]);
  });

  it('draws them from their pictures once the clock is paused and the page written again', () => {
    const paused = act(running, { type: 'SET_SPEED', speed: 0 });
    const page = hall(paused);
    expect(page.querySelector('[data-sheet]')).toBeNull();
    for (const id of LINE_MODULES) expect(page.querySelector(`image[href="/sprites/${id}.standard.png"]`), id).not.toBeNull();
  });

  it('shows the windows on module 6 s pallet, and none when it is empty', () => {
    const seven = structuredClone(running);
    lineState(seven, 1).onPallet = 7;
    const stacks = Array.from(hall(seven).querySelectorAll('[data-stack]')).map((node) => node.getAttribute('href'));
    expect(stacks).toEqual(['/sprites/windowLine6.standard.stack07.png']);
    const empty = structuredClone(running);
    lineState(empty, 1).onPallet = 0;
    expect(hall(empty).querySelector('[data-stack]')).toBeNull();
  });
});
