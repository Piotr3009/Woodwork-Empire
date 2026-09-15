// Workshop efficiency (CLAUDE.md T13 3.5): one engine function computes the number and the four
// lines of its breakdown; the top bar and the day end print them.
//
// The number is the production minutes actually worked this day over the minutes the workshop
// could have worked with every hired person at a station, the owner counted while he is in
// (game.ts `possibleSeats` and `tallyEfficiency`, one call a production minute). The four lines
// are where the rest went, each a share of the lost minutes: a man waiting for a machine is "no
// machine free", a rack that cannot supply is "no material", what the owner's absence took off
// every staff minute is "owner away", and a seat nobody stood at is "no people". A day nobody
// could have worked (possible 0) reads 100: nothing was lost, and the number erodes from there as
// the first seat goes empty.

import { EFFICIENCY_CAUSES } from './constants';
import type { EfficiencyStats, GameState, LostMinuteCause } from './types';

export interface EfficiencyLine {
  id: LostMinuteCause;
  label: string;
  minutes: number;
  /** Of the lost minutes, as a whole percentage. The four add up to a hundred, or to nothing. */
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
  return { possible: 0, worked: 0, lost: { noPeople: 0, noMachine: 0, noMaterial: 0, ownerAway: 0 } };
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
    // Largest remainder, so the four come to a hundred and never to ninety nine.
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
 *  the number ("73%, mostly no machine free"); null when nothing was lost. Ties go to the first
 *  in the table's order. */
export function topCause(efficiency: Efficiency): EfficiencyLine | null {
  let top: EfficiencyLine | null = null;
  for (const line of efficiency.lines) {
    if (line.minutes <= 0) continue;
    if (top === null || line.minutes > top.minutes) top = line;
  }
  return top;
}
