// The Stock tab of the laptop, in the style of Joinery Core, the software Piotr sells: a list of
// stock lines, each with a thumbnail, a name and a stock number, the free and the reserved sheets
// and the total, a Low stock badge, and one Restock button at the top (PIOTR: "the player should
// recognise the software I sell, visually, and nothing more"; CLAUDE.md T13 3.2). Below the
// lines, the projects and their material in green and red (T13 3.6).
//
// What it does not have: categories, sub categories, suppliers, weighted averages, invoices. The
// free form "buy sheets for stock" of Turn 11 is gone with the per project question: Restock here
// and Order for this job on the job card are the two ways material is bought (T13 3.3).

import { deliveriesInYard, deliveriesOnTheWay, openJobs } from '../engine/index';
// T13-C1: export from index.ts
import { restockCheck, stockLines } from '../engine/materials';
import type { StockLine } from '../engine/materials';
import type { Delivery, GameState, Job } from '../engine/index';
import { placeholderSvg } from '../render/placeholder';
import { button, emptyLine, escapeHtml, lockedButton, money, plural } from './modal';
import { materialLine } from './jobCard';

/** The thumbnail, a flat coloured board in a fake photo frame, one per material kind, drawn
 *  through the one placeholder helper: the art side owes nothing for it (CLAUDE.md T13 9.8). */
const THUMB_SIZE = { width: 64, height: 48 };

function thumbnail(line: StockLine): string {
  const label = line.number.split('-')[0] ?? line.kind;
  return (
    '<span class="stock-thumb">' +
    placeholderSvg(`thumb.${line.kind}`, THUMB_SIZE, { label }) +
    '</span>'
  );
}

/** One stock line, as the software the player is meant to recognise would show it. */
function stockRow(line: StockLine): string {
  const badge = line.low
    ? `<span class="badge badge-low bad">Low stock, under ${line.lowUnder}</span>`
    : '';
  return (
    `<div class="stock-line" data-stock="${line.kind}">` +
    thumbnail(line) +
    `<span class="row-main"><span class="stock-name">${escapeHtml(line.name)}</span>` +
    `<span class="stock-number">${escapeHtml(line.number)}</span></span>` +
    `<span class="row-figure stock-free">Free ${line.free}</span>` +
    `<span class="row-figure stock-reserved">Reserved ${line.reserved}</span>` +
    `<span class="row-figure stock-total">Total ${line.total} of ${line.capacity}</span>` +
    badge +
    '</div>'
  );
}

/** The one button: every low line back to the restock figure, or the reason it cannot be
 *  pressed (CLAUDE.md T13 3.2). */
function restockControl(state: GameState): string {
  const check = restockCheck(state);
  if (!check.ok) return lockedButton('Restock', check.reason);
  return button(
    'restock',
    `Restock: ${plural(check.sheets, 'sheet', 'sheets')} to ${check.target} free, ${money(check.cost)}`,
  );
}

/** A project and its material line: green with the sheets in hand, red with the shortfall and
 *  the Order for this job button (CLAUDE.md T13 3.6). */
function projectRow(state: GameState, job: Job): string {
  return (
    `<div class="row" data-project="${job.id}">` +
    `<span class="row-main">${escapeHtml(job.name)} ${money(job.price)}</span>` +
    `<span class="row-figure">${plural(job.sheets, 'sheet', 'sheets')}` +
    `${job.bespokeMaterial ? ' · bespoke' : ''}</span>` +
    materialLine(state, job) +
    '</div>'
  );
}

function deliveryRow(delivery: Delivery): string {
  const what = `${plural(delivery.sheets, 'sheet', 'sheets')}${delivery.bespoke ? ', bespoke' : ''}`;
  const when = delivery.arrived
    ? 'at the gate, waiting to be unloaded'
    : `arrives day ${delivery.arriveDay}`;
  return (
    `<div class="row"><span class="row-main">${escapeHtml(what)}</span>` +
    `<span class="row-figure">${escapeHtml(when)}</span></div>`
  );
}

/** The Stock tab. The second argument is the laptop view's typed sheet count of Turn 11, kept for
 *  the signature the laptop calls and read by nothing: the page has no free form order any more
 *  (CLAUDE.md T13 3.2). */
export function renderMaterials(state: GameState, sheets: string): string {
  void sheets;
  const lines = stockLines(state);
  // The projects whose material is still a question: a piece at the gate has used its sheets.
  const projects = openJobs(state).filter((job) => job.stage !== 'awaitingTransport');
  const deliveries = [...deliveriesInYard(state), ...deliveriesOnTheWay(state)];
  const shelving = lines.some((line) => line.capacity > 0);
  return (
    (shelving
      ? ''
      : '<p class="warn">No shelving yet. Buy some from the catalogue before anything is ' +
        'delivered.</p>') +
    '<div class="row stock-head"><span class="row-main">Stock</span>' +
    `<span class="row-action">${restockControl(state)}</span></div>` +
    `<div class="stock-list">${lines.map(stockRow).join('')}</div>` +
    (state.stock.tempStorageSheets > 0
      ? `<p class="hint">${plural(state.stock.tempStorageSheets, 'sheet is', 'sheets are')} in paid storage.</p>`
      : '') +
    '<h3>Projects</h3>' +
    (projects.length === 0
      ? emptyLine('No jobs on the books.')
      : projects.map((job) => projectRow(state, job)).join('')) +
    '<h3>Deliveries</h3>' +
    (deliveries.length === 0
      ? emptyLine('Nothing on the way.')
      : deliveries.map(deliveryRow).join(''))
  );
}
