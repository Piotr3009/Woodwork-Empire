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
// the window in hand, the windows on module 6's pallet, the full pallets at the gate, its upgrades
// and its day book. Its timber and glass are the company's stock from Turn 32, on the timber stores
// and the glass racks, held by its contract as a sheet contract holds its sheets (CLAUDE.md T32 2.5). A record is written whole the first time its line is
// asked for, every part with its default, and stays after the line is sold for its books (CLAUDE.md
// T30 section 4) [TUNE: the name of this module].
//
// A line's contract is a record of its own and never one of `state.contracts` [TUNE: chat]: it is
// not counted against the three, nobody is put on it, it has no week to meet, no term and no price
// off a band, and it draws nothing off the seeded stream, so no other offer, job or event of any
// save moves by a step (CLAUDE.md T30 2.6). Its windows are made by the line's own minute, beside
// the men's, and book nothing to any man or machine (2.7); every tenth goes to the gate on a pallet,
// which the client takes at the open of the next working day (2.8). Every line has its own: its
// own offer card, its own block, its own engineers, pallet and upgrades (PIOTR, 12.10).

import {
  DAYS_PER_MONTH,
  DAYS_PER_WEEK,
  DAYS_PER_YEAR,
  LINE_BOARDS_PER_WINDOW,
  LINE_DAYS_KEPT,
  LINE_KINDS,
  LINE_MODULE_POWER_PER_DAY,
  LINE_REORDER_DAYS,
  LINE_UPGRADE_DAYS,
  LINE_UPGRADE_MINUTES,
  LINE_WINDOW_MINUTES,
  LINE_WINDOW_MINUTES_MIN,
  MINUTES_PER_WORKING_DAY,
  PROPERTY_INSURANCE_RATE_YEARLY,
  SHEET_VALUE,
  WORKING_DAYS_PER_WEEK,
  lineContractName,
  lineMaterialPerUnitOf,
  lineModulesOf,
  lineName,
  lineUnitPriceOf,
  insurerUnitFactor,
} from './constants';
import { addWorkingDays, formatCalendarDay, isBreak, isWorkingDay, weekOfDay } from './clock';
import { canAfford, charge, formatMoney, pay } from './economy';
import { queueEvent } from './events';
import { lineValueOf } from './insurance';
import { MATERIAL_ORDER_ROLES } from './jobs';
import { lineEngineerSlot, lineKindOf, lineLevel, lineRecord, lineState, lineStandsWhole, standingLines } from './machines';
import { buyStock, freeFor, pendingStockSheets, reserveWindowsShortfalls, restockCheck, restockSheets } from './materials';
import { crewHasGoneHome, lineEngineers } from './staff';
import { firstOnDutyOf, movingMachines } from './tasks';
import { inWords, plural } from './text';
import { pinned, whilePinned } from './pinned';
import { emptyLineDay } from './machines';
import type { GameState, LineContract, LineDay, LineKind, LineLostMinutes, Worker } from './types';

// The empty record and the one road to a line's record live in machines.ts, which every layer
// reads; they are the line's and are read from here as well (v93).
export { emptyLineDay, emptyLineSince, emptyWindowLine, lineState } from './machines';

/** The line engineers on the books on this day, started, in the order they were taken on, shared
 *  out along the lines that stand as the engineers on duty are, each line its kind's crew in line
 *  order (`lineEngineerSlot`): the ones this line pays for in its books (v93; v107) [TUNE: chat]. */
function lineEngineersOf(state: GameState, line: number, day: number): Worker[] {
  const slot = lineEngineerSlot(state, line);
  if (slot === null) return [];
  const onTheBooks = lineEngineers(state).filter(
    (worker) => worker.startDay <= day && (worker.leavesOnDay === null || worker.leavesOnDay >= day),
  );
  return onTheBooks.slice(slot.from, slot.from + slot.need);
}

/** The day's share of a line's engineers on the books that day: each one's month over the days of
 *  a month (CLAUDE.md T31 2.5). */
export function lineEngineersPerDay(state: GameState, line: number, day: number): number {
  return lineEngineersOf(state, line, day).reduce((total, worker) => total + worker.monthlyWage / DAYS_PER_MONTH, 0);
}

/** The day's power of a line's six modules, its kind's: 360 a window line, 720 a door line
 *  (CLAUDE.md T31 2.5; v107). */
export function linePowerPerDay(kind: LineKind): number {
  return lineModulesOf(kind).length * LINE_MODULE_POWER_PER_DAY * LINE_KINDS[kind].factor;
}

/** The day's share of the property cover on a line, while the cover is held: its value at the
 *  cover's rate and the unit's factor, over the days of a year (CLAUDE.md T31 2.5). */
export function lineCoverPerDay(state: GameState, line: number): number {
  if (!state.insurance.property) return 0;
  return (lineValueOf(state, line) * PROPERTY_INSURANCE_RATE_YEARLY * insurerUnitFactor(state.unit)) / DAYS_PER_YEAR;
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
  // What every line's day takes, read first for all of them with the state pinned, and written
  // after: which lines stand, which engineers are whose and what each line is worth were worked out
  // again for every line, the whole hall each time, so the open of a day took four times as long
  // for twice the lines (v127). Nothing a line's day book takes changes what another line's reads.
  const opened = whilePinned(state, () => {
    const days: Array<{ line: number; today: LineDay; engineers: number; power: number; cover: number }> = [];
    for (const line of standingLines(state)) {
      if (!lineStandsWhole(state, line)) continue;
      const today = lineToday(state, line);
      if (today.power > 0) continue;
      days.push({
        line,
        today,
        engineers: lineEngineersPerDay(state, line, today.day),
        power: linePowerPerDay(lineKindOf(state, line)),
        cover: lineCoverPerDay(state, line),
      });
    }
    return days;
  });
  for (const { line, today, engineers, power, cover } of opened) {
    const since = lineState(state, line).since;
    today.engineers = engineers;
    today.power = power;
    today.cover = cover;
    if (since.firstDay === null) since.firstDay = today.day;
    since.engineers += today.engineers;
    since.power += today.power;
    since.cover += today.cover;
  }
}

/** Why a line cannot use a working minute of its contract, or null when it can: no two engineers
 *  on duty, the line being moved, or the timber, the glass or both short (CLAUDE.md T31 2.5). The
 *  line's level is the minute's, worked out once for every line (`runLineMinute`; v125). */
function lineLostTo(state: GameState, line: number, level: number): keyof LineLostMinutes | null {
  if (level < lineModulesOf(lineKindOf(state, line)).length) return 'engineer';
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
function bookLineMinute(state: GameState, line: number, level: number): void {
  if (runningLineContract(state, line) === null) return;
  if (!isWorkingDay(state.clock.day) || isBreak(state.clock.minute) || crewHasGoneHome(state)) return;
  const today = lineToday(state, line);
  today.possibleMinutes += 1;
  today.possibleWindows += 1 / lineWindowMinutes(state, line);
  const lost = lineLostTo(state, line, level);
  if (lost !== null) today.lost[lost] += 1;
}

/** What the timber and the glass of one window cost, written from the price and the share and
 *  never as a figure of its own: 600 (CLAUDE.md T30 2.6). The window line's kind's, which the glass
 *  unit's price is written from (v107). */
export function lineMaterialPerWindow(): number {
  return lineMaterialPerUnitOf('window');
}

/** The boards of a window at what a board is worth: 400 of its 600 (CLAUDE.md T31 2.1) [TUNE:
 *  chat: the split]. */
export function lineBoardsPerWindowCost(): number {
  return LINE_BOARDS_PER_WINDOW * SHEET_VALUE;
}

/** What a unit of a line's kind takes of each kind of stock, and the contract's hold of it: two
 *  boards and a glass unit a window (CLAUDE.md T31 2.1, T32 2.5), four and two a door (v107). */
function perUnit(state: GameState, line: number, stock: 'boards' | 'glass'): number {
  const kind = LINE_KINDS[lineKindOf(state, line)];
  return stock === 'boards' ? kind.boards : kind.glass;
}

/** What a line could take of a kind for its windows this minute: what its contract holds, and the
 *  free stock nobody has a claim on, as a sheet contract may take what it holds and the free sheets
 *  (CLAUDE.md T32 2.5); never more than is on the counter. Only the free stock while no contract
 *  runs. */
function openTo(state: GameState, line: number, kind: 'boards' | 'glass'): number {
  const contract = runningLineContract(state, line);
  const held = contract === null ? 0 : kind === 'boards' ? contract.boardsReserved : contract.glassReserved;
  return Math.min(held + freeFor(state, kind), state.stock[kind]);
}

/** What a line is short of for its next window, in the words the strip and the running block
 *  print, or null when what it holds and the free stock give a window's boards and glass: the one
 *  answer the line's minute, the strip and the `Standing still` row read (CLAUDE.md T31 2.1, 2.4,
 *  T32 2.5). */
export function lineShortOf(state: GameState, line: number): 'timber' | 'glass' | 'timber or glass' | null {
  const timber = openTo(state, line, 'boards') < perUnit(state, line, 'boards');
  const glass = openTo(state, line, 'glass') < perUnit(state, line, 'glass');
  if (timber && glass) return 'timber or glass';
  if (timber) return 'timber';
  if (glass) return 'glass';
  return null;
}

/** A running line contract holds, from the free boards and the free glass, what the windows left in
 *  the week in hand want, as a sheet contract holds the week's sheets (`reserveContractSheets`):
 *  at the open of every working day after the jobs have had theirs, the minute it is taken, and
 *  after every unloading, fetch and restock, after the jobs (CLAUDE.md T32 2.5). */
export function reserveLineMaterial(state: GameState, line: number): void {
  const contract = runningLineContract(state, line);
  if (contract === null) return;
  const left = Math.max(0, lineWindowsAWeek(state, line) - contract.windowsThisWeek);
  for (const kind of ['boards', 'glass'] as const) {
    const held = kind === 'boards' ? contract.boardsReserved : contract.glassReserved;
    const more = Math.min(Math.max(0, left * perUnit(state, line, kind) - held), freeFor(state, kind));
    if (more <= 0) continue;
    if (kind === 'boards') contract.boardsReserved += more;
    else contract.glassReserved += more;
  }
}

/** Every line on its contract holds its week, line 1 first (CLAUDE.md T32 2.5; v93). */
export function reserveEveryLinesMaterial(state: GameState): void {
  for (const record of state.windowLines) reserveLineMaterial(state, record.number);
}

/** A unit's boards or its glass taken off the counter: out of what the contract holds first, then
 *  the free stock, as a sheet contract draws its sheets (CLAUDE.md T32 2.5). */
function takeForUnit(state: GameState, line: number, contract: LineContract, kind: 'boards' | 'glass'): void {
  const due = perUnit(state, line, kind);
  state.stock[kind] = Math.max(0, state.stock[kind] - due);
  if (kind === 'boards') contract.boardsReserved = Math.max(0, contract.boardsReserved - due);
  else contract.glassReserved = Math.max(0, contract.glassReserved - due);
}

/** The windows of two working days at a line's pace today: 8 at 120 minutes a window, 16 at 60
 *  (CLAUDE.md T31 2.3). */
export function lineReorderWindows(state: GameState, line: number): number {
  return LINE_REORDER_DAYS * Math.floor(MINUTES_PER_WORKING_DAY / lineWindowMinutes(state, line));
}

/** The office admin on duty restocks the boards and the glass for a line by himself, while its
 *  contract runs [PIOTR, 11.10: "the office admin orders by himself when two days are left", kept]:
 *  when what the line could have of a kind (what it holds, the free stock and what of the kind is on
 *  its way for stock) is fewer than two working days of its windows' worth, he places that kind's
 *  Restock with nothing typed, which fills the free places less what is on its way and so never goes
 *  to the paid store, when the Restock would be allowed and buys at least one. His name is in the
 *  ledger line. With no admin on duty nothing is bought (CLAUDE.md T31 2.3, T32 2.5) [TUNE: chat:
 *  as a restock]. He restocks for the line and for nothing else. */
export function officeOrdersLineMaterial(state: GameState, line: number): void {
  if (runningLineContract(state, line) === null) return;
  const admin = firstOnDutyOf(state, MATERIAL_ORDER_ROLES);
  if (admin === null) return;
  const windows = lineReorderWindows(state, line);
  for (const kind of ['boards', 'glass'] as const) {
    const could = openTo(state, line, kind) + pendingStockSheets(state, kind);
    if (could >= windows * perUnit(state, line, kind)) continue;
    const count = restockSheets(state, kind);
    if (count <= 0 || !restockCheck(state, kind).ok) continue;
    buyStock(state, kind, count, admin.name);
  }
}

/** The office looks at every line's boards and glass, each line on its own rule (v93). */
function officeOrdersEveryLinesMaterial(state: GameState): void {
  for (const record of state.windowLines) officeOrdersLineMaterial(state, record.number);
}

/** The minutes a unit takes on a line's contract: the one answer the offer card, the running
 *  block and the line's minute read. Each upgrade fitted takes its ten minutes off, and never
 *  below one window every twenty minutes (CLAUDE.md T30 2.7, 2.10; v97); a unit of another kind the
 *  window's minutes times its kind's factor, a door the window's own (v107). */
export function lineWindowMinutes(state: GameState, line: number): number {
  const fitted = (lineRecord(state, line)?.upgrades ?? []).filter((upgrade) => upgradeIsFitted(state, upgrade.fittedOnDay)).length;
  const factor = LINE_KINDS[lineKindOf(state, line)].minutesFactor;
  return factor * Math.max(LINE_WINDOW_MINUTES_MIN, LINE_WINDOW_MINUTES - LINE_UPGRADE_MINUTES * fitted);
}

/** Which of `frames` pictures a station of a line shows for the unit in hand: the frames spread
 *  over the unit's minutes (`lineWindowMinutes`), the first at nought and the last held from the
 *  last share of the cycle, and past the cycle too while the line waits for its material with a
 *  unit's minutes done. Null while no contract runs: the station has no unit in its hands (v117). */
export function lineUnitFrame(state: GameState, line: number, frames: number): number | null {
  if (runningLineContract(state, line) === null) return null;
  const minutes = lineRecord(state, line)?.minutes ?? 0;
  return Math.max(0, Math.min(frames - 1, Math.floor((minutes / lineWindowMinutes(state, line)) * frames)));
}

/** True from the open of the day an upgrade is fitted on. */
function upgradeIsFitted(state: GameState, fittedOnDay: number): boolean {
  return state.clock.day >= fittedOnDay;
}

/** Whether an upgrade of a line can be bought, in the order its card's locked Buy reads: the
 *  line first, then the one already on the list (on its way or fitted), then the cash. One of each
 *  a line (CLAUDE.md T30 2.10; v93). */
export function lineUpgradeCheck(state: GameState, line: number, upgradeId: string): { ok: boolean; reason: string } {
  // A line's own kind's upgrades: a door line's are not a window line's (v107).
  const spec = LINE_KINDS[lineKindOf(state, line)].upgrades.find((entry) => entry.id === upgradeId);
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
  const spec = LINE_KINDS[lineKindOf(state, line)].upgrades.find((entry) => entry.id === upgradeId);
  if (spec === undefined) return check;
  pay(state, 'equipment', `${lineName(line)} upgrade: ${spec.name}`, spec.price);
  lineState(state, line).upgrades.push({ id: spec.id, fittedOnDay: addWorkingDays(state.clock.day, LINE_UPGRADE_DAYS) });
  return check;
}

/** A line sold: its upgrades go with it, for nothing (CLAUDE.md T30 2.3.5, 2.10). */
export function emptyLineUpgrades(state: GameState, line: number): void {
  lineState(state, line).upgrades = [];
}

/** A window's minutes in the words the card and the running block print: `1 hour`, `50 min`. */
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
 *  what its offer asks for, its kind's crew (CLAUDE.md T30 2.6; v93: the line's own pair; v107: a
 *  door line's four) [TUNE: on the books is started, in today or not]. */
function engineersOnTheBooks(state: GameState, line: number): number {
  return lineEngineersOf(state, line, state.clock.day).length;
}

/** The offer card's words, every figure from the constants, the line's kind and its own pace
 *  (CLAUDE.md T30 2.6; v107). */
export function lineOfferBody(state: GameState, line: number): string {
  const kind = lineKindOf(state, line);
  const spec = LINE_KINDS[kind];
  return (
    `${spec.client} will take every ${spec.unit} ${lineName(line).toLowerCase()} makes, at ${formatMoney(lineUnitPriceOf(kind))} a ` +
    `${spec.unit}. The timber and the glass cost ${formatMoney(lineMaterialPerUnitOf(kind))} a ${spec.unit}, taken from your ` +
    'timber stores and glass racks: restock them on the Materials page, or the office does. The line makes one every ' +
    `${lineWindowEvery(lineWindowMinutes(state, line))}, about ${lineWindowsAWeek(state, line)} a week, and the client ` +
    // A house factory's houses are collected one by one off its own lane (v114).
    (spec.collection === 'gate'
      ? `collects each pallet of ${inWords(spec.palletUnits)} the next working day. It runs until you end it.`
      : `collects each ${spec.unit} from the line's lane the next working day. It runs until you end it.`)
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
  // Every line on its contract holds its week's boards and glass at the open of every working day,
  // after the windows have had theirs, as the sheet contracts hold their sheets after the jobs
  // (CLAUDE.md T32 2.5); then the office looks at what each could have (CLAUDE.md T31 2.3).
  reserveWindowsShortfalls(state);
  reserveEveryLinesMaterial(state);
  officeOrdersEveryLinesMaterial(state);
  for (const record of state.windowLines) offerLineContract(state, record.number);
}

/** Offered by a card when all six modules of the line stand, its kind's line engineers are on the
 *  books, no contract of the line is offered or running, and the day is not before its next offer
 *  day (CLAUDE.md T30 2.6; v107). The card carries the line's number. */
function offerLineContract(state: GameState, line: number): void {
  const record = lineState(state, line);
  const day = state.clock.day;
  if (record.contract !== null) return;
  if (record.nextOfferDay !== null && day < record.nextOfferDay) return;
  if (!lineStandsWhole(state, line)) return;
  if (engineersOnTheBooks(state, line) < LINE_KINDS[record.kind].engineers) return;
  record.contract = {
    status: 'offered',
    startDay: day,
    windowsThisWeek: 0,
    weekStartDay: day,
    windowsMade: 0,
    revenue: 0,
    materialCost: 0,
    boardsReserved: 0,
    glassReserved: 0,
  };
  queueEvent(state, {
    kind: 'lineContractOffered',
    title: lineContractName(line, record.kind),
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
    // It holds its week the minute it is taken (CLAUDE.md T32 2.5), and the office looks at the
    // line's material then too, so a new contract does not wait a working day for its first order
    // (CLAUDE.md T31 2.3) [TUNE].
    reserveLineMaterial(state, line);
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
export function lineMakesWindows(state: GameState, line: number, level?: number): boolean {
  // Kept for as long as the state is pinned: the hall asks it of each of a line's six modules
  // (v104). The line's minute hands it the level it has worked out for the minute (v125).
  return pinned(state, `lineMakesWindows:${line}`, () => {
    if (runningLineContract(state, line) === null) return false;
    if (!isWorkingDay(state.clock.day)) return false;
    if (isBreak(state.clock.minute)) return false;
    if (crewHasGoneHome(state)) return false;
    if (movingMachines(state) !== null) return false;
    if ((level ?? lineLevel(state, line)) < lineModulesOf(lineKindOf(state, line)).length) return false;
    // And a window's boards and glass: a minute with too little is a minute the line stands
    // (CLAUDE.md T31 2.1).
    return lineShortOf(state, line) === null;
  });
}

/** Every line's own minute, beside the men's: the window in hand moves on by one, and at its
 *  minutes it is made, the minutes over carried into the next one. The hall's crowding, its dust
 *  and its labourer do not touch it, and no minute of any man or machine is booked for it
 *  (CLAUDE.md T30 2.7) [TUNE]. */
export function runLineMinute(state: GameState): void {
  // Every line's level, worked out once for the minute (v125). Asked line by line, two and three
  // times a line, each was the whole kit and every man again: on Piotr's save of day 8,464 the line
  // minute grew four times over for twice the lines, 0.7 s a game minute at eight times his
  // factory. Nothing a line does in its minute stands or sells a module, or puts an engineer on or
  // off duty, so the levels hold to the minute's end and are what each line was asked before.
  const levels = whilePinned(
    state,
    () => new Map(state.windowLines.map((record) => [record.number, lineLevel(state, record.number)])),
  );
  for (const record of state.windowLines) {
    const line = record.number;
    const level = levels.get(line) ?? 0;
    bookLineMinute(state, line, level);
    if (!lineMakesWindows(state, line, level)) continue;
    record.minutes += 1;
    const each = lineWindowMinutes(state, line);
    while (record.minutes >= each && lineShortOf(state, line) === null) {
      record.minutes -= each;
      makeUnit(state, line);
    }
  }
}

/** One unit made on a line, a window or a door by its kind: its price in on the contract line, one
 *  growing line a day, and its boards and its glass taken off the counters, out of what its contract
 *  holds first and then the free stock (CLAUDE.md T32 2.5). The material was paid when it was bought,
 *  so nothing of it is booked here (CLAUDE.md T31 2.1); its books count the material a unit used,
 *  £600 a window and £1,200 a door. It stands on the pallet, and the tenth sends the pallet to the
 *  gate (CLAUDE.md T30 2.7, 2.8); a house, its kind's pallet of one, goes out to its line's lane at
 *  once, where it waits for the housebuilder the same way (v114). Then the office looks at what is
 *  left (CLAUDE.md T31 2.3). */
function makeUnit(state: GameState, line: number): void {
  const contract = runningLineContract(state, line);
  if (contract === null) return;
  const record = lineState(state, line);
  const spec = LINE_KINDS[record.kind];
  const price = lineUnitPriceOf(record.kind);
  const material = lineMaterialPerUnitOf(record.kind);
  charge(state, 'contract', `${lineContractName(line, record.kind)}: ${spec.units}`, price, { merge: true });
  takeForUnit(state, line, contract, 'boards');
  takeForUnit(state, line, contract, 'glass');
  contract.windowsMade += 1;
  contract.windowsThisWeek += 1;
  contract.revenue += price;
  // The material the units used, not what was bought (CLAUDE.md T31 2.5).
  contract.materialCost += material;
  // And in the line's own day book, the day in hand and since it first stood (CLAUDE.md T31 2.5).
  const today = lineToday(state, line);
  today.windows += 1;
  today.turnover += price;
  today.material += material;
  record.since.windows += 1;
  record.since.turnover += price;
  record.since.material += material;
  record.onPallet += 1;
  if (record.onPallet >= spec.palletUnits) {
    record.onPallet = 0;
    record.palletsAtGate += 1;
  }
  officeOrdersLineMaterial(state, line);
}

/** The pallets waiting at the gate for the client, every line's together, or every line's of one
 *  kind: what the hall draws there (CLAUDE.md T30 2.8; v93; v107). A house factory's houses wait on
 *  its own lane and are none of them (v114). */
export function palletsAtTheGate(state: GameState, kind: LineKind | null = null): number {
  return state.windowLines
    .filter((record) => (kind === null ? LINE_KINDS[record.kind].collection === 'gate' : record.kind === kind))
    .reduce((total, record) => total + record.palletsAtGate, 0);
}
