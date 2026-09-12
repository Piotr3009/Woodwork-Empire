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

function jobRow(job: Job): string {
  const choosable = job.stage === 'accepted' || job.stage === 'materialPending';
  const modes = choosable
    ? `<button class="chip${job.materialMode === 'perJob' ? ' is-on' : ''}" ` +
      `data-do="setMaterialMode" data-id="${job.id}" data-mode="perJob">Per job</button>` +
      `<button class="chip${job.materialMode === 'stock' ? ' is-on' : ''}" ` +
      `data-do="setMaterialMode" data-id="${job.id}" data-mode="stock">From stock</button>`
    : `<span class="dim">${escapeHtml(materialModeLabel(job.materialMode))}</span>`;
  return (
    `<div class="row"><span class="row-main">${escapeHtml(job.name)} ${money(job.price)}</span>` +
    `<span class="row-figure">${plural(job.sheets, 'sheet', 'sheets')} · ` +
    `${money(job.materialCost)}${job.bespokeMaterial ? ' · bespoke' : ''}</span>` +
    `<span class="row-action">${modes}</span></div>`
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
    '<input type="number" class="num" data-field="stockSheets" data-focus-key="stockSheets" ' +
    `value="${escapeHtml(sheets)}" min="1" max="99" /> sheets</span>` +
    `<span class="row-figure">${money(stockCostFor(wanted))}</span>` +
    `<span class="row-action">${button('buyStock', 'Order', `data-sheets="${wanted}"`)}` +
    '</span></div>' +
    '<h3>Material for each job</h3>' +
    (jobs.length === 0 ? emptyLine('No jobs on the books.') : jobs.map(jobRow).join('')) +
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
