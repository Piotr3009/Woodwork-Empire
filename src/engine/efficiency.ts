// Workshop efficiency (CLAUDE.md T13 3.5): one engine function computes the number and the five
// lines of its breakdown; the top bar and the day end print them.
//
// The number is the production minutes actually worked this day over the minutes the workshop
// could have worked with every hired person at a station, the owner counted while he is in
// (game.ts `possibleSeats` and `tallyEfficiency`, one call a production minute). The five lines
// are where the rest went, each a share of the lost minutes: a man the hall had no place for at
// the machine his work wanted is "no place" (CLAUDE.md T25 2.3), a rack that cannot supply is "no
// material", a job the hall stopped is "hall stopped", what the owner's absence took off every
// staff minute is "owner away", and a seat nobody stood at is "no people". A day nobody could
// have worked (possible 0) reads 100: nothing was lost, and the number erodes from there as the
// first seat goes empty.

import { monthOfDay } from './clock';
import { EFFICIENCY_CAUSES } from './constants';
import { monthRate } from './rate';
import type { EfficiencyStats, GameState, LostMinuteCause } from './types';

export interface EfficiencyLine {
  id: LostMinuteCause;
  label: string;
  minutes: number;
  /** Of the lost minutes, as a whole percentage. The lines add up to a hundred, or to nothing. */
  percent: number;
}

export interface Efficiency {
  percent: number;
  worked: number;
  possible: number;
  lost: number;
  lines: EfficiencyLine[];
}

export function emptyEfficiency(): EfficiencyStats {
  return { possible: 0, worked: 0, lost: { noPeople: 0, noPlace: 0, noMaterial: 0, hallStopped: 0, ownerAway: 0 } };
}

/** The ratio of production minutes actually worked this day to the minutes the workshop could
 *  have worked with every hired person at a station, and where the rest went, each cause a share
 *  of the lost minutes (CLAUDE.md T13 3.5). */
export function efficiencyOf(stats: EfficiencyStats): Efficiency {
  const lost = Math.max(0, stats.possible - stats.worked);
  const lines: EfficiencyLine[] = EFFICIENCY_CAUSES.map((cause) => ({
    id: cause.id,
    label: cause.label,
    minutes: stats.lost[cause.id],
    percent: 0,
  }));
  const causes = lines.reduce((sum, line) => sum + line.minutes, 0);
  if (causes > 0) {
    // Largest remainder, so the lines come to a hundred and never to ninety nine.
    const exact = lines.map((line) => (line.minutes / causes) * 100);
    let left = 100;
    lines.forEach((line, index) => {
      line.percent = Math.floor(exact[index] ?? 0);
      left -= line.percent;
    });
    const order = lines
      .map((line, index) => ({ index, remainder: (exact[index] ?? 0) - line.percent }))
      .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (const entry of order) {
      if (left <= 0) break;
      const line = lines[entry.index];
      if (line) line.percent += 1;
      left -= 1;
    }
  }
  const percent = stats.possible <= 0 ? 100 : Math.round((stats.worked / stats.possible) * 100);
  return { percent, worked: stats.worked, possible: stats.possible, lost, lines };
}

export function workshopEfficiency(state: GameState): Efficiency {
  return efficiencyOf(state.dayStats.efficiency);
}

/** The line that took the most of the lost minutes, for the one sentence the day end says about
 *  the number ("73%, mostly no place"); null when nothing was lost. Ties go to the first
 *  in the table's order. */
export function topCause(efficiency: Efficiency): EfficiencyLine | null {
  let top: EfficiencyLine | null = null;
  for (const line of efficiency.lines) {
    if (line.minutes <= 0) continue;
    if (top === null || line.minutes > top.minutes) top = line;
  }
  return top;
}

/** The month's own efficiency, for the Total efficiency section of the month end
 *  (CLAUDE.md T17 2.25). The day's stats are on every closed day, and nothing added them up
 *  before tonight: this is the fold, over the days of one month.
 *
 *  `percent` is the brief's own sum: the real work of the month over the hours it paid for,
 *  which is not the day's efficiency (worked over the seats the day could have filled) and is
 *  always the harsher of the two, because a day pays for eight hours whether it fills them or
 *  not. The waiting lines are the day's own causes, added up. */
export interface MonthEfficiency {
  month: number;
  days: number;
  /** Hours of real work: the people minutes actually put into the work, in hours. */
  workedHours: number;
  /** Hours the month paid for, worked or not. */
  paidHours: number;
  /** Real work over hours paid, as a whole percentage. */
  percent: number;
  /** The labour those hours earned, express uplift and all. */
  labour: number;
  /** What the hall multiplied the work by, averaged over the days of the month. */
  hallFactor: number;
  /** Where the minutes the workshop could have worked went, by cause. */
  waiting: EfficiencyLine[];
  waitingMinutes: number;
}

export function monthEfficiency(state: GameState, month: number): MonthEfficiency {
  const stats = emptyEfficiency();
  let workMinutes = 0;
  let hall = 0;
  let days = 0;
  for (const day of state.days) {
    if (monthOfDay(day.day) !== month) continue;
    days += 1;
    workMinutes += day.workMinutes;
    hall += day.hallFactor;
    stats.possible += day.efficiency.possible;
    stats.worked += day.efficiency.worked;
    for (const cause of EFFICIENCY_CAUSES) {
      stats.lost[cause.id] += day.efficiency.lost[cause.id];
    }
  }
  const folded = efficiencyOf(stats);
  const workedHours = Math.round((workMinutes / 60) * 10) / 10;
  // The labour of the month and the hours it paid for come off the rate's own fold, so the
  // section and the figure at the top of the report can never disagree (CLAUDE.md T17 2.26).
  const rate = monthRate(state, month);
  return {
    month,
    days,
    workedHours,
    paidHours: rate.paidHours,
    percent: rate.paidHours <= 0 ? 0 : Math.round((workMinutes / 60 / rate.paidHours) * 100),
    labour: rate.labour,
    hallFactor: days === 0 ? 1 : Math.round((hall / days) * 100) / 100,
    waiting: folded.lines,
    waitingMinutes: folded.lost,
  };
}
