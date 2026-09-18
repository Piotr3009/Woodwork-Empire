// The prices that pay (PIOTR: "a contract is worse than a job, better than the wage, and rewards
// machines"; CLAUDE.md T20 2.2). The three pieces are priced so that a piece made by hand lands
// near 25 pounds an hour of margin, between the joiner's wage of about 14 an hour and the 40 a
// job earns, and so that machines take it to 40 and beyond.
//
// The margin an hour by hand is the brief's own table, column by column: the price less the
// material in the piece, over the hours the piece takes a man working at the owner's rate, which
// is what "by hand" means. It is the gross the workshop makes an hour before the wage is taken
// off it, which is why the band is above a joiner's 14 and below a job's 40.

import { describe, expect, it } from 'vitest';
import { CONTRACT_PIECES, MINUTES_PER_WORKING_DAY, WORKER_RATES } from '../../src/engine/constants';
import { contractPiece, contractResultFor, drawContract } from '../../src/engine/contracts';
import type { Contract, GameState, Worker } from '../../src/engine/index';
import { buyStartingKit, newGame } from '../helpers';

/** The band of CLAUDE.md T20 2.2 [TUNE: 22 to 30, the brief's own]. */
const MARGIN_AN_HOUR_MIN = 22;
const MARGIN_AN_HOUR_MAX = 30;

function marginAnHour(piece: { price: number; material: number; minutes: number }): number {
  return ((piece.price - piece.material) * 60) / piece.minutes;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

describe('the prices that pay (CLAUDE.md T20 2.2)', () => {
  it('lands every piece between 22 and 30 pounds an hour of margin by hand, and prints the three', () => {
    const lines = CONTRACT_PIECES.map((piece) => {
      const margin = piece.price - piece.material;
      const perHour = marginAnHour(piece);
      // The piece's own labour field is what the workshop earned by making it, and it is the
      // margin by hand: the table is one set of figures and not two (CLAUDE.md T17 2.26).
      expect(piece.labour).toBe(margin);
      expect(perHour).toBeGreaterThanOrEqual(MARGIN_AN_HOUR_MIN);
      expect(perHour).toBeLessThanOrEqual(MARGIN_AN_HOUR_MAX);
      return (
        `${piece.name}: ${piece.minutes} min by hand, £${piece.price} a piece, ` +
        `£${piece.material} of material, £${margin} of margin, ` +
        `£${round(perHour)} an hour`
      );
    });
    // Printed on one line apiece for REPORT-T20.md, the cross check of CLAUDE.md T20 7.
    console.log(`MARGIN AN HOUR BY HAND\n${lines.join('\n')}`);
    expect(lines).toHaveLength(3);
    // The three figures themselves, so a price that moves has to move this test with it.
    expect(round(marginAnHour(contractPiece({ pieceId: 'cutSheetPack' } as Contract)))).toBe(26.67);
    expect(round(marginAnHour(contractPiece({ pieceId: 'drawerBox' } as Contract)))).toBe(26);
    expect(round(marginAnHour(contractPiece({ pieceId: 'wardrobeFront' } as Contract)))).toBe(25);
  });

  it('makes the wardrobe front four hours of work and not three days', () => {
    const front = contractPiece({ pieceId: 'wardrobeFront' } as Contract);
    expect(front.minutes).toBe(4 * 60);
    expect(front.minutes).toBeLessThan(MINUTES_PER_WORKING_DAY);
    expect(front.minutes).toBeLessThan(3 * MINUTES_PER_WORKING_DAY);
  });

  it('leaves every tier a margin with a saw in the hall, and the top man nothing without one', () => {
    // The man's own result: the price less the material and less what his minutes cost, which is
    // the margin the offer card puts on his row (CLAUDE.md T20 2.1.1). The wage ladder is steeper
    // than the speed ladder, so the line thins as the tier rises, and in an empty hall, where
    // every piece is made by hand at two thirds speed, the extremely experienced man ends at
    // nothing. One used saw is enough to put all four above water, which is the table doing what
    // Piotr asked of it: a contract pays a little by hand and well with machines (T20 2.2).
    const tiers: Array<[Exclude<Worker['tier'], null>, number]> = [
      ['novice', 450],
      ['experienced', 600],
      ['senior', 800],
      ['master', 1000],
    ];
    const packs = (state: GameState): Contract => {
      const contract = drawContract(state);
      contract.pieceId = 'cutSheetPack';
      contract.pricePerPiece = 50;
      contract.quantityPerWeek = 40;
      return contract;
    };
    const byHand = newGame();
    const hall = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const lines: string[] = [];
    for (const [tier, weekly] of tiers) {
      const worker = { id: `staff-${tier}`, rate: WORKER_RATES[tier], weeklyWage: weekly } as Worker;
      const bare = contractResultFor(byHand, packs(byHand), worker);
      const sawn = contractResultFor(hall, packs(hall), worker);
      expect(bare.margin).toBeGreaterThanOrEqual(0);
      expect(sawn.margin).toBeGreaterThan(0);
      expect(sawn.weekResult).toBeGreaterThan(0);
      lines.push(
        `${tier}: by hand ${bare.minutes} min a piece, margin £${bare.margin}; ` +
          `with the used saw ${sawn.minutes} min, margin £${sawn.margin}`,
      );
    }
    console.log(`A CUT SHEET PACK BY TIER\n${lines.join('\n')}`);
  });
});
