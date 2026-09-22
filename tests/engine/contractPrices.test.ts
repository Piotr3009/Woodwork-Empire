// The price of a piece is worked out, never typed (PIOTR, 21.09; v40). At the entry point, an
// experienced joiner on the standard class of the piece's machine, a day of pieces leaves about
// CONTRACT_MARGIN_PER_DAY after his wages and the machine's wear; a better man or a better machine
// makes more pieces of the same price and keeps more, a worse one keeps less, the way a job goes.
// Piotr's words: "not a fixed figure, the way a normal job goes: more skill, more use of the
// machines, more money; but about 200 a day as the minimum, otherwise there is no point."

import { describe, expect, it } from 'vitest';
import {
  ANSWER_MAX,
  ANSWER_MIN,
  CONTRACT_MARGIN_PER_DAY,
  CONTRACT_PIECES,
  CONTRACT_QUANTITY_BANDS,
  CONTRACT_REFERENCE_CLASS,
  CONTRACT_REFERENCE_TIER,
  HIRING_SPECS,
  MINUTES_PER_WORKING_DAY,
  REPUTATION_MIN,
  SERVICE_COST_FRACTION,
  SERVICE_INTERVAL_MONTHS,
  MACHINE_HOURS_PER_MONTH,
  SHEET_VALUE,
  WORKER_RATES,
} from '../../src/engine/constants';
import {
  contractPiece,
  contractPriceFor,
  contractQuantityBand,
  contractReferenceFor,
  contractResultFor,
  drawContract,
  offerCarrier,
} from '../../src/engine/contracts';
import { findSpec, wearPerMinuteOf } from '../../src/engine/machines';
import type { Contract, GameState, Worker } from '../../src/engine/index';
import { newGame, placeEquipment, withExtraction } from '../helpers';

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A hall with one saw of this class and enough extraction for it, and a cut sheet pack contract
 *  at the entry point's price. */
function hallWith(sawClass: string): { state: GameState; contract: Contract } {
  const state = withExtraction(newGame({ difficulty: 'veryEasy' }));
  placeEquipment(state, 'tableSaw', { variantId: sawClass, x: 8, y: 4 });
  const contract = drawContract(state);
  contract.pieceId = 'cutSheetPack';
  contract.pricePerPiece = contractPriceFor(contractPiece(contract));
  contract.quantityPerWeek = 200;
  return { state, contract };
}

function joinerOf(tier: Exclude<Worker['tier'], null>): Worker {
  const spec = HIRING_SPECS.find((entry) => entry.role === 'joiner' && entry.tier === tier);
  if (spec === undefined) throw new Error(`no ${tier} joiner`);
  return { id: `staff-${tier}`, rate: WORKER_RATES[tier], monthlyWage: spec.monthlyWage, tier } as Worker;
}

describe('the price a piece (v40)', () => {
  it('carries no price in the table: the price is the entry point\'s, worked out', () => {
    for (const piece of CONTRACT_PIECES) {
      expect('price' in piece).toBe(false);
      expect('labour' in piece).toBe(false);
      expect(contractPriceFor(piece)).toBeGreaterThan(piece.material);
      expect(Number.isInteger(contractPriceFor(piece))).toBe(true);
    }
  });

  it('is the material, the entry man\'s wages, the entry machine\'s wear and the day\'s margin over his pieces', () => {
    const lines = CONTRACT_PIECES.map((piece) => {
      const reference = contractReferenceFor(piece);
      const expected = Math.round(
        piece.material + reference.labourCost + reference.wear + CONTRACT_MARGIN_PER_DAY / reference.piecesPerDay,
      );
      expect(contractPriceFor(piece)).toBe(expected);
      expect(reference.piecesPerDay).toBe(Math.floor(MINUTES_PER_WORKING_DAY / reference.minutes));
      return (
        `${piece.name}: ${reference.minutes} min at the entry point, £${piece.material} of material, ` +
        `£${reference.labourCost} of wages, £${reference.wear} of wear, ${reference.piecesPerDay} a day: ` +
        `£${contractPriceFor(piece)} a piece`
      );
    });
    console.log(`THE PRICE A PIECE\n${lines.join('\n')}`);
    expect(lines).toHaveLength(3);
  });

  it('reads the wear of a machine off the service rule: a tenth of its price every six months, over the hours a one man shop puts on it (v50)', () => {
    const saw = findSpec('tableSaw');
    const standard = saw?.variants.find((variant) => variant.id === CONTRACT_REFERENCE_CLASS);
    if (standard === undefined) throw new Error('no standard saw');
    expect(wearPerMinuteOf(standard.price)).toBeCloseTo(
      (standard.price * SERVICE_COST_FRACTION) / (SERVICE_INTERVAL_MONTHS * MACHINE_HOURS_PER_MONTH * 60),
      9,
    );
    // The cut sheet pack's reference wear is that saw over the entry man's minutes.
    const pack = contractPiece({ pieceId: 'cutSheetPack' } as Contract);
    const reference = contractReferenceFor(pack);
    expect(reference.wear).toBe(round(reference.minutes * wearPerMinuteOf(standard.price)));
  });

  it('leaves the entry man about the day\'s margin on the entry machine, and the ladder runs from a novice on a used saw to a master on an industrial one', () => {
    const entry = hallWith(CONTRACT_REFERENCE_CLASS);
    const entryMan = joinerOf(CONTRACT_REFERENCE_TIER);
    const entryResult = contractResultFor(entry.state, entry.contract, entryMan);
    // To the pound a piece: the price is rounded once, over the pieces of the day.
    expect(Math.abs(entryResult.dayResult - CONTRACT_MARGIN_PER_DAY)).toBeLessThanOrEqual(entryResult.piecesPerDay);
    expect(entryResult.wear).toBeGreaterThan(0);
    expect(entryResult.machineName.toLowerCase()).toContain('standard');
    const ladder: Array<[Exclude<Worker['tier'], null>, string]> = [
      ['novice', 'used'],
      ['experienced', 'standard'],
      ['senior', 'pro'],
      ['master', 'industrial'],
    ];
    const days = ladder.map(([tier, sawClass]) => {
      const { state, contract } = hallWith(sawClass);
      const result = contractResultFor(state, contract, joinerOf(tier));
      return { tier, sawClass, day: result.dayResult, pieces: result.piecesPerDay, margin: result.margin };
    });
    console.log(
      `A DAY OF CUT SHEET PACKS BY MAN AND SAW\n${days
        .map((row) => `${row.tier} on a ${row.sawClass} saw: ${row.pieces} pieces at £${row.margin}, £${row.day} a day`)
        .join('\n')}`,
    );
    // Every step up the ladder keeps more of the same price (PIOTR: "like a normal job").
    for (let step = 1; step < days.length; step += 1) {
      expect(days[step]?.day ?? 0).toBeGreaterThan(days[step - 1]?.day ?? 0);
    }
    // The bottom rung is under the entry point and the top well over it.
    expect(days[0]?.day ?? 0).toBeLessThan(CONTRACT_MARGIN_PER_DAY);
    expect(days[3]?.day ?? 0).toBeGreaterThan(CONTRACT_MARGIN_PER_DAY * 1.5);
  });

  it('asks for more pieces a week the better the workshop\'s name', () => {
    const first = CONTRACT_QUANTITY_BANDS[0];
    const last = CONTRACT_QUANTITY_BANDS[CONTRACT_QUANTITY_BANDS.length - 1];
    if (first === undefined || last === undefined) throw new Error('no bands');
    expect(contractQuantityBand(REPUTATION_MIN)).toEqual(first);
    expect(contractQuantityBand(0)).toEqual(first);
    expect(contractQuantityBand(last.from + 20)).toEqual(last);
    let previous = 0;
    for (const band of CONTRACT_QUANTITY_BANDS) {
      expect(band.max).toBeGreaterThanOrEqual(band.min);
      expect(band.min).toBeGreaterThanOrEqual(previous);
      previous = band.min;
      expect(contractQuantityBand(band.from)).toEqual(band);
    }
    // A shop with a name is asked for more: the draw with the high standing lands above the
    // low band's ceiling on most days.
    let above = 0;
    for (let day = 1; day <= 60; day += 1) {
      const state = newGame({ seed: day });
      state.reputation = last.from + 10;
      state.clock.day = day;
      const contract = drawContract(state, offerCarrier(state));
      if (contract.pieceId !== 'cutSheetPack') continue;
      expect(contract.quantityPerWeek).toBeGreaterThanOrEqual(last.min);
      expect(contract.quantityPerWeek).toBeLessThanOrEqual(last.max);
      if (contract.quantityPerWeek > first.max) above += 1;
    }
    expect(above).toBeGreaterThan(0);
  });

  it('lets the client answer inside the one band, and a good name is offered more on average than a poor one', () => {
    const pack = contractPiece({ pieceId: 'cutSheetPack' } as Contract);
    const asked = contractPriceFor(pack);
    const average = (reputation: number): number => {
      let total = 0;
      let count = 0;
      for (let day = 1; day <= 120; day += 1) {
        const state = newGame({ seed: 7 });
        state.reputation = reputation;
        state.clock.day = day;
        const contract = drawContract(state, offerCarrier(state));
        if (contract.pieceId !== 'cutSheetPack') continue;
        expect(contract.pricePerPiece).toBeGreaterThanOrEqual(Math.floor(asked * ANSWER_MIN));
        expect(contract.pricePerPiece).toBeLessThanOrEqual(Math.ceil(asked * ANSWER_MAX));
        total += contract.pricePerPiece;
        count += 1;
      }
      return count === 0 ? 0 : total / count;
    };
    const poor = average(REPUTATION_MIN);
    const good = average(80);
    console.log(`THE CLIENT'S ANSWER ON A PACK ASKED AT £${asked}: poor name £${round(poor)}, good name £${round(good)}`);
    expect(good).toBeGreaterThan(poor);
  });

  it('costs every piece at the sheets it actually draws off the rack', () => {
    for (const piece of CONTRACT_PIECES) {
      expect(Math.abs(piece.sheets * SHEET_VALUE - piece.material)).toBeLessThanOrEqual(1);
    }
  });

  it('makes the wardrobe front four hours of work and not three days', () => {
    const front = contractPiece({ pieceId: 'wardrobeFront' } as Contract);
    expect(front.minutes).toBe(4 * 60);
    expect(front.minutes).toBeLessThan(MINUTES_PER_WORKING_DAY);
  });
});
