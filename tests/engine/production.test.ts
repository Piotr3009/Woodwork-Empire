// The minute of production: one arithmetic for the day and the night (CLAUDE.md T13 3.9, 10.3),
// and the hands the day and the night each list.

import { describe, expect, it } from 'vitest';
import { OWNER } from '../../src/engine/machines';
import { WAITING_FOR_MATERIAL, canWorkOn, hands, jobOf, workMinute } from '../../src/engine/production';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import { sixJoinersOnSheetWork, twoMenOnSheetWork } from '../helpers';

function copyOf(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

describe('one arithmetic for the day and the night', () => {
  it('a minute by workMinute is the minute the clock works, job for job and machine for machine', () => {
    const state = sixJoinersOnSheetWork();
    const byClock = tick(state, 1);
    const byHand = copyOf(state);
    const report = workMinute(byHand, hands(byHand));
    expect(byHand.jobs.map((job) => job.labourRemaining)).toEqual(
      byClock.jobs.map((job) => job.labourRemaining),
    );
    expect(byHand.jobs.map((job) => job.productionMinutes)).toEqual(
      byClock.jobs.map((job) => job.productionMinutes),
    );
    expect(byHand.equipment.map((item) => item.hoursUsed)).toEqual(
      byClock.equipment.map((item) => item.hoursUsed),
    );
    expect(byHand.dayStats.dustM3).toBe(byClock.dayStats.dustM3);
    expect(byHand.dust).toBe(byClock.dust);
    expect(byHand.bagFillM3).toBe(byClock.bagFillM3);
    // What the tally read as worked is what the report says was worked.
    expect(report.worked).toBe(byClock.dayStats.efficiency.worked);
    expect(report.finished).toEqual([]);
    expect(byHand.jobs.every((job) => job.nightMinutes === 0)).toBe(true);
  });

  it('with the owner at his bench too, his minute is a workshop minute on his own meter', () => {
    const state = twoMenOnSheetWork();
    const byClock = tick(state, 1);
    const byHand = copyOf(state);
    const working = hands(byHand);
    expect(working[0]?.who).toBe(OWNER);
    workMinute(byHand, working);
    expect(byHand.owner.dayLog).toEqual(byClock.owner.dayLog);
    expect(byHand.owner.minutesWorked).toBe(byClock.owner.minutesWorked);
    expect(byHand.jobs.map((job) => job.labourRemaining)).toEqual(
      byClock.jobs.map((job) => job.labourRemaining),
    );
  });

  it('writes a night minute on the job and on the day when told it is night', () => {
    const state = sixJoinersOnSheetWork();
    const report = workMinute(state, hands(state), { night: true });
    expect(report.worked).toBeGreaterThan(0);
    for (const hand of hands(state)) {
      expect(hand.job.nightMinutes).toBe(1);
      expect(hand.job.productionMinutes).toBe(1);
    }
    expect(state.dayStats.nightMinutes).toBe(hands(state).length);
  });

  it('says why a man could not work, the rack before nothing else', () => {
    const state = sixJoinersOnSheetWork();
    state.stock.sheets = 0;
    const job = jobOf(state, 'staff-1');
    if (!job) throw new Error('no job');
    job.sheetsReserved = 0;
    job.sheetsUsed = 0;
    expect(canWorkOn(state, job)).toBe(false);
    expect(job.blockedBy).toBe(WAITING_FOR_MATERIAL);
    const report = workMinute(state, hands(state).filter((hand) => hand.who === 'staff-1'));
    expect(report.noMaterial).toBe(true);
    expect(report.lost.noMaterial).toBe(1);
    expect(report.worked).toBe(0);
  });
});

describe('the hands of each shift', () => {
  it('lists the day men with no shift named, and nobody at night while nobody is on it', () => {
    const state = sixJoinersOnSheetWork();
    expect(hands(state)).toHaveLength(6);
    expect(hands(state, { shift: 'night' })).toHaveLength(0);
    expect(hands(state, { staff: false })).toHaveLength(0);
  });
});
