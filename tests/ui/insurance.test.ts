// @vitest-environment jsdom
// The Insurance tab under Admin (CLAUDE.md T13 3.15): each cover with its on and off control, the
// insured value and the premiums live, and the red line at security level 0.

import { describe, expect, it } from 'vitest';
import { LIABILITY_BASE_YEARLY, PROPERTY_INSURANCE_RATE_YEARLY, SHEET_VALUE } from '../../src/engine/constants';
import { setInsurance } from '../../src/engine/insurance';
import { renderInsurance } from '../../src/ui/insurance';
import { renderLaptop } from '../../src/ui/laptop';
import type { GameState } from '../../src/engine/index';
import { act, buyStartingKit, fillRack, newGame } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function hall(): GameState {
  return act(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 10), {
    type: 'SET_SPEED',
    speed: 1,
  });
}

function figure(block: Element, words: string): Element | null {
  const rows = Array.from(block.querySelectorAll('.row'));
  const row = rows.find((entry) => entry.querySelector('.row-main')?.textContent?.includes(words));
  return row?.querySelector('.row-figure') ?? null;
}

describe('the two covers', () => {
  it('shows each with a Take control when not held, and the insured value live', () => {
    const state = hall();
    const page = parse(renderInsurance(state));
    const blocks = page.querySelectorAll('.insurance-line');
    expect(blocks).toHaveLength(2);
    const property = page.querySelector('.insurance-line[data-cover="property"]');
    const liability = page.querySelector('.insurance-line[data-cover="liability"]');
    if (!property || !liability) throw new Error('two blocks are wanted');
    expect(property.textContent).toContain('Not held');
    const value = state.insurance.insuredValue;
    expect(property.textContent).toContain(`£${value.toLocaleString('en-GB')} insured`);
    expect(property.textContent).toContain(`£${(10 * SHEET_VALUE).toLocaleString('en-GB')}`);
    const yearly = figure(property, 'Premium a year');
    expect(yearly?.textContent).toBe(`-£${Math.round(value * PROPERTY_INSURANCE_RATE_YEARLY).toLocaleString('en-GB')}`);
    expect(yearly?.className).toContain('bad');
    const take = property.querySelector('[data-do="setInsurance"]');
    expect(take?.getAttribute('data-cover')).toBe('property');
    expect(take?.getAttribute('data-on')).toBe('1');
    expect(take?.textContent).toContain('to the end of the month');
    const takeLiability = liability.querySelector('[data-do="setInsurance"][data-on="1"]');
    expect(takeLiability).not.toBeNull();
    expect(figure(liability, 'On the 1st')?.textContent).toBe(`-£${Math.round(LIABILITY_BASE_YEARLY / 12)}`);
  });

  it('shows a Drop control once held, and locks Take when the cash is short', () => {
    const state = hall();
    setInsurance(state, 'liability', true);
    const page = parse(renderInsurance(state));
    const liability = page.querySelector('.insurance-line[data-cover="liability"]');
    expect(liability?.textContent).toContain('Held');
    const drop = liability?.querySelector('[data-do="setInsurance"]');
    expect(drop?.getAttribute('data-on')).toBe('0');
    state.cash = state.finance.overdraftLimit + 1;
    const broke = parse(renderInsurance(state));
    const property = broke.querySelector('.insurance-line[data-cover="property"]');
    expect(property?.querySelector('[data-do="setInsurance"]')).toBeNull();
    expect(property?.querySelector('button[disabled]')?.getAttribute('title')).toBe(
      'Not enough cash for the first premium',
    );
  });
});

describe('the alarm line and the gate', () => {
  it('says in red that the insurer pays nothing without an alarm, only with property cover held at level 0', () => {
    const state = hall();
    expect(parse(renderInsurance(state)).querySelector('.warn.bad')).toBeNull();
    setInsurance(state, 'property', true);
    const warn = parse(renderInsurance(state)).querySelector('.warn.bad');
    expect(warn?.textContent).toContain('pays nothing on a burglary');
    state.security.level = 1;
    expect(parse(renderInsurance(state)).querySelector('.warn.bad')).toBeNull();
  });

  it('says both covers gate the commercial work, and lists a payout coming in', () => {
    const state = hall();
    expect(parse(renderInsurance(state)).textContent).toContain('Commercial enquiries need both covers');
    setInsurance(state, 'property', true);
    setInsurance(state, 'liability', true);
    state.security.level = 1;
    state.insurance.payouts.push({ label: 'Insurance payout: burglary', perDay: 500, daysLeft: 7 });
    const page = parse(renderInsurance(state));
    expect(page.textContent).toContain('Both covers held');
    const payout = Array.from(page.querySelectorAll('.row')).find((row) =>
      row.textContent?.includes('Insurance payout'),
    );
    expect(payout?.textContent).toContain('7 days left');
    expect(payout?.querySelector('.row-figure')?.className).toContain('good');
    expect(payout?.querySelector('.row-figure')?.textContent).toBe('+£500 a day');
  });

  it('is a page of the laptop, behind the Insurance tile of its Office group', () => {
    const page = parse(renderLaptop(hall(), { page: 'insurance', stockSheets: '', teamTab: 'workshop' }));
    expect(page.querySelector('.laptop-screen[data-laptop-page="insurance"]')).not.toBeNull();
    expect(page.querySelector('[data-tile="home"]')).not.toBeNull();
    expect(page.querySelectorAll('.insurance-line')).toHaveLength(2);
  });
});
