/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The company's holidays (PIOTR, 05.10: "after a year we add holidays: two weeks around Christmas,
// to 5 January (the costs run, only the people do not work), and two weeks in the summer, but that
// only in the second year"; CLAUDE.md T28 2.2). The calendar says which days are closed
// (`closureOf` in clock.ts) and the day loop steps over them as it steps over a weekend, paying
// their bills; this module is the two things it says to the player about them. On the first working
// day of December, and of July from 2026, a card with every date of the break, once a closure, and
// from that day to the last working day the warning strip's count of the days left; on the first
// day back, in place of the Weekend card, what the closed days cost.
//
// The card before is remembered by the closure's first day (`state.closureWarnedFor`), so it is said
// once, and on the next open of a save that came into the month without it.

import {
  closureAhead,
  dayMonthWords,
  formatCalendarDay,
  isWorkingDay,
  nextWorkingDay,
  previousWorkingDay,
  workingDaysBetween,
} from './clock';
import { queueEvent } from './events';
import { plural } from './text';
import type { Closure, ClosureSpan, GameState } from './types';

/** The closure's name as a sentence says it: `Christmas`, `summer`. */
export function closureWords(closure: Closure): string {
  return closure === 'christmas' ? 'Christmas' : 'summer';
}

/** The card's title: `Christmas break`, `Summer break`. */
export function closureTitle(closure: Closure): string {
  const words = closureWords(closure);
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} break`;
}

/** The first day back's title: `Back from the Christmas break`, `Back from the summer break`. */
export function backFromTitle(closure: Closure): string {
  return `Back from the ${closureWords(closure)} break`;
}

/** What the card before says, every date of it computed from the calendar (CLAUDE.md T28 2.2.1).
 *  An account under nought is told that the bank's count does not stop for the break. */
export function closureCardBody(span: ClosureSpan, cash: number): string {
  const overdrawn =
    cash < 0 ? " The account is overdrawn, and the bank's clock does not stop for the break." : '';
  return (
    `The workshop is closed from ${dayMonthWords(span.from)} to ${dayMonthWords(span.to)}. ` +
    'Nobody works; wages, rent and the bills are paid as always. ' +
    `The last working day is ${formatCalendarDay(previousWorkingDay(span.from))} and the first day ` +
    `back is ${formatCalendarDay(nextWorkingDay(span.to))}. ` +
    "A client's deadline does not count the closed days." +
    overdrawn
  );
}

/** The card before, raised at the open of a working day of the month it is told in, once for the
 *  closure: on that month's first working day, or on the next open of a save that came into the
 *  month without it.
 *  Queued after the tax's warning, so in December the tax is read first (CLAUDE.md T28 2.2.1). */
export function raiseClosureWarning(state: GameState): void {
  const day = state.clock.day;
  if (!isWorkingDay(day)) return;
  const ahead = closureAhead(day);
  if (ahead === null || state.closureWarnedFor === ahead.from) return;
  state.closureWarnedFor = ahead.from;
  queueEvent(state, {
    kind: 'closureComing',
    title: closureTitle(ahead.closure),
    body: closureCardBody(ahead, state.cash),
    data: { closure: ahead.closure, from: ahead.from, to: ahead.to },
  });
}

/** The warning strip's line from the card to the last working day before the closure, or null:
 *  `Closed from 22 December: 9 working days left`, today counted (CLAUDE.md T28 2.2.1)
 *  [TUNE: `1 working day left` on the last of them]. */
export function closureComingLine(state: GameState): string | null {
  const day = state.clock.day;
  const ahead = closureAhead(day);
  if (ahead === null || state.closureWarnedFor !== ahead.from) return null;
  const last = previousWorkingDay(ahead.from);
  if (day > last) return null;
  const left = workingDaysBetween(day, last) + (isWorkingDay(day) ? 1 : 0);
  return `Closed from ${dayMonthWords(ahead.from)}: ${plural(left, 'working day', 'working days')} left`;
}

/** The sentence the tax's December warning gains: the last day money can be spent is the last
 *  working day before Christmas (CLAUDE.md T28 2.2, item 5). Empty when no closure is ahead. */
export function lastDayToSpendSentence(day: number): string {
  const ahead = closureAhead(day);
  if (ahead === null || ahead.closure !== 'christmas') return '';
  return (
    `The workshop is closed from ${dayMonthWords(ahead.from)}, so the last day to spend is ` +
    `${formatCalendarDay(previousWorkingDay(ahead.from))}. `
  );
}
