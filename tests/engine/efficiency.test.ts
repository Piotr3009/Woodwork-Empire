// Workshop efficiency: one engine function computes the number and the lines of its breakdown,
// each a share of the lost minutes (PIOTR: "without the breakdown it is just a pretty number";
// CLAUDE.md T13 3.5). The number is worked over possible; the five lines sum to the lost minutes
// and their percentages to a hundred; a day nobody could have worked reads 100. From v52 the
// queue's line is `noPlace` and means that and only that, and a job the hall stopped has a line
// of its own (CLAUDE.md T25 2.3).

import { describe, expect, it } from 'vitest';
import { EFFICIENCY_CAUSES } from '../../src/engine/constants';
import { efficiencyOf, emptyEfficiency, topCause, workshopEfficiency } from '../../src/engine/efficiency';
import { dayMinutesByCategory } from '../../src/engine/index';
import type { EfficiencyStats, GameState } from '../../src/engine/index';
import type { LostMinuteCause } from '../../src/engine/types';
import { runClock, twoMenOnSheetWork, withOnlyCuttingLeft } from '../helpers';

interface PartialStats {
  possible?: number;
  worked?: number;
  lost?: Partial<Record<LostMinuteCause, number>>;
}

function stats(partial: PartialStats): EfficiencyStats {
  const base = emptyEfficiency();
  return {
    possible: partial.possible ?? base.possible,
    worked: partial.worked ?? base.worked,
    lost: { ...base.lost, ...(partial.lost ?? {}) },
  };
}

/** The minutes the day meters show as workshop: the owner's workshop band and every joiner's
 *  production minutes (CLAUDE.md T13 10.3). */
function meterMinutes(state: GameState): number {
  const owner =
    dayMinutesByCategory(state.owner.dayLog).find((part) => part.category === 'workshop')
      ?.minutes ?? 0;
  const joiners = state.workers
    .filter((worker) => worker.role === 'joiner')
    .reduce((sum, worker) => sum + worker.productionMinutes, 0);
  return owner + joiners;
}

describe('the number', () => {
  it('is the production minutes worked over the minutes the workshop could have worked', () => {
    const found = efficiencyOf(stats({ possible: 400, worked: 292, lost: { noPeople: 108 } }));
    expect(found.percent).toBe(73);
    expect(found.worked).toBe(292);
    expect(found.possible).toBe(400);
    expect(found.lost).toBe(108);
  });

  it('reads 100 on a day nobody could have worked: nothing was lost', () => {
    const found = efficiencyOf(emptyEfficiency());
    expect(found.percent).toBe(100);
    expect(found.lost).toBe(0);
    expect(found.lines.every((line) => line.minutes === 0 && line.percent === 0)).toBe(true);
  });

  it('never goes above 100 or below 0, whatever the tallies', () => {
    expect(efficiencyOf(stats({ possible: 100, worked: 100 })).percent).toBe(100);
    expect(efficiencyOf(stats({ possible: 100, worked: 0, lost: { noPeople: 100 } })).percent).toBe(0);
  });
});

describe('the five lines', () => {
  it('are the five causes of the table, in its order, with its labels', () => {
    const found = efficiencyOf(emptyEfficiency());
    expect(found.lines.map((line) => line.id)).toEqual(EFFICIENCY_CAUSES.map((cause) => cause.id));
    expect(found.lines.map((line) => line.label)).toEqual([
      'No people',
      'No place',
      'No material',
      'Hall stopped',
      'Owner away',
    ]);
  });

  it('sum to the lost minutes and their percentages to a hundred', () => {
    const found = efficiencyOf(
      stats({
        possible: 480,
        worked: 380,
        lost: { noPeople: 33, noPlace: 33, noMaterial: 34, hallStopped: 0, ownerAway: 0 },
      }),
    );
    expect(found.lost).toBe(100);
    expect(found.lines.reduce((sum, line) => sum + line.minutes, 0)).toBe(found.lost);
    expect(found.lines.map((line) => line.percent)).toEqual([33, 33, 34, 0, 0]);
    expect(found.lines.reduce((sum, line) => sum + line.percent, 0)).toBe(100);
  });

  it('come to a hundred by the largest remainder, never to ninety nine', () => {
    // Three equal thirds: 33.3 each, and one of them is given the odd point.
    const found = efficiencyOf(
      stats({ possible: 300, worked: 0, lost: { noPeople: 100, noPlace: 100, noMaterial: 100 } }),
    );
    expect(found.lines.reduce((sum, line) => sum + line.percent, 0)).toBe(100);
    expect(found.lines.map((line) => line.percent).sort()).toEqual([0, 0, 33, 33, 34]);
    // Fractional minutes, as the owner away line books them, come to a hundred as well.
    const fractional = efficiencyOf(
      stats({ possible: 10, worked: 7.3, lost: { ownerAway: 2.1, noPlace: 0.6 } }),
    );
    expect(fractional.lines.reduce((sum, line) => sum + line.percent, 0)).toBe(100);
  });

  it('names the cause that took the most, or nothing when nothing was lost', () => {
    const quiet = efficiencyOf(stats({ possible: 100, worked: 100 }));
    expect(topCause(quiet)).toBeNull();
    const busy = efficiencyOf(
      stats({ possible: 100, worked: 40, lost: { noPeople: 10, noPlace: 45, noMaterial: 5 } }),
    );
    expect(topCause(busy)?.id).toBe('noPlace');
    // A tie goes to the first of the table.
    const tied = efficiencyOf(stats({ possible: 100, worked: 80, lost: { noMaterial: 10, ownerAway: 10 } }));
    expect(topCause(tied)?.id).toBe('noMaterial');
  });
});

describe('on a played day, off the tally the production minute keeps', () => {
  it('reads 100 with two men each at his own saw, and the worked minutes are the meters', () => {
    const state = runClock(twoMenOnSheetWork(), 200);
    const found = workshopEfficiency(state);
    expect(found).toEqual(efficiencyOf(state.dayStats.efficiency));
    expect(found.percent).toBe(100);
    expect(found.possible).toBe(400);
    expect(found.worked).toBe(400);
    expect(found.worked).toBe(meterMinutes(state));
  });

  it('books a man the one saw has no place for as no place, and nothing else', () => {
    // Two men, one budget saw of one place, both jobs at their cutting (CLAUDE.md T25 2.3).
    const start = withOnlyCuttingLeft(twoMenOnSheetWork({ saws: 1, sawVariant: 'budget' }));
    const state = runClock(start, 200);
    const found = workshopEfficiency(state);
    expect(found.percent).toBe(50);
    expect(found.lost).toBe(200);
    expect(found.lines.find((line) => line.id === 'noPlace')?.minutes).toBe(200);
    expect(found.lines.find((line) => line.id === 'noPlace')?.percent).toBe(100);
    expect(found.worked).toBe(meterMinutes(state));
  });

  it('books what the absence takes off every staff minute as owner away, and drops his seat', () => {
    const start = twoMenOnSheetWork();
    start.owner.present = false;
    const state = runClock(start, 100);
    const found = workshopEfficiency(state);
    // The owner is not counted while he is out: one seat, the joiner's.
    expect(found.possible).toBe(100);
    expect(found.percent).toBe(70);
    const away = found.lines.find((line) => line.id === 'ownerAway');
    expect(away?.minutes).toBeCloseTo(30, 6);
    expect(away?.percent).toBe(100);
    // The meters show the joiner's hundred minutes; the efficiency counts them at the absence
    // factor, and the difference is exactly the owner away line (CLAUDE.md T13 10.3).
    expect(found.worked + (away?.minutes ?? 0)).toBeCloseTo(meterMinutes(state), 6);
  });
});
