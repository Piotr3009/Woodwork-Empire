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
import { glassUnitPrice, loadWords, restockSheets, restockSplit, storedWords } from '../engine/materials';
import { stockWords } from '../engine/machines';
import type { Delivery, GameState, Job, StockKind, StockLine } from '../engine/index';
import { placeholderSvg } from '../render/placeholder';
import { button, emptyLine, escapeHtml, lockedButton, money, plural } from './modal';
import { materialLine } from './jobCard';

/** The thumbnail, a flat coloured board in a fake photo frame, one per kind, drawn through the one
 *  placeholder function: the art side owes nothing for it (CLAUDE.md T13 9.8, T32 2.7). */
const THUMB_SIZE = { width: 64, height: 48 };

/** The placeholder each kind's thumbnail is drawn as: the sheets' of today, the solid wood's for the
 *  boards and the glass's for the glass (CLAUDE.md T32 2.7). */
const THUMB_KEY: Record<StockKind, string> = {
  sheets: 'thumb.sheet',
  boards: 'thumb.solidWood',
  glass: 'thumb.glass',
};

/** What each block of the page is headed, in the order sheets, boards, glass [TUNE wording]
 *  (CLAUDE.md T32 2.7). */
const BLOCK_NAME: Record<StockKind, string> = {
  sheets: 'Sheets',
  boards: 'Timber boards',
  glass: 'Glass',
};

/** The field each block's count is typed into, which the page remembers as it remembers the
 *  sheets' (CLAUDE.md T17 2.20, T32 2.7). */
export const STOCK_FIELD: Record<StockKind, string> = {
  sheets: 'stockSheets',
  boards: 'stockBoards',
  glass: 'stockGlass',
};

/** Where a restock past a kind's free places lands, in its words: on the rack, on the stores, on
 *  the racks [TUNE wording] (CLAUDE.md T24 2.8, T32 2.3). */
const ON_THE_KIT: Record<StockKind, string> = {
  sheets: 'on the rack',
  boards: 'on the stores',
  glass: 'on the racks',
};

/** The word after a count in a field, as the sheets' field says `sheets`. */
const UNIT_WORDS: Record<StockKind, string> = {
  sheets: 'sheets',
  boards: 'boards',
  glass: 'glass units',
};

function thumbnail(line: StockLine): string {
  const label = line.number.split('-')[0] ?? line.kind;
  return (
    '<span class="stock-thumb">' +
    placeholderSvg(THUMB_KEY[line.kind], THUMB_SIZE, { label }) +
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
 *  kind's free places (PIOTR, 16.09; CLAUDE.md T17 2.20). Anything that is not a number at all is
 *  nothing. */
function askedSheets(typed: string): number | undefined {
  const asked = Number(typed);
  if (typed.trim() === '' || !Number.isFinite(asked) || asked <= 0) return undefined;
  return Math.floor(asked);
}

/** What the typed number would pay a piece, and what the order comes to, said before the click and
 *  not after it: a sheet or a board is priced by how many are on the order from Turn 23, so the
 *  player has to be able to see the next band before he decides how many to buy [PIOTR, 20.09]
 *  (CLAUDE.md T23 2.16); a glass unit has its one price (CLAUDE.md T32 2.3). Empty while the field
 *  asks for nothing. */
function ladderLine(kind: StockKind, count: number): string {
  if (count <= 0) return '';
  const each = kind === 'glass' ? glassUnitPrice() : sheetPriceFor(count);
  return `${stockWords(kind, count)} at ${money(each)} = ${money(count * each)}`;
}

/** Where a restock of this many would land: on its kind's kit, and in the temporary store when the
 *  player has asked for more than it holds, with what the store charges. Said before the click,
 *  because the click is not trimmed any more and a man who types sixty gets sixty [PIOTR, 22.09]
 *  (CLAUDE.md T24 2.8, T32 2.3). Empty while the whole order fits. */
function storageLine(kind: StockKind, split: { onRack: number; toStorage: number; storageCost: number }): string {
  if (split.toStorage <= 0) return '';
  return (
    `${stockWords(kind, split.onRack + split.toStorage)}: ${split.onRack} ${ON_THE_KIT[kind]}, ` +
    `${split.toStorage} to storage at ${money(split.storageCost)}`
  );
}

/** A kind's field and the one button beside it: so many, whole, or the reason it cannot be
 *  pressed (CLAUDE.md T13 3.2, T17 2.20, T24 2.8, T32 2.3). The field is empty until he types in
 *  it, and what it would buy then is what fills the kind's free places, which the placeholder
 *  shows. */
function restockControl(state: GameState, kind: StockKind, typed: string): string {
  const check = restockCheck(state, kind, askedSheets(typed));
  const fills = restockSheets(state, kind);
  const split = restockSplit(state, kind, askedSheets(typed));
  const field =
    '<input type="text" inputmode="numeric" pattern="[0-9]*" class="num" ' +
    `data-field="${STOCK_FIELD[kind]}" value="${escapeHtml(typed)}" placeholder="${fills}" ` +
    `aria-label="${escapeHtml(BLOCK_NAME[kind])} to order" /> ${UNIT_WORDS[kind]}`;
  // The number the button would really buy, which is the number he typed: the price the player is
  // shown is the price he would pay.
  const line = ladderLine(kind, check.sheets);
  // The game's own figure span, with a hook on it for the test: no new class and no new token
  // (docs/ui-style.md 11).
  const price =
    line === '' ? '' : `<span class="row-figure" data-ladder="1">${escapeHtml(line)}</span>`;
  const where = storageLine(kind, split);
  const landing =
    where === '' ? '' : `<span class="row-figure" data-storage="1">${escapeHtml(where)}</span>`;
  const action = check.ok
    ? button(
        'restock',
        `Restock: ${stockWords(kind, check.sheets)}, ${money(check.cost)}`,
        `data-kind="${kind}" data-sheets="${check.sheets}"`,
      )
    : lockedButton('Restock', check.reason);
  return `${field}${price}${landing}<span class="row-action">${action}</span>`;
}

/** One block of the page: the kind's head row, today's head row in its markup, with its name and its
 *  control, and its stock line under it (CLAUDE.md T32 2.7; docs/mockups/t32/materials-page.html). */
function stockBlock(state: GameState, line: StockLine, typed: string): string {
  return (
    `<div class="row stock-head" data-stock-head="${line.kind}"><span class="row-main">${escapeHtml(BLOCK_NAME[line.kind])}</span>` +
    `${restockControl(state, line.kind, typed)}</div>` +
    `<div class="stock-list">${stockRow(line)}</div>`
  );
}

/** A project and its material line: green with the sheets in hand, red with the shortfall and
 *  the Order for this job button (CLAUDE.md T13 3.6). */
function projectRow(state: GameState, job: Job): string {
  return (
    `<div class="row" data-project="${job.id}">` +
    `<span class="row-main">${escapeHtml(job.name)} ${money(job.price)}</span>` +
    // A window's boards say boards (CLAUDE.md T29 2.11.2).
    `<span class="row-figure">${job.timber === true ? plural(job.sheets, 'board', 'boards') : plural(job.sheets, 'sheet', 'sheets')}` +
    `${job.bespokeMaterial ? ' · bespoke' : ''}</span>` +
    materialLine(state, job) +
    '</div>'
  );
}

function deliveryRow(delivery: Delivery): string {
  const what = `${loadWords(delivery)}${delivery.bespoke ? ', bespoke' : ''}`;
  const when = delivery.arrived
    ? 'at the gate, waiting to be unloaded'
    : `arrives ${formatCalendarDay(delivery.arriveDay)}`;
  return (
    `<div class="row"><span class="row-main">${escapeHtml(what)}</span>` +
    `<span class="row-figure">${escapeHtml(when)}</span></div>`
  );
}

/** The Stock tab. The arguments after the state are what the player has typed into each kind's
 *  field, the sheets', the boards' and the glass's, which that kind's Restock buys (CLAUDE.md T17
 *  2.20, T32 2.7). */
export function renderMaterials(state: GameState, sheets: string, boards = '', glass = ''): string {
  const typed: Record<StockKind, string> = { sheets, boards, glass };
  const lines = stockLines(state);
  // The projects whose material is still a question: a piece at the gate has used its sheets.
  const projects = openJobs(state).filter((job) => job.stage !== 'awaitingTransport');
  const deliveries = [...deliveriesInYard(state), ...deliveriesOnTheWay(state)];
  // The warning is the sheets' (CLAUDE.md T32 2.7).
  const shelving = lines.some((line) => line.kind === 'sheets' && line.capacity > 0);
  const stored = storedWords(state);
  return (
    (shelving
      ? ''
      : '<p class="warn">No shelving yet. Buy some from the catalogue before anything is ' +
        'delivered.</p>') +
    lines.map((line) => stockBlock(state, line, typed[line.kind])).join('') +
    (stored === '' ? '' : `<p class="hint">${escapeHtml(stored)} ${storedVerb(state)} in paid storage.</p>`) +
    '<h3>Projects</h3>' +
    (projects.length === 0
      ? emptyLine('No jobs on the books.')
      : projects.map((job) => projectRow(state, job)).join('')) +
    '<h3>Deliveries</h3>' +
    (deliveries.length === 0
      ? emptyLine('Nothing on the way.')
      : deliveries.map((delivery) => deliveryRow(delivery)).join(''))
  );
}

/** `is` for one sheet alone in the paid store, as today's hint said it, and `are` for anything
 *  more. */
function storedVerb(state: GameState): string {
  const { tempStorageSheets, tempStorageBoards, tempStorageGlass } = state.stock;
  return tempStorageSheets + tempStorageBoards + tempStorageGlass === 1 ? 'is' : 'are';
}
