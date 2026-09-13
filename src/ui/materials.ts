// The materials and stock binder: order per job or buy sheets in advance (CLAUDE.md 10.1).
// Section 4 does not list this file, section 10.1 asks for the modal: noted in REPORT-T1.

import { SHEET_PRICE_STOCK } from '../engine/constants';
import {
  deliveriesInYard,
  deliveriesOnTheWay,
  materialModeLabel,
  openJobs,
  rackCapacity,
  stockCostFor,
  stockFree,
} from '../engine/index';
import type { GameState, Job } from '../engine/index';
import { button, emptyLine, escapeHtml, money, plural } from './modal';
import { fromStockControl } from './jobCard';

function jobRow(state: GameState, job: Job): string {
  const choosable = job.stage === 'accepted' || job.stage === 'materialPending';
  // Per job is a mode, and From stock is a thing that happens: one click takes what is on the
  // rack and the order is done (PIOTR, 13.09; CLAUDE.md T9 3.7).
  const modes = choosable
    ? `<button class="chip${job.materialMode === 'perJob' ? ' is-on' : ''}" ` +
      `data-do="setMaterialMode" data-id="${job.id}" data-mode="perJob">Per job</button>`
    : `<span class="dim">${escapeHtml(materialModeLabel(job.materialMode))}</span>`;
  return (
    `<div class="row"><span class="row-main">${escapeHtml(job.name)} ${money(job.price)}</span>` +
    `<span class="row-figure">${plural(job.sheets, 'sheet', 'sheets')} · ` +
    `${money(job.materialCost)}${job.bespokeMaterial ? ' · bespoke' : ''}</span>` +
    `<span class="row-action">${modes}</span>` +
    fromStockControl(state, job) +
    '</div>'
  );
}

export function renderMaterials(state: GameState, sheets: string): string {
  const wanted = Number(sheets) || 0;
  const jobs = openJobs(state);
  const yard = deliveriesInYard(state);
  const coming = deliveriesOnTheWay(state);
  return (
    (rackCapacity(state) === 0
      ? '<p class="warn">No shelving yet. Buy some from the catalogue before anything is ' +
        'delivered.</p>'
      : '') +
    `<p class="figures"><strong>${state.stock.sheets} / ${rackCapacity(state)}</strong> ` +
    `sheets on the rack, ${stockFree(state)} spaces free.` +
    (state.stock.tempStorageSheets > 0
      ? ` ${plural(state.stock.tempStorageSheets, 'sheet is', 'sheets are')} in paid storage.`
      : '') +
    '</p>' +
    '<h3>Buy sheets for stock</h3>' +
    `<p class="hint">${money(SHEET_PRICE_STOCK)} a sheet, cheaper than ordering per job. ` +
    'They arrive the next working day and have to be unloaded.</p>' +
    '<div class="row"><span class="row-main">' +
    '<input type="text" inputmode="numeric" pattern="[0-9]*" class="num" data-field="stockSheets" ' +
    `value="${escapeHtml(sheets)}" /> sheets</span>` +
    `<span class="row-figure">${money(stockCostFor(wanted))}</span>` +
    `<span class="row-action">${button('buyStock', 'Order', `data-sheets="${wanted}"`)}` +
    '</span></div>' +
    '<h3>Material for each job</h3>' +
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
