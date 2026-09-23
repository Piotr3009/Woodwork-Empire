// @vitest-environment jsdom
// A contract says what the hall can make [PIOTR, 21.09: "we take a contract and we do not know
// whether the hall can do it"] (CLAUDE.md T25 2.7): the piece's minutes at the hall's pace for its
// family, the men who could have a place for it, and the working days of a week. One honest
// number, green when the hall keeps up and red when the term wants more, on the offer tile and on
// the Contracts tab's offer card, before the contract is signed. v51's men line stays under it.

import { describe, expect, it } from 'vitest';
import { MINUTES_PER_WORKING_DAY, WORKING_DAYS_PER_WEEK } from '../../src/engine/constants';
import {
  contractHallCapacity,
  contractHallLine,
  contractPiece,
  drawContract,
} from '../../src/engine/contracts';
import type { Contract, GameState } from '../../src/engine/index';
import { planPlaces } from '../../src/engine/production';
import { renderContracts } from '../../src/ui/contracts';
import { renderWorkPlan } from '../../src/ui/workPlan';
import { act, sixJoinersOnSheetWork } from '../helpers';

/** Six joiners, the saws named, and a cut sheet pack contract on offer wanting so many a week. */
function offered(saws: number, sawVariant: string, wanted: number): { state: GameState; contract: Contract } {
  const state = sixJoinersOnSheetWork({ saws, sawVariant });
  const contract = drawContract(state);
  contract.pieceId = 'cutSheetPack';
  contract.quantityPerWeek = wanted;
  contract.status = 'offered';
  state.contracts = [contract];
  return { state, contract };
}

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

describe('what the hall makes of a contract (CLAUDE.md T25 2.7)', () => {
  it('is the joiners the saw has places for, at their rates and the hall s pace, over a week', () => {
    const { state, contract } = offered(1, 'budget', 20);
    // One budget saw: one place, the first joiner hired, a novice at 0.6 and the budget pace 1.00.
    const minutes = Math.round(contractPiece(contract).minutes / 0.6);
    const week = MINUTES_PER_WORKING_DAY * WORKING_DAYS_PER_WEEK;
    expect(contractHallCapacity(state, contract).perWeek).toBe(Math.floor(week / minutes));
  });

  it('makes fewer in a one saw hall than in a three saw hall', () => {
    const one = offered(1, 'budget', 20);
    const three = offered(3, 'budget', 20);
    const small = contractHallCapacity(one.state, one.contract).perWeek;
    const big = contractHallCapacity(three.state, three.contract).perWeek;
    expect(small).toBeGreaterThan(0);
    expect(big).toBe(small * 3);
  });

  it('turns red when the term wants more than the hall makes, and green when it does not', () => {
    const { state, contract } = offered(1, 'budget', 20);
    const makes = contractHallCapacity(state, contract).perWeek;
    contract.quantityPerWeek = makes;
    expect(contractHallLine(state, contract)).toEqual({
      text: `Your hall makes about ${makes} of these a week at full crew; this term wants ${makes}`,
      hall: `Your hall makes about ${makes} of these a week at full crew`,
      wants: `this term wants ${makes}`,
      short: false,
    });
    contract.quantityPerWeek = makes + 1;
    expect(contractHallLine(state, contract).short).toBe(true);
  });

  it('falls when a saw is sold', () => {
    const { state, contract } = offered(2, 'budget', 20);
    const before = contractHallCapacity(state, contract).perWeek;
    const second = state.equipment.find((item) => item.id === 'kit-saw-2');
    if (second === undefined) throw new Error('the second saw is wanted');
    // A saw a man is at is not sold (CLAUDE.md T8 3.5): the men are taken off their jobs first.
    for (const worker of state.workers) worker.jobId = null;
    state.jobs = [];
    planPlaces(state);
    const sold = act(state, { type: 'SELL_MACHINE', equipmentId: second.id });
    expect(sold.equipment.find((item) => item.id === second.id)?.soldOnDay).not.toBeNull();
    const after = contractHallCapacity(sold, sold.contracts[0] ?? contract).perWeek;
    expect(after).toBeLessThan(before);
    expect(after * 2).toBe(before);
  });

  it('cuts faster with a better saw: the pace of 2.4 is in it', () => {
    const budget = offered(1, 'budget', 20);
    const industrial = offered(1, 'industrial', 20);
    // The industrial saw has three places and cuts at 1.12, so it is more than three budget places.
    expect(contractHallCapacity(industrial.state, industrial.contract).perWeek).toBeGreaterThan(
      contractHallCapacity(budget.state, budget.contract).perWeek * 3,
    );
  });
});

describe('the line on the cards, before the contract is signed (CLAUDE.md T25 2.7)', () => {
  it('is green on the offer tile and the Contracts tab when the hall keeps up', () => {
    const { state, contract } = offered(3, 'standard', 1);
    const words = contractHallLine(state, contract);
    for (const html of [renderContracts(state), renderWorkPlan(state, 'contracts')]) {
      const line = parse(html).querySelector('[data-hall-makes]');
      expect(line?.querySelector('.row-main')?.textContent).toBe(`${words.hall};`);
      // The figure is what the term wants, in the green the board's paper prints a row's figure in.
      const figure = line?.querySelector('.row-figure');
      expect(figure?.textContent).toBe(words.wants);
      expect(figure?.classList.contains('good')).toBe(true);
      expect(figure?.classList.contains('bad')).toBe(false);
    }
  });

  it('is red on both when the term wants more than the hall makes, with the men line kept', () => {
    const { state } = offered(1, 'used', 500);
    for (const html of [renderContracts(state), renderWorkPlan(state, 'contracts')]) {
      const figure = parse(html).querySelector('[data-hall-makes] .row-figure');
      expect(figure?.classList.contains('bad')).toBe(true);
      expect(figure?.textContent).toBe('this term wants 500');
    }
    // v51's line under it on the offer card: one says the hall, the other says the men.
    const card = parse(renderWorkPlan(state, 'contracts'));
    expect(card.querySelector('.contract-hands')?.textContent).toContain('at the least');
  });
});
