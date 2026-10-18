/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// A production line's own books, read off its own day book and never off the ledger [PIOTR,
// 11.10: "in a tab in the finances, the production line's account: the turnover, the materials, the
// engineers, the efficiency, the net profit, by the day and by the year"] (CLAUDE.md T31 2.5). The
// day book itself is written by `lineContract.ts`, which owns the line's state: a window as it is
// made, a working minute as it passes, and a calendar day's costs at its open. What is here only
// adds it up for the Accounting page's Production line tab, so the page computes nothing. From v93
// one set of books a line, and the lines added up (PIOTR, 12.10).

import { DAYS_PER_YEAR, LINE_KINDS, linePriceOf } from './constants';
import { isWorkingDay, monthOfDay, weekOfDay, yearOfDay } from './clock';
import { anyLineStandsWhole, lineKindOf, lineRecord } from './machines';
import type { GameState, LineDay, LineKind, LineLostMinutes } from './types';

/** One column of the Production line tab: the day book's records of a span added up, and the net
 *  profit, turnover less the four costs (CLAUDE.md T31 2.5). `windows` counts the units of every
 *  kind and `made` the units of each kind there are (v107). */
export interface LineColumn {
  windows: number;
  made: Partial<Record<LineKind, number>>;
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

/** A day of a line's book with the kind of the line it is of (v107). */
interface KindDay {
  record: LineDay;
  kind: LineKind;
}

/** The records of a span added up. */
function columnOf(days: readonly KindDay[]): LineColumn {
  const column: LineColumn = {
    windows: 0,
    made: {},
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
  for (const { record, kind } of days) {
    column.windows += record.windows;
    column.made[kind] = (column.made[kind] ?? 0) + record.windows;
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

/** The day in hand and every closed day of a line's book, the day in hand once, each with the
 *  line's kind; nothing for a line with no record. */
function records(state: GameState, line: number): KindDay[] {
  const record = lineRecord(state, line);
  if (record === null) return [];
  const today = record.today.day === state.clock.day ? [record.today] : [];
  return [...record.days.filter((entry) => entry.day !== state.clock.day), ...today].map((day) => ({
    record: day,
    kind: record.kind,
  }));
}

/** The four columns of these records. */
function booksOf(state: GameState, all: readonly KindDay[]): LineBooks {
  const day = state.clock.day;
  return {
    today: columnOf(all.filter(({ record }) => record.day === day)),
    week: columnOf(all.filter(({ record }) => weekOfDay(record.day) === weekOfDay(day))),
    month: columnOf(all.filter(({ record }) => monthOfDay(record.day) === monthOfDay(day))),
    year: columnOf(all.filter(({ record }) => yearOfDay(record.day) === yearOfDay(day))),
  };
}

/** A line's four columns, read off its own day book, whether or not the books are up to date
 *  (CLAUDE.md T31 2.5) [TUNE]. */
export function lineBooks(state: GameState, line: number): LineBooks {
  return booksOf(state, records(state, line));
}

/** Every line's four columns added up: the day books of all the lines together (v93). */
export function allLinesBooks(state: GameState): LineBooks {
  return booksOf(
    state,
    state.windowLines.flatMap((record) => records(state, record.number)),
  );
}

/** The lines the tab has books for: every line that has stood, sold or not, in order (v93). */
export function linesWithBooks(state: GameState): number[] {
  return state.windowLines.filter((record) => record.since.firstDay !== null).map((record) => record.number);
}

/** The tab is shown once the company has had a line standing, and from then on, the line sold
 *  or not (CLAUDE.md T31 2.5) [TUNE]. */
export function lineBooksShown(state: GameState): boolean {
  return anyLineStandsWhole(state) || linesWithBooks(state).length > 0;
}

/** This month's pace of a line: its windows and its net over its working days in the book, and a
 *  year at that pace, the month's net over its days in the book so far times the game's 360 [TUNE:
 *  chat]. Null while the month has no day of the line in it. */
export function lineMonthPace(state: GameState, line: number): { windowsPerDay: number; netPerDay: number; yearNet: number } | null {
  const month = records(state, line).filter(({ record }) => monthOfDay(record.day) === monthOfDay(state.clock.day));
  if (month.length === 0) return null;
  const column = columnOf(month);
  const working = month.filter(({ record }) => isWorkingDay(record.day)).length;
  return {
    windowsPerDay: working === 0 ? 0 : column.windows / working,
    netPerDay: working === 0 ? 0 : column.net / working,
    yearNet: (column.net / month.length) * DAYS_PER_YEAR,
  };
}

/** What a line has paid back: the net of every day since it first stood, the day in hand among
 *  them, over what the line and the upgrades bought for it cost, at its kind's prices (CLAUDE.md
 *  T31 2.5; v107). */
export function linePaidBack(state: GameState, line: number): { net: number; line: number; upgrades: number } {
  const record = lineRecord(state, line);
  const since = record?.since;
  const kind = lineKindOf(state, line);
  const net = since === undefined ? 0 : since.turnover - since.material - since.engineers - since.power - since.cover;
  const upgrades = (record?.upgrades ?? []).reduce(
    (total, upgrade) => total + (LINE_KINDS[kind].upgrades.find((spec) => spec.id === upgrade.id)?.price ?? 0),
    0,
  );
  return { net, line: linePriceOf(kind), upgrades };
}
