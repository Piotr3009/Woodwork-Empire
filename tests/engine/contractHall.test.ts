// @vitest-environment jsdom
// A contract says what the hall can make [PIOTR, 21.09: "we take a contract and we do not know
// whether the hall can do it"] (CLAUDE.md T25 2.7): the piece's minutes at the hall's pace for its
// family, every joiner on the books, what the saws too few for the crew take off the whole hall,
// and the working days of a week. Nobody waits for a place from v53, so no joiner is left out of it
// and a hall short of saws says so through the shortage factor and not through a cap (PIOTR, 24.09;
// v53). One honest number, green when the hall keeps up and red when the term wants more, on the
// offer tile and on the Contracts tab's offer card, before the contract is signed. v51's men line
// stays under it.

import { describe, expect, it } from 'vitest';
import { BY_HAND_DURATION_FACTOR, MINUTES_PER_WORKING_DAY, WORKING_DAYS_PER_WEEK } from '../../src/engine/constants';
import {
  contractHallCapacity,
  contractHallLine,
  contractPiece,
  drawContract,
} from '../../src/engine/contracts';
import type { Contract, GameState } from '../../src/engine/index';
import { hallPace, placeShortages } from '../../src/engine/machines';
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

/** The week of every joiner on the books, by the arithmetic of 2.7: his minutes over a piece at his
 *  rate, the hall's pace for the saw and the factor the saws too few for the crew leave the hall,
 *  rounded the way his card rounds them, and as many of them as a week holds. */
function crewWeek(state: GameState, contract: Contract, factor: number): number {
  const week = MINUTES_PER_WORKING_DAY * WORKING_DAYS_PER_WEEK;
  const pace = hallPace(state, 'tableSaw');
  return state.workers.reduce((total, worker) => {
    const minutes = Math.max(1, Math.round(contractPiece(contract).minutes / (worker.rate * pace * factor)));
    return total + Math.floor(week / minutes);
  }, 0);
}

/** What the saws too few for the crew leave of every minute of the hall: the men past the places
 *  work at the by hand pace (PIOTR, 24.09; v53). */
function shortage(places: number, men: number): number {
  return (places + (men - places) / BY_HAND_DURATION_FACTOR) / men;
}

describe('what the hall makes of a contract (CLAUDE.md T25 2.7)', () => {
  it('counts every joiner on the books, at his rate, the hall s pace and what too few saws take off', () => {
    const { state, contract } = offered(1, 'budget', 20);
    // One budget saw: one place for a crew of seven, the owner and six joiners with no experience.
    // Nobody waits for the saw from v53, so all six count, and the six past its one place work at
    // the by hand pace: the hall's minute is (1 + 6 / 1.5) / 7 of itself, 0.71 (PIOTR, 24.09; v53).
    const [short] = placeShortages(state);
    expect(short).toMatchObject({ family: 'tableSaw', places: 1, men: 7, over: 6 });
    expect(short?.factor).toBeCloseTo(shortage(1, 7), 10);
    // A piece of 45 of the owner's minutes is 105 of a novice's at 0.6, the budget pace 1.00 and
    // the 0.71: 22 a week each and 132 for the six. v52 counted only the one man the saw had a
    // place for, 75 minutes a piece and 32 a week (PIOTR, 24.09; v53).
    const minutes = Math.round(contractPiece(contract).minutes / (0.6 * shortage(1, 7)));
    expect(minutes).toBe(105);
    const week = MINUTES_PER_WORKING_DAY * WORKING_DAYS_PER_WEEK;
    expect(contractHallCapacity(state, contract).perWeek).toBe(6 * Math.floor(week / minutes));
    expect(contractHallCapacity(state, contract).perWeek).toBe(132);
  });

  it('makes fewer in a one saw hall than in a three saw hall, through the shortage and not a cap', () => {
    const one = offered(1, 'budget', 20);
    const three = offered(3, 'budget', 20);
    // The same six men in both halls: one place leaves six of the seven by hand, three places four
    // of them, so the one saw hall's minute is 0.71 of itself and the three saw hall's 0.81. v52
    // capped the men at the places and read 32 against 96, three times over (PIOTR, 24.09; v53).
    expect(placeShortages(one.state)[0]?.factor).toBeCloseTo(shortage(1, 7), 10);
    expect(placeShortages(three.state)[0]?.factor).toBeCloseTo(shortage(3, 7), 10);
    const small = contractHallCapacity(one.state, one.contract).perWeek;
    const big = contractHallCapacity(three.state, three.contract).perWeek;
    expect(small).toBe(crewWeek(one.state, one.contract, shortage(1, 7)));
    expect(big).toBe(crewWeek(three.state, three.contract, shortage(3, 7)));
    expect(small).toBe(132);
    expect(big).toBe(150);
    expect(small).toBeLessThan(big);
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
    // Two places for the seven are 0.76 of the hall's minute and 144 a week; one place is 0.71
    // and 132. v52 halved it with the places, 64 to 32 (PIOTR, 24.09; v53).
    expect(placeShortages(sold)[0]?.places).toBe(1);
    expect(before).toBe(144);
    expect(after).toBe(132);
    expect(after).toBeLessThan(before);
  });

  it('cuts faster with a better saw: the pace of 2.4 is in it', () => {
    const standard = offered(1, 'standard', 20);
    const pro = offered(1, 'pro', 20);
    // A standard saw and a pro one have two places each, so the two halls are short of saws by
    // the same 0.76 and the pace alone parts them: 1.05 against 1.08, 150 a week against 156. The
    // old reading set an industrial saw's three places against a budget saw's one, which is the
    // shortage and not the pace (PIOTR, 24.09; v53).
    const factor = placeShortages(standard.state)[0]?.factor;
    expect(placeShortages(pro.state)[0]?.factor).toBe(factor);
    expect(factor).toBeCloseTo(shortage(2, 7), 10);
    expect(hallPace(standard.state, 'tableSaw')).toBe(1.05);
    expect(hallPace(pro.state, 'tableSaw')).toBe(1.08);
    const slow = contractHallCapacity(standard.state, standard.contract).perWeek;
    const fast = contractHallCapacity(pro.state, pro.contract).perWeek;
    expect(slow).toBe(crewWeek(standard.state, standard.contract, shortage(2, 7)));
    expect(fast).toBe(crewWeek(pro.state, pro.contract, shortage(2, 7)));
    expect(slow).toBe(150);
    expect(fast).toBe(156);
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
