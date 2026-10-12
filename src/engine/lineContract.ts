/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// A production line's own state and its own contract (PIOTR, 10.10 and 11.10; CLAUDE.md T30). A
// line is six modules of kit on the floor, bought whole, and everything of it that is not kit lives
// in one record of the state, one a line by its number in `state.windowLines` (v93; PIOTR, 12.10:
// "I want to see the next line"): its contract, the day it may be offered again, the minutes into
// the window in hand, the windows on module 6's pallet, the full pallets at the gate, its timber
// and glass, its upgrades and its day book. A record is written whole the first time its line is
// asked for, every part with its default, and stays after the line is sold for its books (CLAUDE.md
// T30 section 4) [TUNE: the name of this module].
//
// A line's contract is a record of its own and never one of `state.contracts` [TUNE: chat]: it is
// not counted against the three, nobody is put on it, it has no week to meet, no term and no price
// off a band, and it draws nothing off the seeded stream, so no other offer, job or event of any
// save moves by a step (CLAUDE.md T30 2.6). Its windows are made by the line's own minute, beside
// the men's, and book nothing to any man or machine (2.7); every tenth goes to the gate on a pallet,
// which the client takes at the open of the next working day (2.8). Every line has its own: its
// own offer card, its own block, its own engineers, timber, glass, pallet and upgrades (PIOTR,
// 12.10).

import {
  DAYS_PER_MONTH,
  DAYS_PER_WEEK,
  DAYS_PER_YEAR,
  GLASS_DELIVERY_WORKING_DAYS,
  LINE_BOARDS_PER_WINDOW,
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
  lineContractName,
  lineName,
  unitCostFactor,
} from './constants';
import { addWorkingDays, formatCalendarDay, isBreak, isWorkingDay, weekOfDay } from './clock';
import { canAfford, charge, formatMoney, noteLoss, pay, refund } from './economy';
import { queueEvent } from './events';
import { lineValueOf } from './insurance';
import { MATERIAL_ORDER_ROLES } from './jobs';
import { boardRoom, freeBoardRoom, lineLevel, lineRecord, lineState, lineStandsWhole, standingLines } from './machines';
import { createDelivery, isBoards, lineLoadInWords } from './materials';
import { crewHasGoneHome, lineEngineers } from './staff';
import { firstOnDutyOf, movingMachines } from './tasks';
import { inWords, plural } from './text';
import { emptyLineDay } from './machines';
import type { GameState, LineContract, LineDay, LineLostMinutes, Worker } from './types';

// The empty record and the one road to a line's record live in machines.ts, which every layer
// reads; they are the line's and are read from here as well (v93).
export { emptyLineDay, emptyLineSince, emptyWindowLine, lineState } from './machines';

/** The line engineers on the books on this day, started, in the order they were taken on, shared
 *  out along the lines that stand two to a line, line 1 first, as the engineers on duty are
 *  (`lineEngineersOnDuty`): the ones this line pays for in its books (v93) [TUNE: chat]. */
function lineEngineersOf(state: GameState, line: number, day: number): Worker[] {
  const index = standingLines(state).indexOf(line);
  if (index < 0) return [];
  const onTheBooks = lineEngineers(state).filter(
    (worker) => worker.startDay <= day && (worker.leavesOnDay === null || worker.leavesOnDay >= day),
  );
  return onTheBooks.slice(index * LINE_ENGINEERS_MAX, (index + 1) * LINE_ENGINEERS_MAX);
}

/** The day's share of a line's engineers on the books that day: each one's month over the days of
 *  a month (CLAUDE.md T31 2.5). */
export function lineEngineersPerDay(state: GameState, line: number, day: number): number {
  return lineEngineersOf(state, line, day).reduce((total, worker) => total + worker.monthlyWage / DAYS_PER_MONTH, 0);
}

/** The day's power of a line's six modules (CLAUDE.md T31 2.5). */
export function linePowerPerDay(): number {
  return LINE_MODULES.length * LINE_MODULE_POWER_PER_DAY;
}

/** The day's share of the property cover on a line, while the cover is held: its value at the
 *  cover's rate and the unit's factor, over the days of a year (CLAUDE.md T31 2.5). */
export function lineCoverPerDay(state: GameState, line: number): number {
  if (!state.insurance.property) return 0;
  return (lineValueOf(state, line) * PROPERTY_INSURANCE_RATE_YEARLY * unitCostFactor(state.unit)) / DAYS_PER_YEAR;
}

/** True for a day of the book that holds anything: a cost, a window, or a working minute. */
function holdsAnything(record: LineDay): boolean {
  return record.power > 0 || record.windows > 0 || record.possibleMinutes > 0;
}

/** The day in hand, closed into the book when the clock has left it and a new one started: the
 *  one road a day of the book is written by (CLAUDE.md T31 2.5). */
function lineToday(state: GameState, line: number): LineDay {
  const record = lineState(state, line);
  const day = state.clock.day;
  if (record.today.day !== day) {
    if (record.today.day >= 1 && holdsAnything(record.today)) record.days.push(record.today);
    record.days = record.days.filter((entry) => entry.day > day - LINE_DAYS_KEPT);
    record.today = emptyLineDay(day);
  }
  return record.today;
}

/** The open of a calendar day, beside the ledger's own day costs, weekends among them: the day
 *  before is closed into each line's book, and while a line stands whole the day takes its share of
 *  its engineers, its power and its property cover, taken at its open as the ledger's are, contract
 *  or not (CLAUDE.md T31 2.5) [TUNE: chat]. The first day it stands is the day it first stood. */
export function openLineDay(state: GameState): void {
  // Every line's day before is closed into its book, a line sold among them, so its last days are
  // never lost from its books (v93).
  for (const record of state.windowLines) lineToday(state, record.number);
  for (const line of standingLines(state)) {
    if (!lineStandsWhole(state, line)) continue;
    const today = lineToday(state, line);
    if (today.power > 0) continue;
    const since = lineState(state, line).since;
    today.engineers = lineEngineersPerDay(state, line, today.day);
    today.power = linePowerPerDay();
    today.cover = lineCoverPerDay(state, line);
    if (since.firstDay === null) since.firstDay = today.day;
    since.engineers += today.engineers;
    since.power += today.power;
    since.cover += today.cover;
  }
}

/** Why a line cannot use a working minute of its contract, or null when it can: no two engineers
 *  on duty, the line being moved, or the timber, the glass or both short (CLAUDE.md T31 2.5). */
function lineLostTo(state: GameState, line: number): keyof LineLostMinutes | null {
  if (lineLevel(state, line) < LINE_MODULES.length) return 'engineer';
  if (movingMachines(state) !== null) return 'move';
  const short = lineShortOf(state, line);
  if (short === 'timber') return 'timber';
  if (short === 'glass') return 'glass';
  if (short === 'timber or glass') return 'timberAndGlass';
  return null;
}

/** A working minute of a line's contract in its day book: possible while the contract runs on a
 *  working day, outside the dinner hour and before five, worth the window's share of it at today's
 *  pace, and lost by why when the line cannot use it (CLAUDE.md T31 2.5). */
function bookLineMinute(state: GameState, line: number): void {
  if (runningLineContract(state, line) === null) return;
  if (!isWorkingDay(state.clock.day) || isBreak(state.clock.minute) || crewHasGoneHome(state)) return;
  const today = lineToday(state, line);
  today.possibleMinutes += 1;
  today.possibleWindows += 1 / lineWindowMinutes(state, line);
  const lost = lineLostTo(state, line);
  if (lost !== null) today.lost[lost] += 1;
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

/** One order of a line's timber: twenty windows' boards, 40 (CLAUDE.md T31 2.2). */
export function lineTimberBatch(): number {
  return LINE_ORDER_WINDOWS * LINE_BOARDS_PER_WINDOW;
}

/** What one order of a line's timber costs: its boards at what a board is worth, 8,000. */
export function lineTimberBatchCost(): number {
  return lineTimberBatch() * SHEET_VALUE;
}

/** What one order of a line's glass costs: twenty windows' glass, 4,000. */
export function lineGlassBatchCost(): number {
  return LINE_ORDER_WINDOWS * lineGlassPerWindowCost();
}

/** What a line is short of for its next window, in the words the strip and the running block
 *  print, or null when it has a window's boards and glass: the one answer the line's minute, the
 *  strip and the `Standing still` row read (CLAUDE.md T31 2.1, 2.4). */
export function lineShortOf(state: GameState, line: number): 'timber' | 'glass' | 'timber or glass' | null {
  const record = lineRecord(state, line);
  const timber = (record?.boards ?? 0) < LINE_BOARDS_PER_WINDOW;
  const glass = (record?.glass ?? 0) < LINE_GLASS_PER_WINDOW;
  if (timber && glass) return 'timber or glass';
  if (timber) return 'timber';
  if (glass) return 'glass';
  return null;
}

/** The windows the glass at a line's module 6 is for: the one count of it in windows, which the
 *  orders, the cap, the office and the pages read (CLAUDE.md T31 2.1). */
export function lineGlassWindows(state: GameState, line: number): number {
  return Math.floor((lineRecord(state, line)?.glass ?? 0) / LINE_GLASS_PER_WINDOW);
}

/** The boards of a line's loads not yet unloaded, on the road or at the gate (CLAUDE.md T31
 *  2.2). */
export function lineBoardsOnTheWay(state: GameState, line: number): number {
  return state.deliveries
    .filter((delivery) => delivery.line === line && !delivery.unloaded)
    .reduce((total, delivery) => total + delivery.sheets, 0);
}

/** The windows of a line's glass ordered and not yet in (CLAUDE.md T31 2.2). */
export function lineGlassOnTheWay(state: GameState, line: number): number {
  return (lineRecord(state, line)?.glassOnTheWay ?? []).reduce((total, entry) => total + entry.windows, 0);
}

/** Whether a line's timber can be ordered, and why not, in the order the locked button reads
 *  (CLAUDE.md T31 2.2): only while its contract runs (the button is not drawn otherwise), then a
 *  timber store, then room on the stores that stand for a whole batch, then the cash. */
export function lineTimberCheck(state: GameState, line: number): { ok: boolean; reason: string } {
  if (runningLineContract(state, line) === null) return { ok: false, reason: 'The line has no contract running' };
  const room = boardRoom(state);
  if (room <= 0) return { ok: false, reason: 'No timber store' };
  if (room < lineTimberBatch()) {
    return { ok: false, reason: `The timber stores hold fewer than ${lineTimberBatch()} boards` };
  }
  if (!canAfford(state, lineTimberBatchCost())) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, reason: '' };
}

/** Whether a line's glass can be ordered, and why not: only while its contract runs, then module
 *  6's room for glass, what is there and on its way counted in, then the cash (CLAUDE.md T31 2.2). */
export function lineGlassCheck(state: GameState, line: number): { ok: boolean; reason: string } {
  if (runningLineContract(state, line) === null) return { ok: false, reason: 'The line has no contract running' };
  if (lineGlassWindows(state, line) + lineGlassOnTheWay(state, line) + LINE_ORDER_WINDOWS > LINE_GLASS_WINDOWS_MAX) {
    return { ok: false, reason: `Module 6 holds glass for ${LINE_GLASS_WINDOWS_MAX} windows` };
  }
  if (!canAfford(state, lineGlassBatchCost())) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, reason: '' };
}

/** A ledger label of a line's material, with the name of the admin who ordered it by himself, as
 *  a job's material names him (CLAUDE.md T31 2.3). */
function orderLabel(what: string, orderedBy: string | null): string {
  return orderedBy === null ? what : `${what}, ordered by ${orderedBy}`;
}

/** Orders a batch of a line's timber: paid at the click on the material line, one lorry in at
 *  the open of the next working day with a load of boards for the line, unloaded as a timber job's
 *  boards are (CLAUDE.md T31 2.2). */
export function orderLineTimber(state: GameState, line: number, orderedBy: string | null = null): { ok: boolean; reason: string } {
  const check = lineTimberCheck(state, line);
  if (!check.ok) return check;
  const cost = lineTimberBatchCost();
  pay(state, 'material', orderLabel(`Timber for ${lineName(line).toLowerCase()}: ${plural(lineTimberBatch(), 'board', 'boards')}`, orderedBy), cost);
  createDelivery(state, null, lineTimberBatch(), false, cost, true, line);
  return check;
}

/** Orders a batch of a line's glass: paid at the click on the material line, in at the open of
 *  the next working day, carried to module 6 by the glazier with no lorry (CLAUDE.md T31 2.2). */
export function orderLineGlass(state: GameState, line: number, orderedBy: string | null = null): { ok: boolean; reason: string } {
  const check = lineGlassCheck(state, line);
  if (!check.ok) return check;
  pay(state, 'material', orderLabel(`Glass for ${lineName(line).toLowerCase()}: ${LINE_ORDER_WINDOWS} windows`, orderedBy), lineGlassBatchCost());
  lineState(state, line).glassOnTheWay.push({
    windows: LINE_ORDER_WINDOWS,
    day: addWorkingDays(state.clock.day, GLASS_DELIVERY_WORKING_DAYS),
  });
  return check;
}

/** The open of a working day, beside a job's glass: every line's glass due today is at its module
 *  6 (CLAUDE.md T31 2.2). */
export function arriveLineGlass(state: GameState): void {
  for (const record of state.windowLines) {
    const due = record.glassOnTheWay.filter((entry) => entry.day <= state.clock.day);
    if (due.length === 0) continue;
    record.glass += due.reduce((total, entry) => total + entry.windows, 0) * LINE_GLASS_PER_WINDOW;
    record.glassOnTheWay = record.glassOnTheWay.filter((entry) => entry.day > state.clock.day);
  }
}

/** The windows of two working days at a line's pace today: 8 at 120 minutes a window, 16 at 60
 *  (CLAUDE.md T31 2.3). */
export function lineReorderWindows(state: GameState, line: number): number {
  return LINE_REORDER_DAYS * Math.floor(MINUTES_PER_WORKING_DAY / lineWindowMinutes(state, line));
}

/** The office admin on duty orders a line's material by himself, while its contract runs, when
 *  what it holds and what is on its way are fewer than two working days of windows: only what the
 *  buttons allow at that minute, and the timber only when the stores' free room, less every load of
 *  boards already on its way, takes the whole batch, so that what he orders never waits at the gate
 *  [TUNE: chat]. With no admin on duty nothing is ordered (CLAUDE.md T31 2.3). */
export function officeOrdersLineMaterial(state: GameState, line: number): void {
  if (runningLineContract(state, line) === null) return;
  const admin = firstOnDutyOf(state, MATERIAL_ORDER_ROLES);
  if (admin === null) return;
  const windows = lineReorderWindows(state, line);
  const record = lineState(state, line);
  if (record.boards + lineBoardsOnTheWay(state, line) < windows * LINE_BOARDS_PER_WINDOW && lineTimberCheck(state, line).ok) {
    const coming = state.deliveries
      .filter((delivery) => !delivery.unloaded && isBoards(state, delivery))
      .reduce((total, delivery) => total + delivery.sheets, 0);
    if (freeBoardRoom(state) - coming >= lineTimberBatch()) orderLineTimber(state, line, admin.name);
  }
  if (lineGlassWindows(state, line) + lineGlassOnTheWay(state, line) < windows && lineGlassCheck(state, line).ok) {
    orderLineGlass(state, line, admin.name);
  }
}

/** The office looks at every line's timber and glass, each line on its own rule (v93). */
function officeOrdersEveryLinesMaterial(state: GameState): void {
  for (const record of state.windowLines) officeOrdersLineMaterial(state, record.number);
}

/** A line sold: its boards come off the counter and its glass goes, written off on the material
 *  line as a dropped job's are, and the loads of it still on their way are called off and their
 *  price given back, so no board is held for ever by a line that is gone [TUNE: chat]. A load
 *  already at the gate is written off with them and its unloading goes [TUNE]. */
export function writeOffLineMaterial(state: GameState, line: number): void {
  const record = lineState(state, line);
  const atGate = state.deliveries.filter((delivery) => delivery.line === line && delivery.arrived && !delivery.unloaded);
  const lost =
    record.boards * SHEET_VALUE +
    (record.glass / LINE_GLASS_PER_WINDOW) * lineGlassPerWindowCost() +
    atGate.reduce((total, delivery) => total + delivery.pricePaid, 0);
  noteLoss(state, 'material', `Material written off: ${lineName(line).toLowerCase()}'s timber and glass`, lost);
  state.stock.sheets = Math.max(0, state.stock.sheets - record.boards);
  record.boards = 0;
  record.glass = 0;
  for (const delivery of state.deliveries) {
    if (delivery.line === line && !delivery.arrived) {
      refund(state, 'material', `Order cancelled: ${lineLoadInWords(delivery.sheets, line)}`, delivery.pricePaid);
    }
  }
  for (const entry of record.glassOnTheWay) {
    refund(
      state,
      'material',
      `Order cancelled: glass for ${lineName(line).toLowerCase()}, ${plural(entry.windows, 'window', 'windows')}`,
      entry.windows * lineGlassPerWindowCost(),
    );
  }
  record.glassOnTheWay = [];
  const gone = new Set(
    state.deliveries.filter((delivery) => delivery.line === line && !delivery.unloaded).map((delivery) => delivery.id),
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

/** The minutes a window takes on a line's contract: the one answer the offer card, the running
 *  block and the line's minute read. Each upgrade fitted takes its fifteen minutes off, and never
 *  below one window an hour (CLAUDE.md T30 2.7, 2.10). */
export function lineWindowMinutes(state: GameState, line: number): number {
  const fitted = (lineRecord(state, line)?.upgrades ?? []).filter((upgrade) => upgradeIsFitted(state, upgrade.fittedOnDay)).length;
  return Math.max(LINE_WINDOW_MINUTES_MIN, LINE_WINDOW_MINUTES - LINE_UPGRADE_MINUTES * fitted);
}

/** True from the open of the day an upgrade is fitted on. */
function upgradeIsFitted(state: GameState, fittedOnDay: number): boolean {
  return state.clock.day >= fittedOnDay;
}

/** Whether an upgrade of a line can be bought, in the order its card's locked Buy reads: the
 *  line first, then the one already on the list (on its way or fitted), then the cash. One of each
 *  a line (CLAUDE.md T30 2.10; v93). */
export function lineUpgradeCheck(state: GameState, line: number, upgradeId: string): { ok: boolean; reason: string } {
  const spec = LINE_UPGRADES.find((entry) => entry.id === upgradeId);
  if (spec === undefined) return { ok: false, reason: 'Not in the catalogue' };
  if (!lineStandsWhole(state, line)) return { ok: false, reason: 'Needs the production line' };
  const held = (lineRecord(state, line)?.upgrades ?? []).find((upgrade) => upgrade.id === upgradeId);
  if (held !== undefined) {
    return upgradeIsFitted(state, held.fittedOnDay)
      ? { ok: false, reason: 'Fitted' }
      : { ok: false, reason: `Being fitted: ready on ${formatCalendarDay(held.fittedOnDay)}` };
  }
  if (!canAfford(state, spec.price)) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, reason: '' };
}

/** Buys an upgrade of a line: the cash leaves at the click on one line of its own, and it is
 *  fitted ten working days on. Never called off and never sold on its own: it goes with the line
 *  (CLAUDE.md T30 2.10). */
export function buyLineUpgrade(state: GameState, line: number, upgradeId: string): { ok: boolean; reason: string } {
  const check = lineUpgradeCheck(state, line, upgradeId);
  if (!check.ok) return check;
  const spec = LINE_UPGRADES.find((entry) => entry.id === upgradeId);
  if (spec === undefined) return check;
  pay(state, 'equipment', `${lineName(line)} upgrade: ${spec.name}`, spec.price);
  lineState(state, line).upgrades.push({ id: spec.id, fittedOnDay: addWorkingDays(state.clock.day, LINE_UPGRADE_DAYS) });
  return check;
}

/** A line sold: its upgrades go with it, for nothing (CLAUDE.md T30 2.3.5, 2.10). */
export function emptyLineUpgrades(state: GameState, line: number): void {
  lineState(state, line).upgrades = [];
}

/** A window's minutes in the words the card and the running block print: `2 hours`, `1 h 45 min`. */
export function lineWindowEvery(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return plural(hours, 'hour', 'hours');
  return hours === 0 ? `${rest} min` : `${hours} h ${rest} min`;
}

/** The windows of a working week at a line's pace, rounded down: 20 at 120 minutes. */
export function lineWindowsAWeek(state: GameState, line: number): number {
  return Math.floor((WORKING_DAYS_PER_WEEK * MINUTES_PER_WORKING_DAY) / lineWindowMinutes(state, line));
}

/** A line's contract while it runs, and null while it is only offered or there is none. */
export function runningLineContract(state: GameState, line: number): LineContract | null {
  const contract = lineRecord(state, line)?.contract ?? null;
  return contract !== null && contract.status === 'active' ? contract : null;
}

/** The lines whose contracts run this minute, in their order (v93). */
export function linesOnContract(state: GameState): number[] {
  return state.windowLines.filter((record) => record.contract?.status === 'active').map((record) => record.number);
}

/** The line engineers on the books for this line, hired and started, whether in today or not:
 *  what its offer asks for, two (CLAUDE.md T30 2.6; v93: the line's own pair) [TUNE: on the books is
 *  started, in today or not]. */
function engineersOnTheBooks(state: GameState, line: number): number {
  return lineEngineersOf(state, line, state.clock.day).length;
}

/** The offer card's words, every figure from the constants and the line's own pace (CLAUDE.md T30
 *  2.6). */
export function lineOfferBody(state: GameState, line: number): string {
  return (
    `A window company will take every window ${lineName(line).toLowerCase()} makes, at ${formatMoney(LINE_WINDOW_PRICE)} a ` +
    `window. The timber and the glass cost ${formatMoney(lineMaterialPerWindow())} a window, ordered ahead: ` +
    'on the Contracts tab, or by the office. The line makes one every ' +
    `${lineWindowEvery(lineWindowMinutes(state, line))}, about ${lineWindowsAWeek(state, line)} a week, and the client ` +
    `collects each pallet of ${inWords(LINE_PALLET_WINDOWS)} the next working day. It runs until you end it.`
  );
}

/** Every line's step at the open of a working day, the last of `startDay`, after the day's kit has
 *  landed and its cards are queued: the client's lorry takes every pallet at the gate, a new week
 *  starts the week's count, and each contract is offered when it may be (CLAUDE.md T30 2.6, 2.8). */
export function runLineDay(state: GameState): void {
  for (const line of standingLines(state)) lineState(state, line);
  for (const record of state.windowLines) {
    // Taken at no cost and with no line in the ledger: its windows were paid as they were made.
    record.palletsAtGate = 0;
    const contract = runningLineContract(state, record.number);
    if (contract !== null && weekOfDay(state.clock.day) !== weekOfDay(contract.weekStartDay)) {
      contract.windowsThisWeek = 0;
      contract.weekStartDay = state.clock.day;
    }
  }
  // The office looks at every line's timber and glass at the open of every working day, after the
  // day's lorries and glass are in (CLAUDE.md T31 2.3).
  officeOrdersEveryLinesMaterial(state);
  for (const record of state.windowLines) offerLineContract(state, record.number);
}

/** Offered by a card when all six modules of the line stand, its two line engineers are on the
 *  books, no contract of the line is offered or running, and the day is not before its next offer
 *  day (CLAUDE.md T30 2.6). The card carries the line's number. */
function offerLineContract(state: GameState, line: number): void {
  const record = lineState(state, line);
  const day = state.clock.day;
  if (record.contract !== null) return;
  if (record.nextOfferDay !== null && day < record.nextOfferDay) return;
  if (!lineStandsWhole(state, line)) return;
  if (engineersOnTheBooks(state, line) < LINE_ENGINEERS_MAX) return;
  record.contract = {
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
    title: lineContractName(line),
    body: lineOfferBody(state, line),
    choices: [
      { id: 'take', label: 'Take it' },
      { id: 'notNow', label: 'Not now' },
    ],
    data: { line },
  });
}

/** The answer to a line's offer card: taken, it runs from that minute, while the line still stands
 *  whole; turned down, it is offered again a week on (CLAUDE.md T30 2.6). */
export function answerLineOffer(state: GameState, line: number, choiceId: string): void {
  const record = lineState(state, line);
  const contract = record.contract;
  if (contract === null || contract.status !== 'offered') return;
  if (choiceId === 'take' && lineStandsWhole(state, line)) {
    contract.status = 'active';
    contract.startDay = state.clock.day;
    contract.weekStartDay = state.clock.day;
    // The office looks at the line's material the minute it is taken too, so a new contract does
    // not wait a working day for its first order (CLAUDE.md T31 2.3) [TUNE].
    officeOrdersLineMaterial(state, line);
    return;
  }
  record.contract = null;
  record.nextOfferDay = state.clock.day + DAYS_PER_WEEK;
}

/** Ends a line's contract, by the player's `End it` or by the sale of the line: a part pallet goes
 *  to the gate as it is, the window in hand is dropped, and it is offered again a week on
 *  (CLAUDE.md T30 2.6, 2.8). An offer still waiting for its answer goes too. */
export function endLineContract(state: GameState, line: number): void {
  const record = lineState(state, line);
  if (record.contract === null) return;
  if (record.onPallet > 0) {
    record.palletsAtGate += 1;
    record.onPallet = 0;
  }
  record.contract = null;
  record.minutes = 0;
  record.nextOfferDay = state.clock.day + DAYS_PER_WEEK;
}

/** True in a minute a line makes windows on its contract: a working day, not the dinner hour and
 *  not after five whatever the owner does, the line running whole (two engineers on duty), and not
 *  while it is being moved. Not on the second shift: the line's minute runs only from the day's
 *  clock, and the engineers work by day (CLAUDE.md T30 2.7) [TUNE: chat]. */
export function lineMakesWindows(state: GameState, line: number): boolean {
  if (runningLineContract(state, line) === null) return false;
  if (!isWorkingDay(state.clock.day)) return false;
  if (isBreak(state.clock.minute)) return false;
  if (crewHasGoneHome(state)) return false;
  if (movingMachines(state) !== null) return false;
  if (lineLevel(state, line) < LINE_MODULES.length) return false;
  // And a window's boards and glass: a minute with too little is a minute the line stands (CLAUDE.md
  // T31 2.1).
  return lineShortOf(state, line) === null;
}

/** Every line's own minute, beside the men's: the window in hand moves on by one, and at its
 *  minutes it is made, the minutes over carried into the next one. The hall's crowding, its dust
 *  and its labourer do not touch it, and no minute of any man or machine is booked for it
 *  (CLAUDE.md T30 2.7) [TUNE]. */
export function runLineMinute(state: GameState): void {
  for (const record of state.windowLines) {
    const line = record.number;
    bookLineMinute(state, line);
    if (!lineMakesWindows(state, line)) continue;
    record.minutes += 1;
    const each = lineWindowMinutes(state, line);
    while (record.minutes >= each && lineShortOf(state, line) === null) {
      record.minutes -= each;
      makeWindow(state, line);
    }
  }
}

/** One window made on a line: its price in on the contract line, one growing line a day, and its
 *  two boards and its glass taken off what the line holds: the boards off the timber stores and the
 *  counter, the glass off module 6. The material was paid at its order, so nothing of it is booked
 *  here (CLAUDE.md T31 2.1). It stands on the pallet, and the tenth sends the pallet to the gate
 *  (CLAUDE.md T30 2.7, 2.8). Then the office looks at what is left (CLAUDE.md T31 2.3). */
function makeWindow(state: GameState, line: number): void {
  const contract = runningLineContract(state, line);
  if (contract === null) return;
  const material = lineMaterialPerWindow();
  const record = lineState(state, line);
  charge(state, 'contract', `${lineContractName(line)}: windows`, LINE_WINDOW_PRICE, { merge: true });
  record.boards -= LINE_BOARDS_PER_WINDOW;
  state.stock.sheets = Math.max(0, state.stock.sheets - LINE_BOARDS_PER_WINDOW);
  record.glass -= LINE_GLASS_PER_WINDOW;
  contract.windowsMade += 1;
  contract.windowsThisWeek += 1;
  contract.revenue += LINE_WINDOW_PRICE;
  // The material the windows used, not what was bought (CLAUDE.md T31 2.5).
  contract.materialCost += material;
  // And in the line's own day book, the day in hand and since it first stood (CLAUDE.md T31 2.5).
  const today = lineToday(state, line);
  today.windows += 1;
  today.turnover += LINE_WINDOW_PRICE;
  today.material += material;
  record.since.windows += 1;
  record.since.turnover += LINE_WINDOW_PRICE;
  record.since.material += material;
  record.onPallet += 1;
  if (record.onPallet >= LINE_PALLET_WINDOWS) {
    record.onPallet = 0;
    record.palletsAtGate += 1;
  }
  officeOrdersLineMaterial(state, line);
}

/** The pallets waiting at the gate for the client, every line's together: what the hall draws
 *  there (CLAUDE.md T30 2.8; v93). */
export function palletsAtTheGate(state: GameState): number {
  return state.windowLines.reduce((total, record) => total + record.palletsAtGate, 0);
}
