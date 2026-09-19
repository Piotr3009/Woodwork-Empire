// @vitest-environment jsdom
// The Finance tab of the binder: the loan's balance, next instalment, interest paid and months
// left, the controls that borrow and repay, and the overdraft's line, every minus in the game's
// red (CLAUDE.md T13 3.14, 3.1).

import { describe, expect, it } from 'vitest';
import { LOAN_MAX, LOAN_MONTHS } from '../../src/engine/constants';
import { loanInstalmentFor, takeLoan } from '../../src/engine/finance';
import { renderAccounting } from '../../src/ui/accounting';
import { renderFinance } from '../../src/ui/finance';
import { newGame } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function rowFigure(page: HTMLElement, words: string): HTMLElement | null {
  const rows = Array.from(page.querySelectorAll('.row'));
  const row = rows.find((entry) => entry.querySelector('.row-main')?.textContent?.includes(words));
  const figure = row?.querySelector('.row-figure');
  return figure instanceof HTMLElement ? figure : null;
}

describe('with nothing borrowed', () => {
  it('offers the loan with the typed amount on the one button', () => {
    const page = parse(renderFinance(newGame(), '20000'));
    const field = page.querySelector('[data-field="loanAmount"]');
    expect(field?.getAttribute('value')).toBe('20000');
    const take = page.querySelector('[data-do="takeLoan"]');
    expect(take?.getAttribute('data-amount')).toBe('20000');
    expect(page.querySelector('.finance-loan')?.textContent).toContain(`${LOAN_MONTHS} monthly instalments`);
    expect(page.querySelector('[data-do="repayLoan"]')).toBeNull();
  });

  it('locks the button with the reason when the amount is over the cap, or nothing', () => {
    const over = parse(renderFinance(newGame(), String(LOAN_MAX + 1)));
    expect(over.querySelector('[data-do="takeLoan"]')).toBeNull();
    const locked = over.querySelector('.finance-loan button[disabled]');
    expect(locked?.getAttribute('title')).toBe(`The bank lends up to ${LOAN_MAX}`);
    const nothing = parse(renderFinance(newGame(), ''));
    expect(nothing.querySelector('.finance-loan button[disabled]')?.getAttribute('title')).toBe('Nothing to borrow');
  });
});

describe('with a loan on the books', () => {
  it('shows the balance, the next instalment, the interest paid and the months left', () => {
    const state = newGame();
    takeLoan(state, 12000);
    const page = parse(renderFinance(state, '500'));
    const balance = rowFigure(page, 'Balance owed');
    expect(balance?.textContent).toBe('-£12,000');
    expect(balance?.className).toContain('bad');
    // Capital 200 and interest 150, together, and the two named on the line.
    const next = rowFigure(page, 'Next instalment');
    expect(next?.textContent).toBe(`-£${Math.round(loanInstalmentFor(12000) + 150)}`);
    expect(next?.className).toContain('bad');
    const nextRow = next?.parentElement;
    expect(nextRow?.textContent).toContain('capital £200');
    expect(nextRow?.textContent).toContain('interest £150');
    const paid = rowFigure(page, 'Interest paid so far');
    expect(paid?.textContent).toBe('£0');
    expect(paid?.className).not.toContain('bad');
    expect(rowFigure(page, 'Months left')?.textContent).toBe(`${LOAN_MONTHS} months`);
    expect(page.querySelector('[data-do="takeLoan"]')).toBeNull();
  });

  it('repays the typed amount or all of it, and locks what the cash cannot cover', () => {
    const state = newGame();
    takeLoan(state, 12000);
    const page = parse(renderFinance(state, '500'));
    const part = page.querySelector('[data-do="repayLoan"][data-amount="500"]');
    const all = page.querySelector('[data-do="repayLoan"][data-amount="all"]');
    expect(part).not.toBeNull();
    expect(all).not.toBeNull();
    state.cash = state.finance.overdraftLimit + 100;
    const broke = parse(renderFinance(state, '500'));
    expect(broke.querySelector('[data-do="repayLoan"]')).toBeNull();
    const locked = Array.from(broke.querySelectorAll('.finance-loan button[disabled]'));
    expect(locked.map((entry) => entry.getAttribute('title'))).toEqual(['Not enough cash', 'Not enough cash']);
  });
});

describe('the overdraft', () => {
  it('prints the limit, the rate, and the interest accrued so far in red', () => {
    const state = newGame();
    state.finance.overdraftInterestAccrued = 3.47;
    const page = parse(renderFinance(state, '0'));
    expect(rowFigure(page, 'Overdraft limit')?.textContent).toBe('-£10,000');
    const accrued = rowFigure(page, 'Interest accrued this month');
    expect(accrued?.textContent).toBe('-£3');
    expect(accrued?.className).toContain('bad');
    expect(page.querySelector('.finance-overdraft')?.textContent).toContain('25% a year');
    expect(page.querySelector('.finance-overdraft .warn')).toBeNull();
  });

  it('says in red that the account is below zero and the interest is running', () => {
    const state = newGame();
    state.cash = -500;
    const page = parse(renderFinance(state, '0'));
    const warn = page.querySelector('.finance-overdraft .warn');
    expect(warn?.textContent).toContain('£500 below zero');
  });
});

describe('the binder', () => {
  it('opens the tab under Finance and names the loan and the covers among what is coming', () => {
    const state = newGame();
    takeLoan(state, 12000);
    state.insurance.liability = true;
    const finance = parse(renderAccounting(state, 'finance', [], null, '1000'));
    expect(finance.querySelector('.finance-loan')).not.toBeNull();
    expect(finance.querySelector('[data-do="accountingTab"][data-id="finance"]')?.className).toContain('is-on');
    const summary = parse(renderAccounting(state, 'summary'));
    const coming = rowFigure(summary, 'Monthly bills');
    expect(coming?.textContent).toContain('loan instalment £350');
    expect(coming?.textContent).toContain('insurance £50');
  });
});
