// Workshop efficiency (CLAUDE.md T13 3.5): one engine function computes the number and the four
// lines of its breakdown; the top bar prints them. Phase A: the function over the tallies the
// production minute keeps; phase B5 finishes it and the plate.

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
