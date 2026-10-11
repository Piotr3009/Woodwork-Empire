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
  DAYS_PER_MONTH,
  DAYS_PER_WEEK,
  DAYS_PER_YEAR,
  GLASS_DELIVERY_WORKING_DAYS,
  LINE_BOARDS_PER_WINDOW,
  LINE_CONTRACT_NAME,
  LINE_DAYS_KEPT,
  LINE_ENGINEERS_MAX,
  LINE_GLASS_PER_WINDOW,
  LINE_GLASS_WINDOWS_MAX,
  LINE_MATERIAL_SHARE,
  LINE_MODULE_POWER_PER_DAY,
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
  PROPERTY_INSURANCE_RATE_YEARLY,
  SHEET_VALUE,
  WORKING_DAYS_PER_WEEK,
  unitCostFactor,
} from './constants';
import { addWorkingDays, formatCalendarDay, isBreak, isWorkingDay, weekOfDay } from './clock';
import { canAfford, charge, formatMoney, noteLoss, pay, refund } from './economy';
import { queueEvent } from './events';
import { lineValue } from './insurance';
import { MATERIAL_ORDER_ROLES } from './jobs';
import { boardRoom, freeBoardRoom, lineLevel, lineStandsWhole } from './machines';
import { createDelivery, isBoards, lineLoadInWords } from './materials';
import { crewHasGoneHome, lineEngineers } from './staff';
import { firstOnDutyOf, movingMachines } from './tasks';
import { inWords, plural } from './text';
import type { GameState, LineContract, LineDay, LineLostMinutes, LineSince, WindowLineState } from './types';

/** A day of the line's day book with nothing in it yet (CLAUDE.md T31 2.5). */
export function emptyLineDay(day: number): LineDay {
  return {
    day,
    windows: 0,
    turnover: 0,
    material: 0,
    engineers: 0,
    power: 0,
    cover: 0,
    possibleMinutes: 0,
    possibleWindows: 0,
    lost: { engineer: 0, timber: 0, glass: 0, timberAndGlass: 0, move: 0 },
  };
}

/** The day's share of the line engineers on the books that day: each one's month over the days of
 *  a month (CLAUDE.md T31 2.5). */
export function lineEngineersPerDay(state: GameState, day: number): number {
  return lineEngineers(state)
    .filter((worker) => worker.startDay <= day && (worker.leavesOnDay === null || worker.leavesOnDay >= day))
    .reduce((total, worker) => total + worker.monthlyWage / DAYS_PER_MONTH, 0);
}

/** The day's power of the six modules (CLAUDE.md T31 2.5). */
export function linePowerPerDay(): number {
  return LINE_MODULES.length * LINE_MODULE_POWER_PER_DAY;
}

/** The day's share of the property cover on the line, while the cover is held: its value at the
 *  cover's rate and the unit's factor, over the days of a year (CLAUDE.md T31 2.5). */
export function lineCoverPerDay(state: GameState): number {
  if (!state.insurance.property) return 0;
  return (lineValue(state) * PROPERTY_INSURANCE_RATE_YEARLY * unitCostFactor(state.unit)) / DAYS_PER_YEAR;
}

/** True for a day of the book that holds anything: a cost, a window, or a working minute. */
function holdsAnything(record: LineDay): boolean {
  return record.power > 0 || record.windows > 0 || record.possibleMinutes > 0;
}

/** The day in hand, closed into the book when the clock has left it and a new one started: the
 *  one road a day of the book is written by (CLAUDE.md T31 2.5). */
function lineToday(state: GameState): LineDay {
  const line = state.windowLine;
  const day = state.clock.day;
  if (line.today.day !== day) {
    if (line.today.day >= 1 && holdsAnything(line.today)) line.days.push(line.today);
    line.days = line.days.filter((record) => record.day > day - LINE_DAYS_KEPT);
    line.today = emptyLineDay(day);
  }
  return line.today;
}

/** The open of a calendar day, beside the ledger's own day costs, weekends among them: the day
 *  before is closed into the book, and while the line stands the day takes its share of the
 *  engineers, the power and the property cover, taken at its open as the ledger's are, contract or
 *  not (CLAUDE.md T31 2.5) [TUNE: chat]. The first day it stands is the day it first stood. */
export function openLineDay(state: GameState): void {
  const today = lineToday(state);
  if (!lineStandsWhole(state) || today.power > 0) return;
  const since = state.windowLine.since;
  today.engineers = lineEngineersPerDay(state, today.day);
  today.power = linePowerPerDay();
  today.cover = lineCoverPerDay(state);
  if (since.firstDay === null) since.firstDay = today.day;
  since.engineers += today.engineers;
  since.power += today.power;
  since.cover += today.cover;
}

/** Why the line cannot use a working minute of its contract, or null when it can: no two engineers
 *  on duty, the line being moved, or the timber, the glass or both short (CLAUDE.md T31 2.5). */
function lineLostTo(state: GameState): keyof LineLostMinutes | null {
  if (lineLevel(state) < LINE_MODULES.length) return 'engineer';
  if (movingMachines(state) !== null) return 'move';
  const short = lineShortOf(state);
  if (short === 'timber') return 'timber';
  if (short === 'glass') return 'glass';
  if (short === 'timber or glass') return 'timberAndGlass';
  return null;
}

/** A working minute of the contract in the day book: possible while the contract runs on a working
 *  day, outside the dinner hour and before five, worth the window's share of it at today's pace,
 *  and lost by why when the line cannot use it (CLAUDE.md T31 2.5). */
function bookLineMinute(state: GameState): void {
  if (runningLineContract(state) === null) return;
  if (!isWorkingDay(state.clock.day) || isBreak(state.clock.minute) || crewHasGoneHome(state)) return;
  const today = lineToday(state);
  today.possibleMinutes += 1;
  today.possibleWindows += 1 / lineWindowMinutes(state);
  const lost = lineLostTo(state);
  if (lost !== null) today.lost[lost] += 1;
}

/** The line's totals of a company whose line has never stood (CLAUDE.md T31 2.5). */
export function emptyLineSince(): LineSince {
  return { firstDay: null, windows: 0, turnover: 0, material: 0, engineers: 0, power: 0, cover: 0 };
}

/** The line's state of a company that has never had a line: no contract, no offer yet, no window
 *  in hand, an empty pallet, nothing at the gate and no upgrade (CLAUDE.md T30 section 4); no
 *  timber, no glass and an empty day book (CLAUDE.md T31 section 4). The day in hand is the day
 *  given, the save's own when a save is lifted. */
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

/** The boards of a window at what a board is worth: 400 of its 600 (CLAUDE.md T31 2.1) [TUNE:
 *  chat: the split]. */
export function lineBoardsPerWindowCost(): number {
  return LINE_BOARDS_PER_WINDOW * SHEET_VALUE;
}

/** The glass of a window: the rest of its 600, 200, written from the two and never as a figure of
 *  its own (CLAUDE.md T31 2.1) [TUNE: chat: the split]. */
export function lineGlassPerWindowCost(): number {
  return lineMaterialPerWindow() - lineBoardsPerWindowCost();
}

/** One order of the line's timber: twenty windows' boards, 40 (CLAUDE.md T31 2.2). */
export function lineTimberBatch(): number {
  return LINE_ORDER_WINDOWS * LINE_BOARDS_PER_WINDOW;
}

/** What one order of the line's timber costs: its boards at what a board is worth, 8,000. */
export function lineTimberBatchCost(): number {
  return lineTimberBatch() * SHEET_VALUE;
}

/** What one order of the line's glass costs: twenty windows' glass, 4,000. */
export function lineGlassBatchCost(): number {
  return LINE_ORDER_WINDOWS * lineGlassPerWindowCost();
}

/** What the line is short of for its next window, in the words the strip and the running block
 *  print, or null when it has a window's boards and glass: the one answer the line's minute, the
 *  strip and the `Standing still` row read (CLAUDE.md T31 2.1, 2.4). */
export function lineShortOf(state: GameState): 'timber' | 'glass' | 'timber or glass' | null {
  const line = state.windowLine;
  const timber = line.boards < LINE_BOARDS_PER_WINDOW;
  const glass = line.glass < LINE_GLASS_PER_WINDOW;
  if (timber && glass) return 'timber or glass';
  if (timber) return 'timber';
  if (glass) return 'glass';
  return null;
}

/** The windows the glass at module 6 is for: the one count of it in windows, which the orders,
 *  the cap, the office and the pages read (CLAUDE.md T31 2.1). */
export function lineGlassWindows(state: GameState): number {
  return Math.floor(state.windowLine.glass / LINE_GLASS_PER_WINDOW);
}

/** The boards of the line's loads not yet unloaded, on the road or at the gate (CLAUDE.md T31
 *  2.2). */
export function lineBoardsOnTheWay(state: GameState): number {
  return state.deliveries
    .filter((delivery) => delivery.line === true && !delivery.unloaded)
    .reduce((total, delivery) => total + delivery.sheets, 0);
}

/** The windows of the line's glass ordered and not yet in (CLAUDE.md T31 2.2). */
export function lineGlassOnTheWay(state: GameState): number {
  return state.windowLine.glassOnTheWay.reduce((total, entry) => total + entry.windows, 0);
}

/** Whether the line's timber can be ordered, and why not, in the order the locked button reads
 *  (CLAUDE.md T31 2.2): only while its contract runs (the button is not drawn otherwise), then a
 *  timber store, then room on the stores that stand for a whole batch, then the cash. */
export function lineTimberCheck(state: GameState): { ok: boolean; reason: string } {
  if (runningLineContract(state) === null) return { ok: false, reason: 'The line has no contract running' };
  const room = boardRoom(state);
  if (room <= 0) return { ok: false, reason: 'No timber store' };
  if (room < lineTimberBatch()) {
    return { ok: false, reason: `The timber stores hold fewer than ${lineTimberBatch()} boards` };
  }
  if (!canAfford(state, lineTimberBatchCost())) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, reason: '' };
}

/** Whether the line's glass can be ordered, and why not: only while its contract runs, then module
 *  6's room for glass, what is there and on its way counted in, then the cash (CLAUDE.md T31 2.2). */
export function lineGlassCheck(state: GameState): { ok: boolean; reason: string } {
  if (runningLineContract(state) === null) return { ok: false, reason: 'The line has no contract running' };
  if (lineGlassWindows(state) + lineGlassOnTheWay(state) + LINE_ORDER_WINDOWS > LINE_GLASS_WINDOWS_MAX) {
    return { ok: false, reason: `Module 6 holds glass for ${LINE_GLASS_WINDOWS_MAX} windows` };
  }
  if (!canAfford(state, lineGlassBatchCost())) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, reason: '' };
}

/** A ledger label of the line's material, with the name of the admin who ordered it by himself, as
 *  a job's material names him (CLAUDE.md T31 2.3). */
function orderLabel(what: string, orderedBy: string | null): string {
  return orderedBy === null ? what : `${what}, ordered by ${orderedBy}`;
}

/** Orders a batch of the line's timber: paid at the click on the material line, one lorry in at
 *  the open of the next working day with a load of boards for the line, unloaded as a timber job's
 *  boards are (CLAUDE.md T31 2.2). */
export function orderLineTimber(state: GameState, orderedBy: string | null = null): { ok: boolean; reason: string } {
  const check = lineTimberCheck(state);
  if (!check.ok) return check;
  const cost = lineTimberBatchCost();
  pay(state, 'material', orderLabel(`Timber for the line: ${plural(lineTimberBatch(), 'board', 'boards')}`, orderedBy), cost);
  createDelivery(state, null, lineTimberBatch(), false, cost, true, true);
  return check;
}

/** Orders a batch of the line's glass: paid at the click on the material line, in at the open of
 *  the next working day, carried to module 6 by the glazier with no lorry (CLAUDE.md T31 2.2). */
export function orderLineGlass(state: GameState, orderedBy: string | null = null): { ok: boolean; reason: string } {
  const check = lineGlassCheck(state);
  if (!check.ok) return check;
  pay(state, 'material', orderLabel(`Glass for the line: ${LINE_ORDER_WINDOWS} windows`, orderedBy), lineGlassBatchCost());
  state.windowLine.glassOnTheWay.push({
    windows: LINE_ORDER_WINDOWS,
    day: addWorkingDays(state.clock.day, GLASS_DELIVERY_WORKING_DAYS),
  });
  return check;
}

/** The open of a working day, beside a job's glass: the line's glass due today is at module 6
 *  (CLAUDE.md T31 2.2). */
export function arriveLineGlass(state: GameState): void {
  const line = state.windowLine;
  const due = line.glassOnTheWay.filter((entry) => entry.day <= state.clock.day);
  if (due.length === 0) return;
  line.glass += due.reduce((total, entry) => total + entry.windows, 0) * LINE_GLASS_PER_WINDOW;
  line.glassOnTheWay = line.glassOnTheWay.filter((entry) => entry.day > state.clock.day);
}

/** The windows of two working days at the line's pace today: 8 at 120 minutes a window, 16 at 60
 *  (CLAUDE.md T31 2.3). */
export function lineReorderWindows(state: GameState): number {
  return LINE_REORDER_DAYS * Math.floor(MINUTES_PER_WORKING_DAY / lineWindowMinutes(state));
}

/** The office admin on duty orders the line's material by himself, while its contract runs, when
 *  what it holds and what is on its way are fewer than two working days of windows: only what the
 *  buttons allow at that minute, and the timber only when the stores' free room, less every load of
 *  boards already on its way, takes the whole batch, so that what he orders never waits at the gate
 *  [TUNE: chat]. With no admin on duty nothing is ordered (CLAUDE.md T31 2.3). */
export function officeOrdersLineMaterial(state: GameState): void {
  if (runningLineContract(state) === null) return;
  const admin = firstOnDutyOf(state, MATERIAL_ORDER_ROLES);
  if (admin === null) return;
  const windows = lineReorderWindows(state);
  const line = state.windowLine;
  if (line.boards + lineBoardsOnTheWay(state) < windows * LINE_BOARDS_PER_WINDOW && lineTimberCheck(state).ok) {
    const coming = state.deliveries
      .filter((delivery) => !delivery.unloaded && isBoards(state, delivery))
      .reduce((total, delivery) => total + delivery.sheets, 0);
    if (freeBoardRoom(state) - coming >= lineTimberBatch()) orderLineTimber(state, admin.name);
  }
  if (lineGlassWindows(state) + lineGlassOnTheWay(state) < windows && lineGlassCheck(state).ok) {
    orderLineGlass(state, admin.name);
  }
}

/** The line sold: its boards come off the counter and its glass goes, written off on the material
 *  line as a dropped job's are, and the loads of it still on their way are called off and their
 *  price given back, so no board is held for ever by a line that is gone [TUNE: chat]. A load
 *  already at the gate is written off with them and its unloading goes [TUNE]. */
export function writeOffLineMaterial(state: GameState): void {
  const line = state.windowLine;
  const atGate = state.deliveries.filter((delivery) => delivery.line === true && delivery.arrived && !delivery.unloaded);
  const lost =
    line.boards * SHEET_VALUE +
    (line.glass / LINE_GLASS_PER_WINDOW) * lineGlassPerWindowCost() +
    atGate.reduce((total, delivery) => total + delivery.pricePaid, 0);
  noteLoss(state, 'material', "Material written off: the line's timber and glass", lost);
  state.stock.sheets = Math.max(0, state.stock.sheets - line.boards);
  line.boards = 0;
  line.glass = 0;
  for (const delivery of state.deliveries) {
    if (delivery.line === true && !delivery.arrived) {
      refund(state, 'material', `Order cancelled: ${lineLoadInWords(delivery.sheets)}`, delivery.pricePaid);
    }
  }
  for (const entry of line.glassOnTheWay) {
    refund(
      state,
      'material',
      `Order cancelled: glass for the line, ${plural(entry.windows, 'window', 'windows')}`,
      entry.windows * lineGlassPerWindowCost(),
    );
  }
  line.glassOnTheWay = [];
  const gone = new Set(
    state.deliveries.filter((delivery) => delivery.line === true && !delivery.unloaded).map((delivery) => delivery.id),
  );
  if (gone.size === 0) return;
  state.deliveries = state.deliveries.filter((delivery) => !gone.has(delivery.id));
  const tasks = new Set(
    state.tasks.filter((task) => task.deliveryId !== null && gone.has(task.deliveryId)).map((task) => task.id),
  );
  state.tasks = state.tasks.filter((task) => !tasks.has(task.id));
  if (state.owner.currentTaskId !== null && tasks.has(state.owner.currentTaskId)) state.owner.currentTaskId = null;
  if (state.owner.resumeTaskId !== null && tasks.has(state.owner.resumeTaskId)) state.owner.resumeTaskId = null;
  for (const worker of state.workers) {
    if (worker.taskId !== null && tasks.has(worker.taskId)) worker.taskId = null;
  }
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
    `window. The timber and the glass cost ${formatMoney(lineMaterialPerWindow())} a window, ordered ahead: ` +
    'on the Contracts tab, or by the office. The line makes one every ' +
    `${lineWindowEvery(lineWindowMinutes(state))}, about ${lineWindowsAWeek(state)} a week, and the client ` +
    `collects each pallet of ${inWords(LINE_PALLET_WINDOWS)} the next working day. It runs until you end it.`
  );
}

/** The line's step at the open of a working day, the last of `startDay`, after the day's kit has
 *  landed and its cards are queued: the client's lorry takes every pallet at the gate, a new week
 *  starts the week's count, and the contract is offered when it may be (CLAUDE.md T30 2.6, 2.8). */
export function runLineDay(state: GameState): void {
  const line = state.windowLine;
  // Taken at no cost and with no line in the ledger: its windows were paid as they were made.
  line.palletsAtGate = 0;
  const contract = runningLineContract(state);
  if (contract !== null && weekOfDay(state.clock.day) !== weekOfDay(contract.weekStartDay)) {
    contract.windowsThisWeek = 0;
    contract.weekStartDay = state.clock.day;
  }
  // The office looks at the line's timber and glass at the open of every working day, after the
  // day's lorries and glass are in (CLAUDE.md T31 2.3).
  officeOrdersLineMaterial(state);
  offerLineContract(state);
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
    // The office looks at the line's material the minute it is taken too, so a new contract does
    // not wait a working day for its first order (CLAUDE.md T31 2.3) [TUNE].
    officeOrdersLineMaterial(state);
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
 *  clock, and the engineers work by day (CLAUDE.md T30 2.7) [TUNE: chat]. */
export function lineMakesWindows(state: GameState): boolean {
  if (runningLineContract(state) === null) return false;
  if (!isWorkingDay(state.clock.day)) return false;
  if (isBreak(state.clock.minute)) return false;
  if (crewHasGoneHome(state)) return false;
  if (movingMachines(state) !== null) return false;
  if (lineLevel(state) < LINE_MODULES.length) return false;
  // And a window's boards and glass: a minute with too little is a minute the line stands (CLAUDE.md
  // T31 2.1).
  return lineShortOf(state) === null;
}

/** The line's own minute, beside the men's: the window in hand moves on by one, and at its minutes
 *  it is made, the minutes over carried into the next one. The hall's crowding, its dust and its
 *  labourer do not touch it, and no minute of any man or machine is booked for it (CLAUDE.md T30
 *  2.7) [TUNE]. */
export function runLineMinute(state: GameState): void {
  bookLineMinute(state);
  if (!lineMakesWindows(state)) return;
  const line = state.windowLine;
  line.minutes += 1;
  const each = lineWindowMinutes(state);
  while (line.minutes >= each && lineShortOf(state) === null) {
    line.minutes -= each;
    makeWindow(state);
  }
}

/** One window made: its price in on the contract line, one growing line a day, and its two boards
 *  and its glass taken off what the line holds: the boards off the timber stores and the counter,
 *  the glass off module 6. The material was paid at its order, so nothing of it is booked here
 *  (CLAUDE.md T31 2.1). It stands on the pallet, and the tenth sends the pallet to the gate
 *  (CLAUDE.md T30 2.7, 2.8). Then the office looks at what is left (CLAUDE.md T31 2.3). */
function makeWindow(state: GameState): void {
  const contract = runningLineContract(state);
  if (contract === null) return;
  const material = lineMaterialPerWindow();
  const line = state.windowLine;
  charge(state, 'contract', `${LINE_CONTRACT_NAME}: windows`, LINE_WINDOW_PRICE, { merge: true });
  line.boards -= LINE_BOARDS_PER_WINDOW;
  state.stock.sheets = Math.max(0, state.stock.sheets - LINE_BOARDS_PER_WINDOW);
  line.glass -= LINE_GLASS_PER_WINDOW;
  contract.windowsMade += 1;
  contract.windowsThisWeek += 1;
  contract.revenue += LINE_WINDOW_PRICE;
  // The material the windows used, not what was bought (CLAUDE.md T31 2.5).
  contract.materialCost += material;
  // And in the line's own day book, the day in hand and since it first stood (CLAUDE.md T31 2.5).
  const today = lineToday(state);
  today.windows += 1;
  today.turnover += LINE_WINDOW_PRICE;
  today.material += material;
  line.since.windows += 1;
  line.since.turnover += LINE_WINDOW_PRICE;
  line.since.material += material;
  line.onPallet += 1;
  if (line.onPallet >= LINE_PALLET_WINDOWS) {
    line.onPallet = 0;
    line.palletsAtGate += 1;
  }
  officeOrdersLineMaterial(state);
}
