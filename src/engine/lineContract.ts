/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The production line's own state and its own contract (PIOTR, 10.10 and 11.10; CLAUDE.md T30).
// The line is six modules of kit on the floor, bought whole, and everything of it that is not kit
// lives in one field of the state, `state.windowLine`: its contract, the day it may be offered
// again, the minutes into the window in hand, the windows on module 6's pallet, the full pallets at
// the gate and the upgrades. The field is written whole from the first task that needs it, every
// part with its default, so the save is lifted once (CLAUDE.md T30 section 4) [TUNE: the name of
// this module].
//
// The contract is a record of its own and never one of `state.contracts` [TUNE: chat]: it is not
// counted against the three, nobody is put on it, it has no week to meet, no term and no price off
// a band, and it draws nothing off the seeded stream, so no other offer, job or event of any save
// moves by a step (CLAUDE.md T30 2.6). Its windows are made by the line's own minute, beside the
// men's, and book nothing to any man or machine (2.7); every tenth goes to the gate on a pallet,
// which the client takes at the open of the next working day (2.8).

import {
  DAYS_PER_WEEK,
  GLASS_DELIVERY_WORKING_DAYS,
  LINE_BOARDS_PER_WINDOW,
  LINE_CONTRACT_NAME,
  LINE_ENGINEERS_MAX,
  LINE_GLASS_PER_WINDOW,
  LINE_GLASS_WINDOWS_MAX,
  LINE_MATERIAL_SHARE,
  LINE_MODULES,
  LINE_ORDER_WINDOWS,
  LINE_PALLET_WINDOWS,
  LINE_REORDER_DAYS,
  LINE_UPGRADE_DAYS,
  LINE_UPGRADE_MINUTES,
  LINE_UPGRADES,
  LINE_WINDOW_MINUTES,
  LINE_WINDOW_MINUTES_MIN,
  LINE_WINDOW_PRICE,
  MINUTES_PER_WORKING_DAY,
  SHEET_VALUE,
  WORKING_DAYS_PER_WEEK,
} from './constants';
import { addWorkingDays, formatCalendarDay, isBreak, isWorkingDay, weekOfDay } from './clock';
import { canAfford, charge, formatMoney, noteLoss, pay, refund } from './economy';
import { queueEvent } from './events';
import { MATERIAL_ORDER_ROLES } from './jobs';
import { boardRoom, freeBoardRoom, lineLevel, lineStandsWhole } from './machines';
import { cancelledLoadWords, createDelivery, isBoards, lineLoadWords } from './materials';
import { crewHasGoneHome, lineEngineers } from './staff';
import { firstOnDutyOf, movingMachines } from './tasks';
import { inWords, plural } from './text';
import { bookLineMinute, bookLineUpgrade, bookLineWindow, emptyLineDay, emptyLineSince, openLineBooks } from './lineBooks';
import type { LineLostCause } from './lineBooks';
import type { Delivery, GameState, LineContract, WindowLineState } from './types';

/** The line's state of a company that has never had a line: no contract, no offer yet, no window
 *  in hand, an empty pallet, nothing at the gate and no upgrade (CLAUDE.md T30 section 4); from
 *  Turn 31 no timber, no glass, nothing on its way and an empty day book (CLAUDE.md T31 section
 *  4). */
export function emptyWindowLine(day = 0): WindowLineState {
  return {
    contract: null,
    nextOfferDay: null,
    minutes: 0,
    onPallet: 0,
    palletsAtGate: 0,
    upgrades: [],
    boards: 0,
    glass: 0,
    glassOnTheWay: [],
    today: emptyLineDay(day),
    days: [],
    since: emptyLineSince(),
  };
}

/** What the timber and the glass of one window cost, written from the price and the share and
 *  never as a figure of its own: 600 (CLAUDE.md T30 2.6). */
export function lineMaterialPerWindow(): number {
  return LINE_WINDOW_PRICE * LINE_MATERIAL_SHARE;
}

/** What a window's boards cost: two boards at a sheet's value, 400 (CLAUDE.md T31 2.1) [TUNE: chat:
 *  the split]. */
export function lineBoardsCostPerWindow(): number {
  return LINE_BOARDS_PER_WINDOW * SHEET_VALUE;
}

/** What a window's glass costs: the rest of the window's material, 200 (CLAUDE.md T31 2.1) [TUNE:
 *  chat: the split]. */
export function lineGlassCostPerWindow(): number {
  return lineMaterialPerWindow() - lineBoardsCostPerWindow();
}

/** The boards of one order of the line's timber: twenty windows' boards, 40 (CLAUDE.md T31 2.2). */
export function lineOrderBoards(): number {
  return LINE_ORDER_WINDOWS * LINE_BOARDS_PER_WINDOW;
}

/** What one order of the line's timber costs, at a sheet's value a board: 8,000 (CLAUDE.md T31
 *  2.2). */
export function lineTimberOrderCost(): number {
  return lineOrderBoards() * SHEET_VALUE;
}

/** What one order of the line's glass costs, twenty windows' glass: 4,000 (CLAUDE.md T31 2.2). */
export function lineGlassOrderCost(): number {
  return LINE_ORDER_WINDOWS * lineGlassCostPerWindow();
}

/** The windows the glass at module 6 is for: the glass is counted in a window's glass,
 *  `LINE_GLASS_PER_WINDOW` a window (CLAUDE.md T31 2.1). */
export function lineGlassWindows(state: GameState): number {
  return Math.floor(state.windowLine.glass / LINE_GLASS_PER_WINDOW);
}

/** The windows' glass module 6 has room for, what is on its way counted as there (CLAUDE.md T31
 *  2.2). */
export function lineGlassRoom(state: GameState): number {
  return Math.max(0, LINE_GLASS_WINDOWS_MAX - lineGlassWindows(state) - lineGlassOnTheWay(state));
}

/** True while the line holds a window's boards, and a window's glass (CLAUDE.md T31 2.1). */
export function lineHasTimber(state: GameState): boolean {
  return state.windowLine.boards >= LINE_BOARDS_PER_WINDOW;
}

export function lineHasGlass(state: GameState): boolean {
  return state.windowLine.glass >= LINE_GLASS_PER_WINDOW;
}

/** What the line is short of for its next window, in the words the strip and the running block
 *  read, or null when it has both (CLAUDE.md T31 2.4). */
export function lineShortOf(state: GameState): 'no timber' | 'no glass' | 'no timber or glass' | null {
  const timber = lineHasTimber(state);
  const glass = lineHasGlass(state);
  if (timber && glass) return null;
  if (!timber && !glass) return 'no timber or glass';
  return timber ? 'no glass' : 'no timber';
}

/** True for a load of the line's timber (CLAUDE.md T31 2.2). */
export function isLineLoad(delivery: Delivery): boolean {
  return delivery.line === true;
}

/** The line's timber not yet unloaded: on the road, or at the gate (CLAUDE.md T31 2.2, 2.4). */
export function lineBoardsOnTheWay(state: GameState): number {
  return state.deliveries
    .filter((delivery) => isLineLoad(delivery) && !delivery.unloaded)
    .reduce((total, delivery) => total + delivery.sheets, 0);
}

/** The windows' glass on its way to module 6 (CLAUDE.md T31 2.2, 2.4). */
export function lineGlassOnTheWay(state: GameState): number {
  return state.windowLine.glassOnTheWay.reduce((total, load) => total + load.windows, 0);
}

/** Why the line's timber cannot be ordered now, or that it can, in the order the locked button
 *  reads: the contract, the stores, then the cash, as the catalogue's refusals put the kit before
 *  the money (CLAUDE.md T31 2.2) [TUNE: the order]. */
export function lineTimberCheck(state: GameState): { ok: boolean; reason: string } {
  if (runningLineContract(state) === null) return { ok: false, reason: 'The line has no contract running' };
  const room = boardRoom(state);
  if (room <= 0) return { ok: false, reason: 'No timber store' };
  if (room < lineOrderBoards()) {
    return { ok: false, reason: `The timber stores hold fewer than ${lineOrderBoards()} boards` };
  }
  if (!canAfford(state, lineTimberOrderCost())) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, reason: '' };
}

/** Why the line's glass cannot be ordered now, or that it can: module 6 holds glass for forty
 *  windows, what is on its way among it, and the batch must fit (CLAUDE.md T31 2.2). */
export function lineGlassCheck(state: GameState): { ok: boolean; reason: string } {
  if (runningLineContract(state) === null) return { ok: false, reason: 'The line has no contract running' };
  if (lineGlassRoom(state) < LINE_ORDER_WINDOWS) {
    return { ok: false, reason: `Module 6 holds glass for ${LINE_GLASS_WINDOWS_MAX} windows` };
  }
  if (!canAfford(state, lineGlassOrderCost())) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, reason: '' };
}

/** Orders a batch of the line's timber: paid at the click on the material line, one lorry in at the
 *  open of the next working day with a load of boards for the line and for no job (CLAUDE.md T31
 *  2.2). `orderedBy` names the admin who placed it without being asked (2.3). */
export function orderLineTimber(state: GameState, orderedBy: string | null = null): boolean {
  if (!lineTimberCheck(state).ok) return false;
  const boards = lineOrderBoards();
  const cost = lineTimberOrderCost();
  const words = lineLoadWords(boards);
  pay(state, 'material', orderedBy === null ? words : `${words}, ordered by ${orderedBy}`, cost);
  createDelivery(state, null, boards, false, cost, true, true);
  return true;
}

/** Orders a batch of the line's glass: paid at the click on the material line, at module 6 at the
 *  open of the next working day, carried in by the glazier as a job's glass is (CLAUDE.md T31 2.2). */
export function orderLineGlass(state: GameState, orderedBy: string | null = null): boolean {
  if (!lineGlassCheck(state).ok) return false;
  const words = `Glass for the line: ${plural(LINE_ORDER_WINDOWS, 'window', 'windows')}`;
  pay(state, 'material', orderedBy === null ? words : `${words}, ordered by ${orderedBy}`, lineGlassOrderCost());
  state.windowLine.glassOnTheWay.push({
    windows: LINE_ORDER_WINDOWS,
    day: addWorkingDays(state.clock.day, GLASS_DELIVERY_WORKING_DAYS),
  });
  return true;
}

/** The open of a working day: the line's glass due today stands at module 6 (CLAUDE.md T31 2.2). */
export function arriveLineGlass(state: GameState): void {
  const line = state.windowLine;
  const due = line.glassOnTheWay.filter((load) => load.day <= state.clock.day);
  if (due.length === 0) return;
  line.glass += due.reduce((total, load) => total + load.windows * LINE_GLASS_PER_WINDOW, 0);
  line.glassOnTheWay = line.glassOnTheWay.filter((load) => load.day > state.clock.day);
}

/** The windows of two working days at the minutes a window takes today, rounded up: 8 at 120
 *  minutes, 16 at 60 (CLAUDE.md T31 2.3) [TUNE: rounded up]. */
export function lineReorderWindows(state: GameState): number {
  return Math.ceil((LINE_REORDER_DAYS * MINUTES_PER_WORKING_DAY) / lineWindowMinutes(state));
}

/** Boards of every load not yet unloaded, the line's and the timber jobs': what the stores' free
 *  room will have to take when they come. */
function boardsComing(state: GameState): number {
  return state.deliveries
    .filter((delivery) => !delivery.unloaded && isBoards(state, delivery))
    .reduce((total, delivery) => total + delivery.sheets, 0);
}

/** The office admin on duty orders the line's material by himself while its contract runs, at the
 *  open of every working day and after every window made: a batch of timber when the line's boards
 *  and those on their way are fewer than two working days of windows' boards, and a batch of glass
 *  on the same rule (PIOTR, 11.10: "yes"; CLAUDE.md T31 2.3). He orders only what the buttons allow
 *  at that minute, and the timber only when the stores' free room, less every load of boards
 *  already on its way, takes the whole batch, so what he orders never waits at the gate [TUNE:
 *  chat]. With no admin on duty nothing is ordered here. */
export function runLineOffice(state: GameState): void {
  if (runningLineContract(state) === null) return;
  const admin = firstOnDutyOf(state, MATERIAL_ORDER_ROLES);
  if (admin === null) return;
  const wanted = lineReorderWindows(state);
  const line = state.windowLine;
  if (
    line.boards + lineBoardsOnTheWay(state) < wanted * LINE_BOARDS_PER_WINDOW &&
    freeBoardRoom(state) - boardsComing(state) >= lineOrderBoards()
  ) {
    orderLineTimber(state, admin.name);
  }
  if (lineGlassWindows(state) + lineGlassOnTheWay(state) < wanted) orderLineGlass(state, admin.name);
}

/** The line sold: its boards come off the counter and its glass goes, written off on the material
 *  line as a dropped job's are, and a load of its timber at the gate goes with them and its
 *  unloading task; a load of its timber or its glass still on the road is called off and its price
 *  given back, so no board is held for ever by a line that is gone (CLAUDE.md T31 2.1) [TUNE:
 *  chat]. */
export function writeOffLineMaterial(state: GameState): void {
  const line = state.windowLine;
  const loads = state.deliveries.filter((delivery) => isLineLoad(delivery) && !delivery.unloaded);
  for (const load of loads.filter((delivery) => !delivery.arrived)) {
    refund(state, 'material', `Order cancelled: ${cancelledLoadWords(state, load)}`, load.pricePaid);
  }
  for (const load of line.glassOnTheWay) {
    refund(
      state,
      'material',
      `Order cancelled: glass for the line, ${plural(load.windows, 'window', 'windows')}`,
      load.windows * lineGlassCostPerWindow(),
    );
  }
  const atTheGate = loads.filter((delivery) => delivery.arrived);
  const boardsGone = line.boards + atTheGate.reduce((total, delivery) => total + delivery.sheets, 0);
  const value = boardsGone * SHEET_VALUE + lineGlassWindows(state) * lineGlassCostPerWindow();
  noteLoss(state, 'material', "Material written off: the line's timber and glass", value);
  const gone = new Set(loads.map((delivery) => delivery.id));
  state.deliveries = state.deliveries.filter((delivery) => !gone.has(delivery.id));
  const tasks = new Set(state.tasks.filter((task) => task.deliveryId !== null && gone.has(task.deliveryId)).map((task) => task.id));
  state.tasks = state.tasks.filter((task) => !tasks.has(task.id));
  if (state.owner.currentTaskId !== null && tasks.has(state.owner.currentTaskId)) state.owner.currentTaskId = null;
  if (state.owner.resumeTaskId !== null && tasks.has(state.owner.resumeTaskId)) state.owner.resumeTaskId = null;
  for (const worker of state.workers) {
    if (worker.taskId !== null && tasks.has(worker.taskId)) worker.taskId = null;
  }
  state.stock.sheets = Math.max(0, state.stock.sheets - line.boards);
  line.boards = 0;
  line.glass = 0;
  line.glassOnTheWay = [];
}

/** The minutes a window takes on the line's contract: the one answer the offer card, the running
 *  block and the line's minute read. Each upgrade fitted takes its fifteen minutes off, and never
 *  below one window an hour (CLAUDE.md T30 2.7, 2.10). */
export function lineWindowMinutes(state: GameState): number {
  const fitted = state.windowLine.upgrades.filter((upgrade) => upgradeIsFitted(state, upgrade.fittedOnDay)).length;
  return Math.max(LINE_WINDOW_MINUTES_MIN, LINE_WINDOW_MINUTES - LINE_UPGRADE_MINUTES * fitted);
}

/** True from the open of the day an upgrade is fitted on. */
function upgradeIsFitted(state: GameState, fittedOnDay: number): boolean {
  return state.clock.day >= fittedOnDay;
}

/** Whether an upgrade of the line can be bought, in the order its card's locked Buy reads: the
 *  line first, then the one already on the list (on its way or fitted), then the cash. One of each
 *  (CLAUDE.md T30 2.10). */
export function lineUpgradeCheck(state: GameState, upgradeId: string): { ok: boolean; reason: string } {
  const spec = LINE_UPGRADES.find((entry) => entry.id === upgradeId);
  if (spec === undefined) return { ok: false, reason: 'Not in the catalogue' };
  if (!lineStandsWhole(state)) return { ok: false, reason: 'Needs the production line' };
  const held = state.windowLine.upgrades.find((upgrade) => upgrade.id === upgradeId);
  if (held !== undefined) {
    return upgradeIsFitted(state, held.fittedOnDay)
      ? { ok: false, reason: 'Fitted' }
      : { ok: false, reason: `Being fitted: ready on ${formatCalendarDay(held.fittedOnDay)}` };
  }
  if (!canAfford(state, spec.price)) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, reason: '' };
}

/** Buys an upgrade of the line: the cash leaves at the click on one line of its own, and it is
 *  fitted ten working days on. Never called off and never sold on its own: it goes with the line
 *  (CLAUDE.md T30 2.10). */
export function buyLineUpgrade(state: GameState, upgradeId: string): { ok: boolean; reason: string } {
  const check = lineUpgradeCheck(state, upgradeId);
  if (!check.ok) return check;
  const spec = LINE_UPGRADES.find((entry) => entry.id === upgradeId);
  if (spec === undefined) return check;
  pay(state, 'equipment', `Line upgrade: ${spec.name}`, spec.price);
  // Into what the line has cost, for its paid back line (CLAUDE.md T31 2.5).
  bookLineUpgrade(state, spec.price);
  state.windowLine.upgrades.push({ id: spec.id, fittedOnDay: addWorkingDays(state.clock.day, LINE_UPGRADE_DAYS) });
  return check;
}

/** The line sold: its upgrades go with it, for nothing (CLAUDE.md T30 2.3.5, 2.10). */
export function emptyLineUpgrades(state: GameState): void {
  state.windowLine.upgrades = [];
}

/** A window's minutes in the words the card and the running block print: `2 hours`, `1 h 45 min`. */
export function lineWindowEvery(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return plural(hours, 'hour', 'hours');
  return hours === 0 ? `${rest} min` : `${hours} h ${rest} min`;
}

/** The windows of a working week at the line's pace, rounded down: 20 at 120 minutes. */
export function lineWindowsAWeek(state: GameState): number {
  return Math.floor((WORKING_DAYS_PER_WEEK * MINUTES_PER_WORKING_DAY) / lineWindowMinutes(state));
}

/** The line's contract while it runs, and null while it is only offered or there is none. */
export function runningLineContract(state: GameState): LineContract | null {
  const contract = state.windowLine.contract;
  return contract !== null && contract.status === 'active' ? contract : null;
}

/** The line engineers on the books, hired and started, whether in today or not: what the offer asks
 *  for (CLAUDE.md T30 2.6) [TUNE: on the books is started, in today or not]. */
function engineersOnTheBooks(state: GameState): number {
  return lineEngineers(state).filter((worker) => worker.startDay <= state.clock.day).length;
}

/** The offer card's words, every figure from the constants and the line's own pace (CLAUDE.md T30
 *  2.6). */
export function lineOfferBody(state: GameState): string {
  return (
    `A window company will take every window your line makes, at ${formatMoney(LINE_WINDOW_PRICE)} a ` +
    `window. The timber and the glass cost ${formatMoney(lineMaterialPerWindow())} a window, ordered ` +
    'ahead: on the Contracts tab, or by the office. The line makes one every ' +
    `${lineWindowEvery(lineWindowMinutes(state))}, about ${lineWindowsAWeek(state)} a week, and the client ` +
    `collects each pallet of ${inWords(LINE_PALLET_WINDOWS)} the next working day. It runs until you end it.`
  );
}

/** The line's step at the open of a working day, the last of `startDay`, after the day's kit has
 *  landed and its cards are queued: the client's lorry takes every pallet at the gate, a new week
 *  starts the week's count, and the contract is offered when it may be (CLAUDE.md T30 2.6, 2.8);
 *  then the office looks at the line's timber and glass (CLAUDE.md T31 2.3). */
export function runLineDay(state: GameState): void {
  // The day book first: yesterday and the days since closed, today opened (CLAUDE.md T31 2.5).
  openLineBooks(state);
  const line = state.windowLine;
  // Taken at no cost and with no line in the ledger: its windows were paid as they were made.
  line.palletsAtGate = 0;
  const contract = runningLineContract(state);
  if (contract !== null && weekOfDay(state.clock.day) !== weekOfDay(contract.weekStartDay)) {
    contract.windowsThisWeek = 0;
    contract.weekStartDay = state.clock.day;
  }
  offerLineContract(state);
  runLineOffice(state);
}

/** Offered by a card when all six modules stand, two line engineers are on the books, no line
 *  contract is offered or running, and the day is not before the next offer day (CLAUDE.md T30
 *  2.6). */
function offerLineContract(state: GameState): void {
  const line = state.windowLine;
  const day = state.clock.day;
  if (line.contract !== null) return;
  if (line.nextOfferDay !== null && day < line.nextOfferDay) return;
  if (!lineStandsWhole(state)) return;
  if (engineersOnTheBooks(state) < LINE_ENGINEERS_MAX) return;
  line.contract = {
    status: 'offered',
    startDay: day,
    windowsThisWeek: 0,
    weekStartDay: day,
    windowsMade: 0,
    revenue: 0,
    materialCost: 0,
  };
  queueEvent(state, {
    kind: 'lineContractOffered',
    title: LINE_CONTRACT_NAME,
    body: lineOfferBody(state),
    choices: [
      { id: 'take', label: 'Take it' },
      { id: 'notNow', label: 'Not now' },
    ],
  });
}

/** The answer to the offer card: taken, it runs from that minute, while the line still stands
 *  whole; turned down, it is offered again a week on (CLAUDE.md T30 2.6). */
export function answerLineOffer(state: GameState, choiceId: string): void {
  const line = state.windowLine;
  const contract = line.contract;
  if (contract === null || contract.status !== 'offered') return;
  if (choiceId === 'take' && lineStandsWhole(state)) {
    contract.status = 'active';
    contract.startDay = state.clock.day;
    contract.weekStartDay = state.clock.day;
    // The office looks at the line's material the minute it is taken, as at an open, so a new
    // contract is not a day later in its timber and glass (CLAUDE.md T31 2.3) [TUNE].
    runLineOffice(state);
    return;
  }
  line.contract = null;
  line.nextOfferDay = state.clock.day + DAYS_PER_WEEK;
}

/** Ends the line's contract, by the player's `End it` or by the sale of the line: a part pallet goes
 *  to the gate as it is, the window in hand is dropped, and it is offered again a week on
 *  (CLAUDE.md T30 2.6, 2.8). An offer still waiting for its answer goes too. */
export function endLineContract(state: GameState): void {
  const line = state.windowLine;
  if (line.contract === null) return;
  if (line.onPallet > 0) {
    line.palletsAtGate += 1;
    line.onPallet = 0;
  }
  line.contract = null;
  line.minutes = 0;
  line.nextOfferDay = state.clock.day + DAYS_PER_WEEK;
}

/** True in a minute the line makes windows on its contract: a working day, not the dinner hour and
 *  not after five whatever the owner does, the line running whole (two engineers on duty), and not
 *  while it is being moved. Not on the second shift: the line's minute runs only from the day's
 *  clock, and the engineers work by day (CLAUDE.md T30 2.7) [TUNE: chat]. And only while it holds
 *  a window's boards and glass: a minute with too little is a minute it stands (CLAUDE.md T31
 *  2.1). */
export function lineMakesWindows(state: GameState): boolean {
  return lineContractMinute(state) && lineStoppedBy(state) === null;
}

/** A working minute of the line's contract: the contract running, a working day, not the dinner
 *  hour and not after five. */
function lineContractMinute(state: GameState): boolean {
  if (runningLineContract(state) === null) return false;
  if (!isWorkingDay(state.clock.day)) return false;
  if (isBreak(state.clock.minute)) return false;
  return !crewHasGoneHome(state);
}

/** What stops a working minute of the line's contract, or null when nothing does: too few engineers
 *  on duty first, then the move, then the timber, then the glass (CLAUDE.md T31 2.5) [TUNE: the
 *  order]. */
function lineStoppedBy(state: GameState): LineLostCause | null {
  if (lineLevel(state) < LINE_MODULES.length) return 'engineer';
  if (movingMachines(state) !== null) return 'moving';
  if (!lineHasTimber(state)) return 'timber';
  if (!lineHasGlass(state)) return 'glass';
  return null;
}

/** A working minute of the line's contract into its day book: on a working day, not the dinner
 *  hour and not after five, while the contract runs, whether the line runs it or stands; the
 *  minutes its contract ran are what its efficiency is reckoned against (CLAUDE.md T31 2.5). */
function bookContractMinute(state: GameState): void {
  if (!lineContractMinute(state)) return;
  bookLineMinute(state, lineWindowMinutes(state), lineStoppedBy(state));
}

/** The line's own minute, beside the men's: the window in hand moves on by one, and at its minutes
 *  it is made, the minutes over carried into the next one. The hall's crowding, its dust and its
 *  labourer do not touch it, and no minute of any man or machine is booked for it (CLAUDE.md T30
 *  2.7) [TUNE]. */
export function runLineMinute(state: GameState): void {
  bookContractMinute(state);
  if (!lineMakesWindows(state)) return;
  const line = state.windowLine;
  line.minutes += 1;
  const each = lineWindowMinutes(state);
  // A window is made only with its boards and its glass in hand (CLAUDE.md T31 2.1).
  while (line.minutes >= each && lineShortOf(state) === null) {
    line.minutes -= each;
    makeWindow(state);
  }
}

/** One window made: its price in on the contract line, one growing line a day. Its two boards come
 *  off the line's and off the counter and its glass off module 6; nothing is booked for them, since
 *  they were paid at their order (CLAUDE.md T31 2.1, 2.2). It stands on the pallet, and the tenth
 *  sends the pallet to the gate (CLAUDE.md T30 2.7, 2.8); then the office looks at what is left
 *  (CLAUDE.md T31 2.3). */
function makeWindow(state: GameState): void {
  const contract = runningLineContract(state);
  if (contract === null) return;
  const line = state.windowLine;
  charge(state, 'contract', `${LINE_CONTRACT_NAME}: windows`, LINE_WINDOW_PRICE, { merge: true });
  // And into the line's own day book: the window, its turnover and the material it used
  // (CLAUDE.md T31 2.5).
  bookLineWindow(state, LINE_WINDOW_PRICE, lineMaterialPerWindow());
  line.boards -= LINE_BOARDS_PER_WINDOW;
  state.stock.sheets = Math.max(0, state.stock.sheets - LINE_BOARDS_PER_WINDOW);
  line.glass -= LINE_GLASS_PER_WINDOW;
  contract.windowsMade += 1;
  contract.windowsThisWeek += 1;
  contract.revenue += LINE_WINDOW_PRICE;
  // The material the window used, at what it cost: the contract's own record, never a ledger line.
  contract.materialCost += lineMaterialPerWindow();
  line.onPallet += 1;
  if (line.onPallet >= LINE_PALLET_WINDOWS) {
    line.onPallet = 0;
    line.palletsAtGate += 1;
  }
  runLineOffice(state);
}
