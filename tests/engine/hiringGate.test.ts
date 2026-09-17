// @vitest-environment jsdom
// The hiring gate: nobody is taken on without a month of his pay in the bank (PIOTR, 16.09;
// CLAUDE.md T17 2.11). The refusal is the one blockReason chain, so the card and the engine say
// the same thing, and it is the last of the refusals: every other one is a standing fact about
// the workshop, and the balance is what an owner looks at once the rest of it is ready.

import { describe, expect, it } from 'vitest';
import { HIRING_SPECS } from '../../src/engine/constants';
import { canHire, hiringOptions, monthlyPay } from '../../src/engine/staff';
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

function poorJoinerPay(): number {
  const spec = HIRING_SPECS.find((entry) => entry.role === 'joiner' && entry.tier === 'poor');
  if (!spec) throw new Error('no poor joiner in the hiring specs');
  return monthlyPay(spec);
}

describe('taking somebody on', () => {
  it('wants a month of his pay in the bank', () => {
    const pay = poorJoinerPay();
    const rich = readyToHire(pay);
    expect(canHire(rich, 'joiner', 'poor')).toEqual({ ok: true, reason: '' });
    // A pound short of his month and the answer is no.
    const short = readyToHire(pay - 1);
    expect(canHire(short, 'joiner', 'poor')).toEqual({
      ok: false,
      reason: `Not enough in the bank: needs ${formatMoney(pay)}`,
    });
  });

  it('says so on the card, in the money the game writes everywhere else', () => {
    const pay = poorJoinerPay();
    const page = parse(renderTeam(readyToHire(pay - 1), 'workshop'));
    const tile = page.querySelector('[data-candidate="joiner.poor"]');
    expect(tile?.className).toContain('is-locked');
    expect(tile?.textContent).toContain(`Not enough in the bank: needs ${formatMoney(pay)}`);
    expect(tile?.querySelector('[data-do="hire"]')).toBe(null);
  });

  it('is the last of the refusals: the kit is named before the bank is', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.cash = 0;
    const option = hiringOptions(state).find(
      (entry) => entry.role === 'joiner' && entry.tier === 'poor',
    );
    expect(option?.blockReason).toContain('Buy first');
  });
});
