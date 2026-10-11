/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The production line's own books, read off its own day book and never off the ledger [PIOTR,
// 11.10: "in a tab in the finances, the production line's account: the turnover, the materials, the
// engineers, the efficiency, the net profit, by the day and by the year"] (CLAUDE.md T31 2.5). The
// day book itself is written by `lineContract.ts`, which owns the line's state: a window as it is
// made, a working minute as it passes, and a calendar day's costs at its open. What is here only
// adds it up for the Accounting page's Production line tab, so the page computes nothing.

import { DAYS_PER_YEAR, LINE_PRICE, LINE_UPGRADES } from './constants';
import { isWorkingDay, monthOfDay, weekOfDay, yearOfDay } from './clock';
import { lineStandsWhole } from './machines';
import type { GameState, LineDay, LineLostMinutes } from './types';

/** One column of the Production line tab: the day book's records of a span added up, and the net
 *  profit, turnover less the four costs (CLAUDE.md T31 2.5). */
export interface LineColumn {
  windows: number;
  turnover: number;
  material: number;
  engineers: number;
  power: number;
  cover: number;
  net: number;
  possibleMinutes: number;
  possibleWindows: number;
  lost: LineLostMinutes;
}

/** The four columns of the tab, Today, This week, This month and This year (the company's own 360
 *  day year, as the Summary's), each the day in hand and the closed days of its span. */
export interface LineBooks {
  today: LineColumn;
  week: LineColumn;
  month: LineColumn;
  year: LineColumn;
}

function emptyLost(): LineLostMinutes {
  return { engineer: 0, timber: 0, glass: 0, timberAndGlass: 0, move: 0 };
}

/** The records of a span added up. */
function columnOf(records: readonly LineDay[]): LineColumn {
  const column: LineColumn = {
    windows: 0,
    turnover: 0,
    material: 0,
    engineers: 0,
    power: 0,
    cover: 0,
    net: 0,
    possibleMinutes: 0,
    possibleWindows: 0,
    lost: emptyLost(),
  };
  for (const record of records) {
    column.windows += record.windows;
    column.turnover += record.turnover;
    column.material += record.material;
    column.engineers += record.engineers;
    column.power += record.power;
    column.cover += record.cover;
    column.possibleMinutes += record.possibleMinutes;
    column.possibleWindows += record.possibleWindows;
    for (const cause of Object.keys(column.lost) as Array<keyof LineLostMinutes>) column.lost[cause] += record.lost[cause];
  }
  column.net = column.turnover - column.material - column.engineers - column.power - column.cover;
  return column;
}

/** The day in hand and every closed day of the book, the day in hand once. */
function records(state: GameState): LineDay[] {
  const line = state.windowLine;
  const today = line.today.day === state.clock.day ? [line.today] : [];
  return [...line.days.filter((record) => record.day !== state.clock.day), ...today];
}

/** The four columns, read off the line's own day book, whether or not the books are up to date
 *  (CLAUDE.md T31 2.5) [TUNE]. */
export function lineBooks(state: GameState): LineBooks {
  const day = state.clock.day;
  const all = records(state);
  return {
    today: columnOf(all.filter((record) => record.day === day)),
    week: columnOf(all.filter((record) => weekOfDay(record.day) === weekOfDay(day))),
    month: columnOf(all.filter((record) => monthOfDay(record.day) === monthOfDay(day))),
    year: columnOf(all.filter((record) => yearOfDay(record.day) === yearOfDay(day))),
  };
}

/** The tab is shown once the company has had the line standing, and from then on, the line sold
 *  or not (CLAUDE.md T31 2.5) [TUNE]. */
export function lineBooksShown(state: GameState): boolean {
  return lineStandsWhole(state) || state.windowLine.since.firstDay !== null;
}

/** This month's pace: its windows and its net over its working days in the book, and a year at that
 *  pace, the month's net over its days in the book so far times the game's 360 [TUNE: chat]. Null
 *  while the month has no day of the line in it. */
export function lineMonthPace(state: GameState): { windowsPerDay: number; netPerDay: number; yearNet: number } | null {
  const month = records(state).filter((record) => monthOfDay(record.day) === monthOfDay(state.clock.day));
  if (month.length === 0) return null;
  const column = columnOf(month);
  const working = month.filter((record) => isWorkingDay(record.day)).length;
  return {
    windowsPerDay: working === 0 ? 0 : column.windows / working,
    netPerDay: working === 0 ? 0 : column.net / working,
    yearNet: (column.net / month.length) * DAYS_PER_YEAR,
  };
}

/** What the line has paid back: the net of every day since it first stood, the day in hand among
 *  them, over what the line and the upgrades bought for it cost (CLAUDE.md T31 2.5). */
export function linePaidBack(state: GameState): { net: number; line: number; upgrades: number } {
  const since = state.windowLine.since;
  const net = since.turnover - since.material - since.engineers - since.power - since.cover;
  const upgrades = state.windowLine.upgrades.reduce(
    (total, upgrade) => total + (LINE_UPGRADES.find((spec) => spec.id === upgrade.id)?.price ?? 0),
    0,
  );
  return { net, line: LINE_PRICE, upgrades };
}
