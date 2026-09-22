// A contract's machine wear is charged on the minutes at the machine only (PIOTR, 22.09;
// CLAUDE.md T24 2.4). It was charged on every minute of the piece, so a wardrobe front, which is
// cut at the saw and then finished away from it, paid the saw for minutes nobody spent at it.
// The card and the closing report read the one share, so a piece cannot cost the machine one
// thing before the term and another after it.

import { describe, expect, it } from 'vitest';
import { PRODUCTION_STAGES } from '../../src/engine/constants';
import {
  closingReport,
  contractPiece,
  contractPriceFor,
  contractResultFor,
  drawContract,
} from '../../src/engine/contracts';
import { machineWearPerMinute } from '../../src/engine/machines';
import type { Contract, GameState, Worker } from '../../src/engine/index';
import { newGame, placeEquipment, withExtraction } from '../helpers';

/** A hall with one standard saw and a contract for the piece named, at the worked out price. */
function hallWith(pieceId: string): { state: GameState; contract: Contract } {
  const state = withExtraction(newGame({ difficulty: 'veryEasy' }));
  placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 8, y: 4, id: 'kit-saw' });
  const contract = drawContract(state);
  contract.pieceId = pieceId;
  contract.pricePerPiece = contractPriceFor(contractPiece(contract));
  contract.quantityPerWeek = 100;
  state.contracts.push(contract);
  return { state, contract };
}

/** The share of a piece's minutes the first stage carries, off the game's own table. */
function cuttingShare(pieceId: string): number {
  const piece = contractPiece({ pieceId } as Contract);
  const shares = piece.stages.map(
    (stage) => PRODUCTION_STAGES.find((entry) => entry.id === stage)?.share ?? 0,
  );
  return (shares[0] ?? 0) / shares.reduce((sum, share) => sum + share, 0);
}

describe('the wear a contract charges', () => {
  it('leaves the cut sheet pack exactly where it was: it is all saw', () => {
    expect(cuttingShare('cutSheetPack')).toBe(1);
    const { state, contract } = hallWith('cutSheetPack');
    const result = contractResultFor(state, contract, null);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('a saw is wanted');
    // Every minute of the piece is a minute at the saw, so the figure is the old one to the pence.
    expect(result.wear).toBe(Math.round(result.minutes * machineWearPerMinute(saw) * 100) / 100);
    expect(result.machineName).toBe('Standard table saw');
  });

  it('charges a wardrobe front its cutting minutes and no others', () => {
    const { state, contract } = hallWith('wardrobeFront');
    const share = cuttingShare('wardrobeFront');
    expect(share).toBeLessThan(1);
    const result = contractResultFor(state, contract, null);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('a saw is wanted');
    expect(result.wear).toBe(
      Math.round(result.minutes * share * machineWearPerMinute(saw) * 100) / 100,
    );
    // And it is strictly less than the whole piece would have cost, which is the change.
    expect(result.wear).toBeLessThan(
      Math.round(result.minutes * machineWearPerMinute(saw) * 100) / 100,
    );
  });

  it('charges a piece made by hand nothing at all, and says so on the card', () => {
    const state = withExtraction(newGame({ difficulty: 'veryEasy' }));
    const contract = drawContract(state);
    contract.pieceId = 'wardrobeFront';
    contract.pricePerPiece = contractPriceFor(contractPiece(contract));
    const result = contractResultFor(state, contract, null);
    expect(result.machineName).toBe('');
    expect(result.wear).toBe(0);
  });

  it('closes the term on the same rule as the card', () => {
    const { state, contract } = hallWith('wardrobeFront');
    contract.labourMinutes = 6000;
    contract.piecesMade = 25;
    contract.revenue = 25 * contract.pricePerPiece;
    contract.materialCost = 25 * contractPiece(contract).material;
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('a saw is wanted');
    const report = closingReport(state, contract);
    expect(report.machineWear).toBe(
      Math.round(6000 * cuttingShare('wardrobeFront') * machineWearPerMinute(saw) * 100) / 100,
    );
    // The card's own figure a piece, multiplied out over the pieces the term made, lands on it.
    const perPiece = contractResultFor(state, contract, null as Worker | null);
    expect(report.machineWear / (perPiece.wear || 1)).toBeGreaterThan(0);
  });
});
