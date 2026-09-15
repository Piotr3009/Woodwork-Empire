// The Stock tab of the laptop (CLAUDE.md T13 3.2). Phase A: the reservation rule on a plain page;
// phase B3 rebuilds it in the style of Joinery Core (the thumbnails, the stock numbers, the badge).

import { LOW_STOCK_SHEETS, SHEET_PRICE_STOCK } from '../engine/constants';
import {
  deliveriesInYard,
  deliveriesOnTheWay,
  freeSheets,
  openJobs,
  rackCapacity,
  reservedSheets,
  restockSheets,
  stockCostFor,
  stockFree,
  stockIsLow,
  stockNumberFor,
} from '../engine/index';
import type { GameState, Job } from '../engine/index';
import { button, emptyLine, escapeHtml, lockedButton, money, plural } from './modal';
import { materialLine } from './jobCard';

function jobRow(state: GameState, job: Job): string {
  return (
    `<div class="row"><span class="row-main">${escapeHtml(job.name)} ${money(job.price)}</span>` +
    `<span class="row-figure">${plural(job.sheets, 'sheet', 'sheets')}` +
    `${job.bespokeMaterial ? ' \u00b7 bespoke' : ''}</span>` +
    materialLine(state, job) +
    '</div>'
  );
}

export function renderMaterials(state: GameState, sheets: string): string {
  const wanted = Number(sheets) || 0;
  const jobs = openJobs(state);
  const yard = deliveriesInYard(state);
  const coming = deliveriesOnTheWay(state);
  const low = stockIsLow(state);
  const restock = restockSheets(state);
  return (
    (rackCapacity(state) === 0
      ? '<p class="warn">No shelving yet. Buy some from the catalogue before anything is ' +
        'delivered.</p>'
      : '') +
    `<div class="row">${
      restock > 0
        ? button('restock', `Restock: ${plural(restock, 'sheet', 'sheets')}, ${money(stockCostFor(restock))}`)
        : lockedButton('Restock', 'Nothing is low')
    }</div>` +
    `<div class="stock-line" data-stock="sheet">` +
    `<span class="stock-number">${escapeHtml(stockNumberFor(state, 'sheet'))}</span>` +
    '<span class="row-main">Sheets</span>' +
    `<span class="row-figure stock-free">Free ${freeSheets(state)}</span>` +
    `<span class="row-figure stock-reserved">Reserved ${reservedSheets(state)}</span>` +
    `<span class="row-figure">Total ${state.stock.sheets} / ${rackCapacity(state)}</span>` +
    (low ? `<span class="badge badge-low">Low stock, under ${LOW_STOCK_SHEETS}</span>` : '') +
    '</div>' +
    (state.stock.tempStorageSheets > 0
      ? `<p class="hint">${plural(state.stock.tempStorageSheets, 'sheet is', 'sheets are')} in paid storage.</p>`
      : '') +
    '<h3>Buy sheets for stock</h3>' +
    `<p class="hint">${money(SHEET_PRICE_STOCK)} a sheet. ` +
    `They arrive the next working day and have to be unloaded. ${stockFree(state)} spaces free.</p>` +
    '<div class="row"><span class="row-main">' +
    '<input type="text" inputmode="numeric" pattern="[0-9]*" class="num" data-field="stockSheets" ' +
    `value="${escapeHtml(sheets)}" /> sheets</span>` +
    `<span class="row-figure">${money(stockCostFor(wanted))}</span>` +
    `<span class="row-action">${button('buyStock', 'Order', `data-sheets="${wanted}"`)}` +
    '</span></div>' +
    '<h3>Projects and their material</h3>' +
    (jobs.length === 0
      ? emptyLine('No jobs on the books.')
      : jobs.map((job) => jobRow(state, job)).join('')) +
    '<h3>Deliveries</h3>' +
    (yard.length === 0 && coming.length === 0
      ? emptyLine('Nothing on the way.')
      : yard
          .map(
            (delivery) =>
              '<div class="row"><span class="row-main">' +
              `${plural(delivery.sheets, 'sheet', 'sheets')} at the gate` +
              '</span><span class="row-figure">waiting to be unloaded</span></div>',
          )
          .concat(
            coming.map(
              (delivery) =>
                '<div class="row"><span class="row-main">' +
                `${plural(delivery.sheets, 'sheet', 'sheets')}` +
                `${delivery.bespoke ? ', bespoke' : ''}</span>` +
                `<span class="row-figure">arrives day ${delivery.arriveDay}</span></div>`,
            ),
          )
          .join(''))
  );
}
