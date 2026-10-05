// @vitest-environment jsdom
// A contract says what the hall can make [PIOTR, 21.09: "we take a contract and we do not know
// whether the hall can do it"] (CLAUDE.md T25 2.7): the piece's minutes at the hall's pace for its
// family, every joiner on the books, what the saws too few for the crew take off the whole hall,
// and the working days of a week. Nobody waits for a place from v53, so a hall short of saws says
// so through the shortage factor and not through a cap (PIOTR, 24.09; v53). From v84 a contract
// takes four joiners at the most (PIOTR, 05.10), so a company of more than four is counted with the
// four of the highest rate on it and four men at the saw (CLAUDE.md T29 2.3); the six joiners
// below are restated so. One honest number, green when the hall keeps up and red when the term
// wants more, on the offer tile and on the Contracts tab's offer card, before the contract is
// signed. v51's men line stays under it.

import { describe, expect, it } from 'vitest';
import {
  BY_HAND_DURATION_FACTOR,
  CONTRACT_MAX_JOINERS,
  MINUTES_PER_WORKING_DAY,
  WORKING_DAYS_PER_WEEK,
} from '../../src/engine/constants';
import {
  contractHallCapacity,
  contractHallLine,
  contractPiece,
  drawContract,
} from '../../src/engine/contracts';
import type { Contract, GameState } from '../../src/engine/index';
import { fullCrew, hallPace, placeShortages } from '../../src/engine/machines';
import { manPace } from '../../src/engine/stages';
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

/** The week of the four joiners a contract takes (CLAUDE.md T29 2.3), by the arithmetic of 2.7: his
 *  minutes over a piece at his rate, the hall's pace for the saw and the factor the saws too few
 *  for the four leave the hall, rounded the way his card rounds them, and as many of them as a week
 *  holds. The six here are novices alike, so the four are the first four hired. */
function crewWeek(state: GameState, contract: Contract, factor: number): number {
  const week = MINUTES_PER_WORKING_DAY * WORKING_DAYS_PER_WEEK;
  const pace = hallPace(state, 'tableSaw');
  // The saw's pace and the shortage as points, and the man's grade times them (v61), as the
  // minute makes it.
  return state.workers.slice(0, CONTRACT_MAX_JOINERS).reduce((total, worker) => {
    const minutes = Math.max(1, Math.round(contractPiece(contract).minutes / manPace(worker.rate, pace, factor)));
    return total + Math.floor(week / minutes);
  }, 0);
}

/** What the saws too few for the crew leave of every minute of the hall: the men past the places
 *  work at the by hand pace (PIOTR, 24.09; v53). */
function shortage(places: number, men: number): number {
  return (places + (men - places) / BY_HAND_DURATION_FACTOR) / men;
}

/** The shortage the contract's line reckons with for a company of six joiners: four men at the
 *  saw, the most a contract takes (CLAUDE.md T29 2.3), where v83 put the whole crew on the books
 *  there (v54), and nobody at any other family, which a cut sheet pack never touches (v55). */
function atFour(state: GameState): ReturnType<typeof placeShortages> {
  return placeShortages(state, 'day', (family) => (family === 'tableSaw' ? CONTRACT_MAX_JOINERS : 0));
}

describe('what the hall makes of a contract (CLAUDE.md T25 2.7)', () => {
  it('counts the four joiners a contract takes, at their rate, the hall s pace and what too few saws take off', () => {
    const { state, contract } = offered(1, 'budget', 20);
    // One budget saw, which keeps two men busy (v55), and six joiners with no experience on the
    // books. A contract takes four of them at the most (PIOTR, 05.10), so four count, and the two
    // past the saw's capacity work at the by hand pace: the hall's minute is (2 + 2 / 1.5) / 4 of
    // itself, 0.83 (PIOTR, 24.09; v53). Restated in v84 from the crew of seven on the books, the
    // owner and the six, which made it 0.76 (CLAUDE.md T29 2.3).
    expect(fullCrew(state)).toBe(7);
    const [short] = atFour(state);
    expect(short).toMatchObject({ family: 'tableSaw', capacity: 2, men: 4, over: 2 });
    expect(short?.factor).toBeCloseTo(shortage(2, 4), 10);
    // A piece of 45 of the owner's minutes is 90 of a novice's: the budget pace 1.00 and the 0.83
    // as points and his 0.6 times them (v61; PIOTR, 01.10): 26 a week each and 104 for the four
    // (98 minutes and 144 a week for the six on v83; 124 minutes and 114 a week on v60, when the
    // grade was a point).
    const minutes = Math.round(contractPiece(contract).minutes / manPace(0.6, 1, shortage(2, 4)));
    expect(minutes).toBe(90);
    const week = MINUTES_PER_WORKING_DAY * WORKING_DAYS_PER_WEEK;
    expect(contractHallCapacity(state, contract).perWeek).toBe(4 * Math.floor(week / minutes));
    expect(contractHallCapacity(state, contract).perWeek).toBe(104);
  });

  it('makes fewer in a one saw hall than in a three saw hall, through the shortage and not a cap', () => {
    const one = offered(1, 'budget', 20);
    const three = offered(3, 'budget', 20);
    // The same four of the six men in both halls (CLAUDE.md T29 2.3): one budget saw keeps two
    // busy and leaves two of the four by hand, so its hall's minute is 0.83 of itself, and three
    // keep six, more than the four, so that hall is short of nothing (v55). v52 capped the men at
    // the places and read 32 against 96, three times over (PIOTR, 24.09; v53).
    expect(atFour(one.state)[0]?.factor).toBeCloseTo(shortage(2, 4), 10);
    expect(atFour(three.state)).toEqual([]);
    const small = contractHallCapacity(one.state, one.contract).perWeek;
    const big = contractHallCapacity(three.state, three.contract).perWeek;
    expect(small).toBe(crewWeek(one.state, one.contract, shortage(2, 4)));
    expect(big).toBe(crewWeek(three.state, three.contract, 1));
    // 104 against 128 (144 against 180 for the six on v83; 114 against 174 on v60, when the grade
    // was a point).
    expect(small).toBe(104);
    expect(big).toBe(128);
    expect(small).toBeLessThan(big);
  });

  it('turns red when the term wants more than the hall makes, and green when it does not', () => {
    const { state, contract } = offered(1, 'budget', 20);
    const makes = contractHallCapacity(state, contract).perWeek;
    contract.quantityPerWeek = makes;
    // Six joiners on the books: the line says what four on it make (CLAUDE.md T29 2.3).
    expect(contractHallLine(state, contract)).toEqual({
      text: `Your hall makes about ${makes} of these a week with four on it; this term wants ${makes}`,
      hall: `Your hall makes about ${makes} of these a week with four on it`,
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
    // Two budget saws keep the four a contract takes busy, so nothing is short and the week is 128;
    // one keeps two of them, 0.83 of the hall's minute and 104 (CLAUDE.md T29 2.3; 162 and 144 for
    // the six on v83). v52 halved it with the places, 64 to 32 (PIOTR, 24.09; v53).
    expect(atFour(sold)[0]?.capacity).toBe(2);
    // With every man off his job nobody is at work, so the hall's own minute is short of nothing
    // and its Output sheet says so; the line still reckons with the four (v54).
    expect(placeShortages(sold)).toEqual([]);
    expect(before).toBe(128);
    expect(after).toBe(104);
    expect(after).toBeLessThan(before);
  });

  it('cuts faster with a better saw: the pace of 2.4 is in it', () => {
    const standard = offered(1, 'standard', 20);
    const pro = offered(1, 'pro', 20);
    // A standard saw keeps two men busy and a pro one three (v55), so with the four a contract
    // takes the pro hall is short by less, 0.92 against 0.83, and its pace is better as well,
    // 1.08 against 1.05, the two as points of one bracket (v61): 128 a week against 112 (168
    // against 156 for the six on v83, CLAUDE.md T29 2.3; 156 against 132 on v60, when the grade
    // was a point). The old reading set an industrial saw's three places against a budget saw's
    // one, which is the shortage and not the pace (PIOTR, 24.09; v53).
    expect(atFour(standard.state)[0]?.factor).toBeCloseTo(shortage(2, 4), 10);
    expect(atFour(pro.state)[0]?.factor).toBeCloseTo(shortage(3, 4), 10);
    expect(hallPace(standard.state, 'tableSaw')).toBe(1.05);
    expect(hallPace(pro.state, 'tableSaw')).toBe(1.08);
    const slow = contractHallCapacity(standard.state, standard.contract).perWeek;
    const fast = contractHallCapacity(pro.state, pro.contract).perWeek;
    expect(slow).toBe(crewWeek(standard.state, standard.contract, shortage(2, 4)));
    expect(fast).toBe(crewWeek(pro.state, pro.contract, shortage(3, 4)));
    expect(slow).toBe(112);
    expect(fast).toBe(128);
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
