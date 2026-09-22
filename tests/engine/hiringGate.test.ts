// @vitest-environment jsdom
// The hiring gate: nobody is taken on without a month of his pay in the bank (PIOTR, 16.09;
// CLAUDE.md T17 2.11). The refusal is the one blockReason chain, so the card and the engine say
// the same thing, and it is the last of the refusals: every other one is a standing fact about
// the workshop, and the balance is what an owner looks at once the rest of it is ready.

import { describe, expect, it } from 'vitest';
import { HIRING_SPECS } from '../../src/engine/constants';
import { WORKBENCH_PLACES, WORKBENCH_VARIANTS } from '../../src/engine/constants';
import { canHire, hiringOptions, monthlyWageOf } from '../../src/engine/staff';
import { OWNER, benchOf, benchPlaces, outputFactorOf } from '../../src/engine/machines';
import { renderMachine } from '../../src/ui/machine';
import type { Equipment } from '../../src/engine/index';
import { formatMoney } from '../../src/engine/economy';
import { renderTeam } from '../../src/ui/team';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, fillRack, hireNow, newGame, placeEquipment } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** A hall that wants for nothing but money: the kit a joiner needs is all standing in it, the
 *  second place at a bench included, because the gate counts the owner's own from Turn 24
 *  (CLAUDE.md T24 2.2). The bench of two places is the day one bench's own, so the hall still
 *  holds exactly one bench and the places it has are the class's. */
function readyToHire(cash: number): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  placeEquipment(state, 'locker', { x: 6, y: 9 });
  placeEquipment(state, 'handToolSet', { x: 12, y: 9 });
  placeEquipment(state, 'toolCabinet', { x: 10, y: 9 });
  const bench = state.equipment.find((item) => item.specId === 'workbench');
  if (bench === undefined) throw new Error('the day one kit has a bench in it');
  bench.variantId = 'standard';
  state.cash = cash;
  return state;
}

function payOf(tier: 'novice' | 'experienced' | 'senior'): number {
  const spec = HIRING_SPECS.find((entry) => entry.role === 'joiner' && entry.tier === tier);
  if (!spec) throw new Error(`no ${tier} joiner in the hiring specs`);
  return monthlyWageOf(spec);
}

function greenJoinerPay(): number {
  return payOf('novice');
}

describe('taking somebody on', () => {
  it('wants a month of his pay in the bank', () => {
    const pay = greenJoinerPay();
    const rich = readyToHire(pay);
    expect(canHire(rich, 'joiner', 'novice')).toEqual({ ok: true, reason: '' });
    // A pound short of his month and the answer is no.
    const short = readyToHire(pay - 1);
    expect(canHire(short, 'joiner', 'novice')).toEqual({
      ok: false,
      reason: `Not enough in the bank: needs ${formatMoney(pay)}`,
    });
  });

  it('says so on the card, in the money the game writes everywhere else', () => {
    const pay = greenJoinerPay();
    const page = parse(renderTeam(readyToHire(pay - 1), 'workshop'));
    const tile = page.querySelector('[data-candidate="joiner.novice"]');
    expect(tile?.className).toContain('is-locked');
    expect(tile?.textContent).toContain(`Not enough in the bank: needs ${formatMoney(pay)}`);
    expect(tile?.querySelector('[data-do="hire"]')).toBe(null);
  });

  it('answers the brief’s 2,500 a month joiner, which is between two real classes', () => {
    // CLAUDE.md T17 2.11 writes the example as a 2,500 a month joiner. The game has no such man:
    // a joiner with no experience is 1,950 a month and an experienced one is 2,600, which are
    // Piotr's own figures and the wage itself now, with nothing converted (CLAUDE.md T21 2.9,
    // 2.10). So 2,499 in the bank is a real workshop's answer to both of them at once: the green
    // man is affordable and the experienced one is not.
    // From v38 the experienced man is 2,470 (PIOTR, 21.09), so the line between the two sits
    // at 2,469.
    expect(payOf('novice')).toBeLessThan(2469);
    expect(payOf('experienced')).toBeGreaterThan(2469);
    const state = readyToHire(2469);
    // An experienced joiner answers a workshop of some standing, and the bank is asked last, so
    // the standing has to be there before the balance is the reason (CLAUDE.md T17 2.11).
    state.reputation = 60;
    expect(canHire(state, 'joiner', 'novice').ok).toBe(true);
    expect(canHire(state, 'joiner', 'experienced')).toEqual({
      ok: false,
      reason: `Not enough in the bank: needs ${formatMoney(payOf('experienced'))}`,
    });
    // And the card says the same sentence, because it is the same chain.
    const tile = parse(renderTeam(state, 'workshop')).querySelector('[data-candidate="joiner.experienced"]');
    expect(tile?.textContent).toContain(
      `Not enough in the bank: needs ${formatMoney(payOf('experienced'))}`,
    );
  });

  it('stands at 2,470 for an experienced joiner, which is Piotr\u2019s own figure (v38)', () => {
    // The one wage field is the month's and the gate reads it directly, with nothing converted out
    // of a week on the way (PIOTR, 19.09: "I wanted everyone monthly"; CLAUDE.md T21 2.10, T17
    // 2.11). So the figure in the refusal is the figure on the hire card and the figure in the
    // bank: 2,600 takes him on and 2,599 does not.
    expect(payOf('experienced')).toBe(2470);
    const exact = readyToHire(2470);
    exact.reputation = 60;
    expect(canHire(exact, 'joiner', 'experienced')).toEqual({ ok: true, reason: '' });
    const short = readyToHire(2469);
    short.reputation = 60;
    expect(canHire(short, 'joiner', 'experienced')).toEqual({
      ok: false,
      reason: 'Not enough in the bank: needs \u00a32,470',
    });
    // And the card prints that sentence and no week beside it.
    const tile = parse(renderTeam(short, 'workshop')).querySelector(
      '[data-candidate="joiner.experienced"]',
    );
    expect(tile?.textContent).toContain('Not enough in the bank: needs \u00a32,470');
    expect(tile?.textContent).not.toContain('a week');
  });

  it('is the last of the refusals: the kit is named before the bank is', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.cash = 0;
    const option = hiringOptions(state).find(
      (entry) => entry.role === 'joiner' && entry.tier === 'novice',
    );
    expect(option?.blockReason).toContain('Buy first');
  });
});

/** A bench holds one, two or three men by its class from Turn 23, and the gate counts the places
 *  and not the benches, the way it counts the slots of the tool cabinets (PIOTR, 20.09;
 *  CLAUDE.md T22 2.12, T23 2.17). */
describe('a free place at a bench', () => {
  /** The day one hall with its one bench swapped for the class asked for, the rest of a joiner's
   *  kit standing in it, and money enough for anybody. */
  function hallWith(variantId: string, sets: number): GameState {
    const state = readyToHire(1000000);
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    if (bench === undefined) throw new Error('the day one kit has a bench in it');
    bench.variantId = variantId;
    // A man wants a locker and a set of tools of his own as well, so the bench is the only thing
    // the gate can be short of.
    for (let index = 1; index < sets; index += 1) {
      placeEquipment(state, 'locker', { x: 6 + index, y: 9 });
      placeEquipment(state, 'handToolSet', { x: 12 + index, y: 9 });
      placeEquipment(state, 'toolCabinet', { x: 10 + index, y: 9 });
    }
    return state;
  }

  it('counts the classes places over the benches of the hall', () => {
    expect(WORKBENCH_PLACES).toEqual({ used: 1, budget: 1, standard: 2, pro: 2, industrial: 3 });
    const one = hallWith('budget', 1);
    expect(benchPlaces(one)).toBe(1);
    expect(benchPlaces(hallWith('standard', 1))).toBe(2);
    expect(benchPlaces(hallWith('industrial', 1))).toBe(3);
  });

  it('hires two at an industrial bench and refuses the third, because the owner needs a place too', () => {
    // The gate counts the places against the joiners on the books, the man at the door and the
    // owner, who has stood at a bench since the first morning [PIOTR, 22.09] (CLAUDE.md T24 2.2).
    let state = hallWith('industrial', 4);
    expect(benchPlaces(state)).toBe(3);
    expect(canHire(state, 'joiner', 'novice').ok).toBe(true);
    state = hireNow(state, 'joiner', 'novice');
    // Two places gone, one left, and the second man takes it: the owner has none yet and the
    // third of the bench's places is his.
    expect(canHire(state, 'joiner', 'novice').ok).toBe(true);
    state = hireNow(state, 'joiner', 'novice');
    expect(state.workers).toHaveLength(2);
    // Two men and the owner fill the three places, and the third man is refused in the words of
    // the thing that is short, which names the boss.
    expect(canHire(state, 'joiner', 'novice')).toEqual({
      ok: false,
      reason: 'No place at a bench for him: the owner needs one too',
    });
    // And a used bench puts it right: one more place, and the third man is taken on.
    placeEquipment(state, 'workbench', { variantId: 'used', x: 4, y: 7, id: 'kit-bench-2' });
    expect(benchPlaces(state)).toBe(4);
    expect(canHire(state, 'joiner', 'novice').ok).toBe(true);
  });

  it('loads a hall whose crew already fills the benches as it is, and refuses only the next man', () => {
    // The gate is about the next hire and never about the men already on the books: a save made
    // before tonight comes in with its crew where it left them (CLAUDE.md T24 2.2).
    let state = hallWith('standard', 4);
    state = hireNow(state, 'joiner', 'novice');
    // A second man written into the hall the way a save carries him, past the gate.
    const first = state.workers[0];
    if (!first) throw new Error('nobody on the books');
    state.workers.push({ ...first, id: 'staff-saved', name: 'Saved' });
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    if (bench === undefined) throw new Error('no bench');
    expect(benchOf(state, first.id)?.id).toBe(bench.id);
    expect(benchOf(state, 'staff-saved')?.id).toBe(bench.id);
    // Nobody is turned off a bench, and the owner is the one left standing; the next man is the
    // only one the gate has anything to say about.
    expect(benchOf(state, OWNER)).toBeNull();
    expect(canHire(state, 'joiner', 'novice')).toEqual({
      ok: false,
      reason: 'No place at a bench for him: the owner needs one too',
    });
  });

  it('puts the second man at the first man s bench, and the third at the next one', () => {
    // The men fill the benches in the order they were hired, so two men at a standard bench stand
    // at the same bench and are drawn there (CLAUDE.md T23 2.17).
    let state = hallWith('standard', 4);
    state = hireNow(state, 'joiner', 'novice');
    // A second place for the owner, and the second man takes the first man's other one.
    placeEquipment(state, 'workbench', { variantId: 'budget', x: 4, y: 7, id: 'kit-bench-2' });
    state = hireNow(state, 'joiner', 'novice');
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    if (bench === undefined) throw new Error('no bench');
    const [first, second] = state.workers;
    expect(benchOf(state, first?.id ?? '')?.id).toBe(bench.id);
    expect(benchOf(state, second?.id ?? '')?.id).toBe(bench.id);
    // Two figures at one bench: the renderer draws a man at his own home cell, and both of them
    // have the same one.
    expect([first?.anchorX, first?.anchorY]).toEqual([bench.anchorX, bench.anchorY]);
    expect([second?.anchorX, second?.anchorY]).toEqual([bench.anchorX, bench.anchorY]);
    // The owner takes what is left, which is the one place of the second bench.
    expect(benchOf(state, OWNER)?.id).toBe('kit-bench-2');
    // A third bench, and the third man stands at the second one, the owner moving on again.
    placeEquipment(state, 'workbench', { variantId: 'budget', x: 6, y: 7, id: 'kit-bench-3' });
    state = hireNow(state, 'joiner', 'novice');
    const third = state.workers[2];
    expect(benchOf(state, third?.id ?? '')?.id).toBe('kit-bench-2');
    expect(benchOf(state, OWNER)?.id).toBe('kit-bench-3');
  });

  it('works each man at a pro bench at that bench s pace, on his own job', () => {
    // A pro bench holds two and each of them works his own job at 1.06: the pace follows the
    // bench the man is at and not the job he is on (CLAUDE.md T23 2.17).
    const variant = WORKBENCH_VARIANTS.find((entry) => entry.id === 'pro');
    expect(variant?.outputFactor).toBe(1.06);
    expect(WORKBENCH_PLACES.pro).toBe(2);
    let state = hallWith('pro', 4);
    state = hireNow(state, 'joiner', 'novice');
    state = hireNow(state, 'joiner', 'novice');
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    if (bench === undefined) throw new Error('no bench');
    for (const worker of state.workers) {
      const his = benchOf(state, worker.id);
      expect(his?.id).toBe(bench.id);
      expect(outputFactorOf(state, his as Equipment)).toBe(1.06);
    }
  });

  it('re tuned the pace of the ladder to top out at a tenth', () => {
    // 0.95, 1.00, 1.02, 1.05 and 1.08 become 0.95, 1.00, 1.03, 1.06 and 1.10
    // [TUNE; PIOTR, 20.09, the top of it] (CLAUDE.md T23 2.17).
    expect(WORKBENCH_VARIANTS.map((entry) => entry.outputFactor)).toEqual([
      0.95, 1, 1.03, 1.06, 1.1,
    ]);
  });

  it('says on the class card how many men it holds and what they work at', () => {
    const card = renderMachine(newGame(), 'workbench');
    expect(card).toContain('2 men, +3% pace');
    expect(card).toContain('2 men, +6% pace');
    expect(card).toContain('3 men, +10% pace');
    // The minus is the number's own sign, the way the output line of every class card writes
    // it, and not the typographic one.
    expect(card).toContain('1 man, -5% pace');
    expect(card).toContain('1 man, the standard pace');
  });
});
