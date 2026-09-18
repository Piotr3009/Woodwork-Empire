// The Machines page of the laptop: one row per machine and extractor standing in the hall, with
// its picture, its class, the green bar of its life and the Service button with its price on it
// (PIOTR; CLAUDE.md T20 2.9).
//
// The row is the game's own row (`.row`, `.row-main`, `.row-figure`, `.row-action`) and the bar is
// the game's own bar, the one a contract's week is drawn with (`.contract-track` and
// `.contract-fill`): a life against a total is the same picture as a week against its quantity,
// and the look is one look (docs/ui-style.md 11, 13). Nothing here computes a rule: the engine
// says what a machine's life is, what a service costs and whether one can be called, and the page
// prints it.

import {
  LIFE_LOW_FRACTION,
  findSpec,
  isSold,
  itemStandsInTheHall,
  lifeAfterServices,
  machineIsOut,
  originalLifeOf,
  pastEndurance,
  serviceCallCheck,
  serviceCostFor,
  serviceIsDue,
} from '../engine/index';
import type { Equipment, EquipmentSpec, GameState } from '../engine/index';
import { button, emptyLine, escapeHtml, money, reasonLabel } from './modal';
import { lifeFigures, pictureSlot } from './machine';

/** What stands on the floor and has a life to run out: the machines and the extraction kit. The
 *  office furniture, the rack and a tool in a cabinet are not plant and are not on this page. */
export function machinesInTheHall(state: GameState): Equipment[] {
  return state.equipment.filter((item) => {
    const category = findSpec(item.specId)?.category;
    if (category !== 'machine' && category !== 'extraction') return false;
    return itemStandsInTheHall(item) && !isSold(item);
  });
}

/** How much of the machine's life is gone, as a share of the whole, never past one. */
function lifeUsedShare(item: Equipment): number {
  if (item.enduranceHours <= 0) return 0;
  return Math.min(1, item.hoursUsed / item.enduranceHours);
}

/** True while there is less than a tenth of the life left, which is when the bar turns red. */
export function lifeIsLow(item: Equipment): boolean {
  if (item.enduranceHours <= 0) return false;
  return 1 - lifeUsedShare(item) < LIFE_LOW_FRACTION;
}

/** What the row says about the state the machine is in, or nothing while it is simply running. */
export function stateLabel(state: GameState, item: Equipment): string {
  if (item.broken) return 'broken';
  if (machineIsOut(item, state.clock.day)) return 'in service';
  if (pastEndurance(item)) return 'past its life';
  if (serviceIsDue(item)) return 'service due';
  return '';
}

/** What a service would buy this machine, in the words of the button's own title: half of the
 *  original life the first time and half of the last extension after that (CLAUDE.md T20 2.9.1). */
export function serviceGainLine(item: Equipment): string {
  const after = lifeAfterServices(originalLifeOf(item), item.serviceCount + 1);
  const gain = Math.max(0, Math.round(after - item.enduranceHours));
  return `${gain.toLocaleString('en-GB')} more hours of life`;
}

function machineRow(state: GameState, item: Equipment, spec: EquipmentSpec): string {
  const variant = spec.variants.find((entry) => entry.id === item.variantId);
  const className = variant?.name ?? item.variantId;
  const label = stateLabel(state, item);
  const check = serviceCallCheck(state, item.id);
  const action = check.ok
    ? button(
        'serviceMachine',
        `Service · ${money(serviceCostFor(item))}`,
        `data-id="${escapeHtml(item.id)}" title="${escapeHtml(serviceGainLine(item))}"`,
      )
    : reasonLabel(check.reason);
  const share = Math.round(lifeUsedShare(item) * 100);
  return (
    `<div class="row" data-machine="${escapeHtml(item.id)}">` +
    pictureSlot(spec.spriteKey, item.variantId, true) +
    `<span class="row-main">${escapeHtml(spec.name)}` +
    `<span class="hint"> · ${escapeHtml(className)}` +
    `${label === '' ? '' : ` · ${escapeHtml(label)}`}</span></span>` +
    '<span class="machine-life">' +
    `<span class="contract-track"><span class="contract-fill${lifeIsLow(item) ? ' is-low' : ''}" ` +
    `style="width:${share}%"></span></span>` +
    `<span class="row-figure">${escapeHtml(lifeFigures(item))}</span>` +
    '</span>' +
    `<span class="row-action">${action}</span></div>`
  );
}

export function renderMachinesPage(state: GameState): string {
  const rows = machinesInTheHall(state);
  if (rows.length === 0) return emptyLine('Nothing stands in the hall yet.');
  return (
    '<p class="hint">A service buys the machine more life and takes it out for the working ' +
    'day.</p>' +
    rows
      .map((item) => {
        const spec = findSpec(item.specId);
        return spec === null ? '' : machineRow(state, item, spec);
      })
      .join('')
  );
}
