// @vitest-environment jsdom
// The hiring gate: nobody is taken on without a month of his pay in the bank (PIOTR, 16.09;
// CLAUDE.md T17 2.11). The refusal is the one blockReason chain, so the card and the engine say
// the same thing, and it is the last of the refusals: every other one is a standing fact about
// the workshop, and the balance is what an owner looks at once the rest of it is ready.

import { describe, expect, it } from 'vitest';
import { HIRING_SPECS } from '../../src/engine/constants';
import { canHire, hiringOptions, monthlyWageOf } from '../../src/engine/staff';
import { formatMoney } from '../../src/engine/economy';
import { renderTeam } from '../../src/ui/team';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, fillRack, newGame, placeEquipment } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** A hall that wants for nothing but money: the kit a joiner needs is all standing in it. */
function readyToHire(cash: number): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  placeEquipment(state, 'locker', { x: 6, y: 9 });
  placeEquipment(state, 'canteenSeat', { x: 8, y: 9 });
  placeEquipment(state, 'handToolSet', { x: 12, y: 9 });
  placeEquipment(state, 'toolCabinet', { x: 10, y: 9 });
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
    expect(payOf('novice')).toBeLessThan(2499);
    expect(payOf('experienced')).toBeGreaterThan(2499);
    const state = readyToHire(2499);
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

  it('stands at 2,600 for an experienced joiner, which is Piotr\u2019s own figure', () => {
    // The one wage field is the month's and the gate reads it directly, with nothing converted out
    // of a week on the way (PIOTR, 19.09: "I wanted everyone monthly"; CLAUDE.md T21 2.10, T17
    // 2.11). So the figure in the refusal is the figure on the hire card and the figure in the
    // bank: 2,600 takes him on and 2,599 does not.
    expect(payOf('experienced')).toBe(2600);
    const exact = readyToHire(2600);
    exact.reputation = 60;
    expect(canHire(exact, 'joiner', 'experienced')).toEqual({ ok: true, reason: '' });
    const short = readyToHire(2599);
    short.reputation = 60;
    expect(canHire(short, 'joiner', 'experienced')).toEqual({
      ok: false,
      reason: 'Not enough in the bank: needs \u00a32,600',
    });
    // And the card prints that sentence and no week beside it.
    const tile = parse(renderTeam(short, 'workshop')).querySelector(
      '[data-candidate="joiner.experienced"]',
    );
    expect(tile?.textContent).toContain('Not enough in the bank: needs \u00a32,600');
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
