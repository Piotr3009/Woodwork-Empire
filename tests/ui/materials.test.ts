// @vitest-environment jsdom
// The stock page in the style of Joinery Core (PIOTR: a deliberate advert; CLAUDE.md T13 3.2):
// stock lines with a thumbnail, a name and a stock number, free and reserved and the total, a Low
// stock badge, one Restock button at the top, and the projects in green and red under it (T13
// 3.6). No per project question anywhere (T13 3.3).

import { describe, expect, it } from 'vitest';
import {
  LOW_STOCK_SHEETS,
  RESTOCK_TO_SHEETS,
  SHEET_PRICE_AD_HOC,
  SHEET_PRICE_STOCK,
} from '../../src/engine/constants';
import { stockNumberFor } from '../../src/engine/materials';
import { renderLaptop } from '../../src/ui/laptop';
import { renderMaterials } from '../../src/ui/materials';
import { money } from '../../src/ui/modal';
import type { GameState } from '../../src/engine/index';
import { acceptNow, act, buyStartingKit, fillRack, newGame, placeEnquiry } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function text(element: Element | null | undefined): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** The day 1 kit with its budget rack of 50, and an empty board. */
function ready(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' });
  state.enquiries = [];
  return state;
}

describe('the stock page', () => {
  it('lists one line per material kind with a thumbnail, a name and a stable stock number', () => {
    const state = fillRack(ready(), 10);
    const page = parse(renderMaterials(state, ''));
    const lines = page.querySelectorAll('.stock-line');
    expect(lines).toHaveLength(1);
    const line = lines[0] ?? null;
    expect(line?.getAttribute('data-stock')).toBe('sheet');
    // The thumbnail is the placeholder helper's flat board, one per kind (CLAUDE.md T13 9.8).
    expect(line?.querySelector('.stock-thumb svg [data-placeholder="thumb.sheet"]')).not.toBeNull();
    expect(text(line?.querySelector('.stock-name'))).not.toBe('');
    expect(text(line?.querySelector('.stock-number'))).toBe(stockNumberFor(state, 'sheet'));
    expect(text(line?.querySelector('.stock-number'))).toMatch(/^MFC-18-WHT-\d{3}$/);
  });

  it('shows free, reserved and the total, and reserved is what the accepted jobs will use', () => {
    const state = fillRack(ready(), 10);
    const enquiry = placeEnquiry(state, { price: 800, deadlineDays: 90 });
    const held = acceptNow(state, enquiry.id, false);
    const line = parse(renderMaterials(held, '')).querySelector('.stock-line');
    expect(text(line?.querySelector('.stock-free'))).toBe('Free 8');
    expect(text(line?.querySelector('.stock-reserved'))).toBe('Reserved 2');
    expect(text(line?.querySelector('.stock-total'))).toBe('Total 10 of 50');
  });

  it('wears the Low stock badge under the figure and not at it', () => {
    const low = fillRack(ready(), LOW_STOCK_SHEETS - 1);
    const badge = parse(renderMaterials(low, '')).querySelector('.badge-low');
    expect(badge).not.toBeNull();
    // The badge is red with white text in itself (CLAUDE.md T15 2.2): no colour class beside it,
    // which painted red on red once the plate went red.
    expect(badge?.className).toBe('badge badge-low');
    expect(text(badge)).toBe(`Low stock, under ${LOW_STOCK_SHEETS}`);
    const fine = fillRack(ready(), LOW_STOCK_SHEETS);
    expect(parse(renderMaterials(fine, '')).querySelector('.badge-low')).toBeNull();
  });

  it('has one Restock button at the top that says what it buys and what it costs', () => {
    const state = fillRack(ready(), 2);
    const page = parse(renderMaterials(state, ''));
    const buttons = page.querySelectorAll('[data-do="restock"]');
    expect(buttons).toHaveLength(1);
    const sheets = RESTOCK_TO_SHEETS - 2;
    expect(text(buttons[0])).toBe(
      `Restock: ${sheets} sheets to ${RESTOCK_TO_SHEETS} free, ${money(sheets * SHEET_PRICE_STOCK)}`,
    );
    // The button comes before the lines: it is the one control at the top.
    const html = page.innerHTML;
    expect(html.indexOf('data-do="restock"')).toBeLessThan(html.indexOf('class="stock-line"'));
  });

  it('greys Restock with the reason when nothing is low and while a load is on the way', () => {
    const fine = fillRack(ready(), RESTOCK_TO_SHEETS);
    const page = parse(renderMaterials(fine, ''));
    expect(page.querySelector('[data-do="restock"]')).toBeNull();
    expect(page.querySelector('button[disabled]')?.getAttribute('title')).toBe('Nothing is low');
    const low = fillRack(ready(), 1);
    const ordered = act(low, { type: 'RESTOCK' });
    const again = parse(renderMaterials(ordered, '')).querySelector('button[disabled]');
    expect(again?.getAttribute('title')).toContain('on the way');
    // And the load is on the page, on its way.
    expect(parse(renderMaterials(ordered, '')).textContent).toContain('arrives day 2');
  });

  it('lists the projects in green when their sheets are held and red with the shortfall', () => {
    let state = fillRack(ready(), 2);
    const whole = placeEnquiry(state, { price: 400, deadlineDays: 90 });
    state = acceptNow(state, whole.id, false);
    // 1,600 of price is 640 of material, four sheets; one is left free, so three are short.
    const short = placeEnquiry(state, { price: 1600, deadlineDays: 90 });
    state = acceptNow(state, short.id, false);
    const page = parse(renderMaterials(state, ''));
    const rows = page.querySelectorAll('[data-project]');
    expect(rows).toHaveLength(2);
    const first = rows[0] ?? null;
    const second = rows[1] ?? null;
    expect(text(first?.querySelector('.sheets-reserved.good'))).toBe('1 of 1 sheet in hand');
    expect(first?.querySelector('.shortfall')).toBeNull();
    expect(first?.querySelector('[data-do="orderForJob"]')).toBeNull();
    expect(text(second?.querySelector('.shortfall.bad'))).toBe('3 of 4 sheets short');
    const order = second?.querySelector('[data-do="orderForJob"]');
    expect(order?.getAttribute('data-id')).toBe(state.jobs[1]?.id);
    expect(text(order)).toContain(money(3 * SHEET_PRICE_AD_HOC));
  });

  it('has no per project question, no free form order and none of the software’s detail', () => {
    const state = fillRack(ready(), 10);
    const html = renderMaterials(state, '6');
    for (const gone of [
      'data-field="stockSheets"',
      'data-do="buyStock"',
      'per project',
      'from stock',
      'Supplier',
      'Category',
      'Invoice',
      'average',
    ]) {
      expect(html, gone).not.toContain(gone);
    }
    // And it is still the laptop's Stock tab, reached the one way (CLAUDE.md T4 3.1).
    expect(renderLaptop(state, { page: 'stock', stockSheets: '6', teamTab: 'workshop' })).toContain(
      'data-stock="sheet"',
    );
  });

  it('says there is no shelving before there is any', () => {
    const page = parse(renderMaterials(newGame(), ''));
    expect(page.textContent).toContain('No shelving yet');
    expect(page.querySelector('button[disabled]')?.getAttribute('title')).toBe('No shelving yet');
  });
});
