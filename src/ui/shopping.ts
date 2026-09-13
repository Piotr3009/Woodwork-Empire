// The shopping list: everything bought and not here yet, the shortest wait first
// (PIOTR, 13.09; CLAUDE.md T8 3.2).
//
// One panel for the kit and the material alike, reached from the top bar and from the pin board
// on the office wall in the hall. It is a thing to read, so it opens on a stopped clock.

import { shoppingList } from '../engine/index';
import type { GameState, OrderLine } from '../engine/index';
import { emptyLine, escapeHtml, money } from './modal';

/** When the lorry comes, in the words the player thinks in. */
export function arrivalLine(line: OrderLine, day: number): string {
  if (line.arrived) return 'at the gate now, waiting to be unloaded';
  const away = line.dueDay - day;
  if (away <= 0) return 'arrives today at 08:00';
  if (away === 1) return 'arrives tomorrow at 08:00';
  return `arrives day ${line.dueDay} at 08:00, ${away} days away`;
}

/** The bar from the day of the click to the day of the lorry. */
export function progressBar(line: OrderLine): string {
  const filled = Math.round(line.progress * 100);
  return (
    `<span class="order-bar" data-progress="${filled}" title="ordered day ${line.orderedDay}, ` +
    `due day ${line.dueDay}"><span style="width:${filled}%"></span></span>`
  );
}

/** One click calls an order off and hands the cash back in full, until the morning the lorry
 *  comes (CLAUDE.md T8 3.5). */
export function cancelButton(line: OrderLine): string {
  if (line.canCancel) {
    return `<button class="btn" data-do="cancelOrder" data-id="${line.id}">Cancel order</button>`;
  }
  if (line.kind === 'equipment') return '<span class="reason">At the gate, too late to call off</span>';
  return '';
}

/** What the tile or the row says about one thing on its way. */
function figures(line: OrderLine, day: number): string {
  const paid = line.pricePaid > 0 ? `${money(line.pricePaid)} paid · ` : '';
  return `${paid}ordered day ${line.orderedDay} · ${arrivalLine(line, day)}`;
}

function row(line: OrderLine, day: number): string {
  const name = line.detail === '' ? line.name : `${line.name} · ${line.detail}`;
  return (
    `<div class="row order-row" data-order="${line.id}">` +
    `<span class="row-main">${escapeHtml(name)}</span>` +
    `<span class="row-figure">${escapeHtml(figures(line, day))}</span>` +
    `<span class="row-figure">${progressBar(line)}</span>` +
    `<span class="row-action">${cancelButton(line)}</span></div>`
  );
}

export function renderShopping(state: GameState): string {
  const lines = shoppingList(state);
  if (lines.length === 0) return emptyLine('Nothing on order.');
  return (
    '<p class="hint">Everything bought and not here yet, the shortest wait first. The cash left ' +
    'the bank when you pressed Buy; this is what is still on the road.</p>' +
    lines.map((line) => row(line, state.clock.day)).join('')
  );
}
