/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The production line's own books (PIOTR, 11.10: "in a tab in the finances, the production line's
// account: the turnover, the materials, the engineers, the efficiency, the net profit, by the day
// and by the year"; CLAUDE.md T31 2.5). The line keeps a day book of its own, in
// `state.windowLine`: the day in hand (`today`), one record a calendar day (`days`), written at the
// open of each working day for the days since the last one, weekends among them, and the totals
// since the line first stood (`since`). The Accounting page's Production line tab reads it, and
// never the ledger, so it reads the same whether or not the books are up to date [TUNE].
//
// The windows, their turnover and the material they used are written as each window is made; the
// working minutes its contract ran and the minutes it lost, by cause, at each of its minutes; and
// the engineers', the power's and the property cover's shares on every calendar day the line
// stands, contract or not [TUNE: chat].

import {
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  LINE_DAYS_KEPT,
  LINE_MODULE_POWER_PER_DAY,
  LINE_MODULES,
  LINE_PRICE,
  PROPERTY_INSURANCE_RATE_YEARLY,
  unitCostFactor,
} from './constants';
import { isWorkingDay, monthOfDay, weekOfDay, yearOfDay } from './clock';
import { lineValue } from './insurance';
import { lineStandsWhole } from './machines';
import { lineEngineers } from './staff';
import type { GameState, LineDay, LineLostMinutes, LineSince } from './types';

/** The totals of a line that has never stood (CLAUDE.md T31 2.5). */
export function emptyLineSince(): LineSince {
  return { firstDay: null, upgrades: 0, windows: 0, turnover: 0, material: 0, engineers: 0, power: 0, cover: 0 };
}

/** A day of the line's day book with nothing in it yet. */
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
    lostWindows: 0,
    lost: { engineer: 0, moving: 0, timber: 0, glass: 0 },
  };
}

/** The line's standing costs for one calendar day, while it stands: each line engineer on the
 *  books, his month over the month's days; the six modules' power; and, while the property cover
 *  is held, the line's value at the cover's rate and the unit's factor over the year's days
 *  (CLAUDE.md T31 2.5). Nothing while the line does not stand. */
export function lineDayShares(state: GameState, day: number): { engineers: number; power: number; cover: number } {
  if (!lineStandsWhole(state)) return { engineers: 0, power: 0, cover: 0 };
  const engineers = lineEngineers(state)
    .filter((worker) => worker.startDay <= day)
    .reduce((total, worker) => total + worker.monthlyWage / DAYS_PER_MONTH, 0);
  const power = LINE_MODULES.length * LINE_MODULE_POWER_PER_DAY;
  const cover = state.insurance.property
    ? (lineValue(state) * PROPERTY_INSURANCE_RATE_YEARLY * unitCostFactor(state.unit)) / DAYS_PER_YEAR
    : 0;
  return { engineers, power, cover };
}

/** A calendar day of the book with its standing costs written, and nothing made yet. */
function dayWithShares(state: GameState, day: number): LineDay {
  return { ...emptyLineDay(day), ...lineDayShares(state, day) };
}

/** Adds a closed day to the totals since the line first stood. */
function addToSince(state: GameState, closed: LineDay): void {
  const since = state.windowLine.since;
  since.windows += closed.windows;
  since.turnover += closed.turnover;
  since.material += closed.material;
  since.engineers += closed.engineers;
  since.power += closed.power;
  since.cover += closed.cover;
}

/** The open of a working day: the day in hand is closed into the book and the totals, then every
 *  calendar day between it and today with its standing costs and nothing made, and today opened
 *  with its own. Before the line has first stood nothing is written; the first open it stands is its
 *  first day. Records past `LINE_DAYS_KEPT` days old are let go (CLAUDE.md T31 2.5). */
export function openLineBooks(state: GameState): void {
  const line = state.windowLine;
  const today = state.clock.day;
  // A day in hand with a minute of the contract in it is a day the line stood, though its first
  // open never saw it: it is closed with the rest (CLAUDE.md T31 2.5).
  if (line.since.firstDay === null && (line.today.possibleMinutes > 0 || line.today.windows > 0)) {
    line.since.firstDay = line.today.day;
  }
  if (line.since.firstDay === null) {
    if (!lineStandsWhole(state)) {
      line.today = emptyLineDay(today);
      return;
    }
    startLineBooks(state);
    return;
  }
  if (line.today.day >= today) return;
  line.days.push(line.today);
  addToSince(state, line.today);
  for (let day = line.today.day + 1; day < today; day += 1) {
    const between = dayWithShares(state, day);
    line.days.push(between);
    addToSince(state, between);
  }
  line.today = dayWithShares(state, today);
  line.days = line.days.filter((entry) => entry.day > today - LINE_DAYS_KEPT);
}

/** The line's first day in the book: today, with its standing costs. Called at the first open the
 *  line stands, and by the lift for a save whose line stands already (CLAUDE.md T31 2.5, section
 *  4). */
export function startLineBooks(state: GameState): void {
  state.windowLine.since.firstDay = state.clock.day;
  state.windowLine.today = dayWithShares(state, state.clock.day);
}

/** What stopped a working minute of the line's contract, or null when it made its minute: too few
 *  engineers first, then the move, then the timber, then the glass [TUNE: the order]. */
export type LineLostCause = keyof LineLostMinutes;

/** One working minute of the line's contract into the day in hand: possible, and lost to its cause
 *  when it did not run, with the window's worth of it that was lost. `windowMinutes` is the minutes
 *  a window takes this minute. */
export function bookLineMinute(state: GameState, windowMinutes: number, cause: LineLostCause | null): void {
  const today = state.windowLine.today;
  today.possibleMinutes += 1;
  if (cause === null) return;
  today.lost[cause] += 1;
  today.lostWindows += 1 / windowMinutes;
}

/** One window made into the day in hand: its turnover and the material it used. */
export function bookLineWindow(state: GameState, price: number, material: number): void {
  const today = state.windowLine.today;
  today.windows += 1;
  today.turnover += price;
  today.material += material;
}

/** One column of the tab: the days it sums, and what they come to. */
export interface LineColumn {
  windows: number;
  turnover: number;
  material: number;
  engineers: number;
  power: number;
  cover: number;
  net: number;
  /** The windows the line could have made in the working minutes its contract ran: the windows it
   *  made and the whole windows its lost minutes would have made, so a run that lost nothing reads
   *  a hundred, whatever minutes a window carried over from the day before [TUNE]. */
  couldMake: number;
  /** The windows made of those, in per cent, under a hundred whenever one was lost, or null with no
   *  working minute of a contract. */
  efficiency: number | null;
  lost: LineLostMinutes;
  /** The days in it, and the working days among them. */
  days: number;
  workingDays: number;
}

/** The sum of some days of the book. */
function columnOf(days: readonly LineDay[]): LineColumn {
  const sum = (pick: (day: LineDay) => number): number => days.reduce((total, day) => total + pick(day), 0);
  const windows = sum((day) => day.windows);
  const turnover = sum((day) => day.turnover);
  const material = sum((day) => day.material);
  const engineers = sum((day) => day.engineers);
  const power = sum((day) => day.power);
  const cover = sum((day) => day.cover);
  // Whole windows: a fraction of a window lost is no window it could have made [TUNE].
  const couldMake = windows + Math.floor(sum((day) => day.lostWindows) + 1e-9);
  const possible = sum((day) => day.possibleMinutes);
  const share = couldMake <= 0 ? 0 : Math.round((100 * windows) / couldMake);
  return {
    windows,
    turnover,
    material,
    engineers,
    power,
    cover,
    net: turnover - material - engineers - power - cover,
    couldMake,
    efficiency: possible <= 0 || couldMake <= 0 ? null : windows < couldMake ? Math.min(99, share) : 100,
    lost: {
      engineer: sum((day) => day.lost.engineer),
      moving: sum((day) => day.lost.moving),
      timber: sum((day) => day.lost.timber),
      glass: sum((day) => day.lost.glass),
    },
    days: days.length,
    workingDays: days.filter((day) => isWorkingDay(day.day)).length,
  };
}

/** The four columns of the tab, the day in hand counted in each: today, this week, this month and
 *  this year, the weeks, months and years the Summary tab reads (CLAUDE.md T31 2.5). */
export function lineColumns(state: GameState): { today: LineColumn; week: LineColumn; month: LineColumn; year: LineColumn } {
  const line = state.windowLine;
  const day = state.clock.day;
  const all = [...line.days, line.today].filter((entry) => entry.day <= day);
  return {
    today: columnOf([line.today]),
    week: columnOf(all.filter((entry) => weekOfDay(entry.day) === weekOfDay(day))),
    month: columnOf(all.filter((entry) => monthOfDay(entry.day) === monthOfDay(day))),
    year: columnOf(all.filter((entry) => yearOfDay(entry.day) === yearOfDay(day))),
  };
}

/** True once the company has had the line standing: the tab is shown from then on (CLAUDE.md T31
 *  2.5) [TUNE]. */
export function lineHasStood(state: GameState): boolean {
  return state.windowLine.since.firstDay !== null;
}

/** An upgrade bought: its price into what the line has cost, kept when the upgrades go with a sale
 *  (CLAUDE.md T31 2.5). */
export function bookLineUpgrade(state: GameState, price: number): void {
  state.windowLine.since.upgrades += price;
}

/** The net of every day since the line first stood, the day in hand among them, and what it is
 *  of: the line and the upgrades bought for it (CLAUDE.md T31 2.5). */
export function linePaidBack(state: GameState): { net: number; cost: number; upgrades: number; share: number } {
  const since = state.windowLine.since;
  const today = columnOf([state.windowLine.today]);
  const net = since.turnover - since.material - since.engineers - since.power - since.cover + today.net;
  const cost = LINE_PRICE + since.upgrades;
  return { net, cost, upgrades: since.upgrades, share: Math.round((100 * net) / cost) };
}

/** The month's pace, from its days closed in the book, today's not among them, so a morning that
 *  has paid its day's costs and made nothing yet is not read as the month's (CLAUDE.md T31 2.5)
 *  [TUNE]: the windows and the net of a working day on average, and the year at the month's net
 *  over its days so far, to the nearest thousand. Null on a month's first day of the book. */
export function lineMonthPace(state: GameState): { windowsADay: number; netADay: number; year: number } | null {
  const day = state.clock.day;
  const closed = state.windowLine.days.filter((entry) => monthOfDay(entry.day) === monthOfDay(day) && entry.day < day);
  if (closed.length === 0) return null;
  const month = columnOf(closed);
  const working = Math.max(1, month.workingDays);
  return {
    windowsADay: month.windows / working,
    netADay: month.net / working,
    year: Math.round(((month.net / closed.length) * DAYS_PER_YEAR) / 1000) * 1000,
  };
}
