// The Stock tab of the laptop, in the style of Joinery Core, the software Piotr sells: a list of
// stock lines, each with a thumbnail, a name and a stock number, the free and the reserved sheets
// and the total, a Low stock badge, and one Restock button at the top (PIOTR: "the player should
// recognise the software I sell, visually, and nothing more"; CLAUDE.md T13 3.2). Below the
// lines, the projects and their material in green and red (T13 3.6).
//
// What it does not have: categories, sub categories, suppliers, weighted averages, invoices. The
// free form "buy sheets for stock" of Turn 11 is gone with the per project question: Restock here
// and Order for this job on the job card are the two ways material is bought (T13 3.3).

import { deliveriesInYard, deliveriesOnTheWay, formatCalendarDay, openJobs } from '../engine/index';
import { restockCheck, sheetPriceFor, stockLines } from '../engine/index';
// Straight off its own module: the public API does not carry it (REPORT-T13 10).
import { restockSheets } from '../engine/materials';
import type { Delivery, GameState, Job, StockLine } from '../engine/index';
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
  // A badge is red with white text in itself (CLAUDE.md T15 2.2): no colour class beside it.
  const badge = line.low
    ? `<span class="badge badge-low">Low stock, under ${line.lowUnder}</span>`
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

/** The number the player typed, or nothing when the field is empty and he wants what fills the
 *  rack (PIOTR, 16.09; CLAUDE.md T17 2.20). Anything that is not a number at all is nothing. */
function askedSheets(typed: string): number | undefined {
  const asked = Number(typed);
  if (typed.trim() === '' || !Number.isFinite(asked) || asked <= 0) return undefined;
  return Math.floor(asked);
}

/** What the typed number would pay a sheet, and what the order comes to, said before the click
 *  and not after it: a sheet is priced by how many are on the order from Turn 23, so the player
 *  has to be able to see the next band before he decides how many to buy
 *  [PIOTR, 20.09] (CLAUDE.md T23 2.16). Empty while the field asks for nothing the rack can hold. */
function ladderLine(sheets: number): string {
  if (sheets <= 0) return '';
  const each = sheetPriceFor(sheets);
  return `${plural(sheets, 'sheet', 'sheets')} at ${money(each)} = ${money(sheets * each)}`;
}

/** The field and the one button beside it: so many sheets, capped at the free places on the rack,
 *  or the reason it cannot be pressed (CLAUDE.md T13 3.2, T17 2.20). The field is empty until he
 *  types in it, and what it would buy then is what fills the rack, which the placeholder shows. */
function restockControl(state: GameState, typed: string): string {
  const check = restockCheck(state, askedSheets(typed));
  const fills = restockSheets(state);
  const field =
    '<input type="text" inputmode="numeric" pattern="[0-9]*" class="num" ' +
    `data-field="stockSheets" value="${escapeHtml(typed)}" placeholder="${fills}" ` +
    'aria-label="Sheets to order" /> sheets';
  // The number the button would really buy, which is the typed one capped at the free places on
  // the rack: the price the player is shown is the price he would pay.
  const line = ladderLine(check.sheets);
  // The game's own figure span, with a hook on it for the test: no new class and no new token
  // (docs/ui-style.md 11).
  const price =
    line === '' ? '' : `<span class="row-figure" data-ladder="1">${escapeHtml(line)}</span>`;
  const action = check.ok
    ? button(
        'restock',
        `Restock: ${plural(check.sheets, 'sheet', 'sheets')}, ${money(check.cost)}`,
        `data-sheets="${check.sheets}"`,
      )
    : lockedButton('Restock', check.reason);
  return `${field}${price}<span class="row-action">${action}</span>`;
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
    : `arrives ${formatCalendarDay(delivery.arriveDay)}`;
  return (
    `<div class="row"><span class="row-main">${escapeHtml(what)}</span>` +
    `<span class="row-figure">${escapeHtml(when)}</span></div>`
  );
}

/** The Stock tab. The second argument is what the player has typed into the sheet count, which
 *  Restock buys (CLAUDE.md T17 2.20). */
export function renderMaterials(state: GameState, sheets: string): string {
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
    `${restockControl(state, sheets)}</div>` +
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
