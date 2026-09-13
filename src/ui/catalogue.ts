// The equipment catalogue: everything buyable, laid out in the tabs Piotr asked for, with the
// locked ladder on show, and an Owned tab for what the hall already has (CLAUDE.md 9.2, T6 3.6).

import {
  EQUIPMENT_SPECS,
  EQUIPMENT_TABS,
  SOFTWARE_ONE_OFF_PRICE,
  SOFTWARE_SUBSCRIPTION_MONTHLY,
} from '../engine/constants';
import type { EquipmentSpec, EquipmentTab } from '../engine/types';
import {
  bagsExist,
  orderCheck,
  countOf,
  findSpec,
  hasExtraction,
  rackCapacity,
  serviceDueOn,
  serviceIsDue,
} from '../engine/index';
import { serviceDueIn, variantFor } from '../engine/machines';
import type { Equipment, GameState } from '../engine/index';
import { pictureSlot, renderMachine } from './machine';
import {
  emptyLine,
  escapeHtml,
  filterField,
  lockedButton,
  money,
  plural,
  button,
  tabBar,
  tripLine,
} from './modal';

/** The tab the catalogue opens on, and the one the Owned list lives under. */
export type CatalogueTab = EquipmentTab | 'owned';
export const CATALOGUE_FIRST_TAB: CatalogueTab = 'computers';
export const OWNED_TAB: CatalogueTab = 'owned';

/** The tab a string names, or the first one. Nothing else can reach the renderer. */
export function catalogueTabFrom(value: string | undefined): CatalogueTab {
  if (value === OWNED_TAB) return OWNED_TAB;
  const found = EQUIPMENT_TABS.find((tab) => tab.id === value);
  return found ? found.id : CATALOGUE_FIRST_TAB;
}

/** Every tab of the catalogue in the order Piotr gave, with Owned on the end (CLAUDE.md T6 3.6). */
const TABS: Array<[string, string]> = [
  ...EQUIPMENT_TABS.map((entry): [string, string] => [entry.id, entry.label]),
  [OWNED_TAB, 'Owned'],
];

export function renderCatalogue(
  state: GameState,
  filter: string,
  tab: CatalogueTab,
  folder: string | null = null,
  ownedTab: string = 'all',
): string {
  const warnings =
    (hasExtraction(state)
      ? ''
      : '<p class="warn">No extraction in the hall. No machine will run without it.</p>') +
    (rackCapacity(state) > 0
      ? ''
      : '<p class="warn">No shelving in the hall. Nothing can be unloaded without it.</p>');
  const open = folder === null ? null : EQUIPMENT_SPECS.find((spec) => spec.id === folder) ?? null;
  // The management software runs on the laptop, so it is under Computers with it and not on
  // every tab of the catalogue (CLAUDE.md T6 3.6).
  const body =
    tab === OWNED_TAB
      ? renderOwned(state, filter, ownedTab)
      : open !== null && open.tab === tab
        ? renderOpenFolder(state, open, filter)
        : renderFolders(state, filter, tab) + (tab === 'computers' ? renderSoftware(state) : '');
  return (
    // What the trip out is costing him so far, and that nothing is his until it is over
    // (CLAUDE.md T7 3.10).
    tripLine(state, 'shopping') +
    warnings +
    tabBar('catalogueTab', TABS, tab) +
    filterField('catalogue', filter, 'Filter the catalogue') +
    body
  );
}

/** The folders of one tab: one per family, with what is in it and what the hall already has
 *  (CLAUDE.md T7 3.7). */
function renderFolders(state: GameState, filter: string, tab: CatalogueTab): string {
  const needle = filter.trim().toLowerCase();
  const inTab = EQUIPMENT_SPECS.filter((spec) => spec.tab === tab);
  if (inTab.length === 0) return emptyLine('Nothing here yet.');
  const rows = inTab
    .filter(
      (spec) =>
        needle === '' ||
        spec.folder.toLowerCase().includes(needle) ||
        spec.name.toLowerCase().includes(needle),
    )
    .map((spec) => {
      const count = countOf(state, spec.id);
      const owned = count > 0 ? `<span class="badge badge-owned">Owned ${count}</span>` : '';
      return (
        `<div class="card folder" data-folder="${spec.id}">` +
        `<div class="card-main"><h3>${escapeHtml(spec.folder)} ${owned}</h3>` +
        `<p class="figures"><strong>from ${money(spec.price)}</strong> · ` +
        `${plural(spec.variants.length, 'class', 'classes')} · ` +
        `${escapeHtml(spec.effect)}</p>` +
        `</div><div class="card-action">` +
        button('openFolder', 'Open', `data-id="${spec.id}"`) +
        '</div></div>'
      );
    })
    .join('');
  return rows === '' ? emptyLine('Nothing matches that.') : rows;
}

/** Inside a folder: the classes of that one family, and the way back out of it. */
function renderOpenFolder(state: GameState, spec: EquipmentSpec, filter: string): string {
  const label = EQUIPMENT_TABS.find((entry) => entry.id === spec.tab)?.label ?? 'the catalogue';
  return (
    '<div class="folder-head">' +
    button('closeFolder', `Back to ${label}`) +
    `<h3>${escapeHtml(spec.folder)}</h3></div>` +
    renderMachine(state, spec.id, filter)
  );
}

/** What is standing in the hall, in the state it is in (CLAUDE.md T6 3.6). */
export function ownedState(state: GameState, item: Equipment): string {
  if (item.broken) return 'stopped: broken';
  if (item.bagFull && bagsExist(state)) return 'stopped: bag full';
  const spec = findSpec(item.specId);
  if (spec?.category === 'machine' && !hasExtraction(state)) return 'stopped: no extraction';
  return 'running';
}

function hours(value: number): string {
  return `${Math.round(value * 10) / 10} h`;
}

/** What is standing in the hall, laid out like the shop: the same category tabs underneath, one
 *  tile per machine with its class, its picture, its hours, its service and its state, framed as
 *  owned (PIOTR, 13.09: "not a list, like shopping"). */
function renderOwned(state: GameState, filter: string, ownedTab: string): string {
  const needle = filter.trim().toLowerCase();
  const subTabs: Array<[string, string]> = [
    ['all', 'All'],
    ...EQUIPMENT_TABS.map((entry): [string, string] => [entry.id, entry.label]),
  ];
  const bar = tabBar('ownedTab', subTabs, ownedTab);
  if (state.equipment.length === 0) return bar + emptyLine('Nothing here yet.');
  const tiles = state.equipment
    .map((item) => ({ item, spec: findSpec(item.specId) }))
    .filter((entry): entry is { item: Equipment; spec: EquipmentSpec } => entry.spec !== null)
    .filter(({ spec }) => ownedTab === 'all' || spec.tab === ownedTab)
    .filter(({ spec }) => needle === '' || spec.name.toLowerCase().includes(needle))
    .map(({ item, spec }) => ownedTile(state, item, spec))
    .join('');
  return bar + (tiles === '' ? emptyLine('Nothing matches that.') : `<div class="tile-grid">${tiles}</div>`);
}

function ownedTile(state: GameState, item: Equipment, spec: EquipmentSpec): string {
  const variant = variantFor(item);
  const className = variant?.name ?? 'standard';
  // The hours and the service belong to the machines the hours are booked on. An extractor
  // is repaired and never serviced, so it shows its state and no clock (CLAUDE.md T6 3.6).
  const machine = spec.category === 'machine';
  const due = serviceDueOn(state, item);
  const service = !machine
    ? ''
    : serviceIsDue(item)
      ? 'service due now'
      : due === null
        ? 'no service due while it stands idle'
        : `service on day ${due}, ${hours(serviceDueIn(item))} of use away`;
  const life = machine ? `${hours(item.hoursUsed)} of ${hours(item.enduranceHours)}` : '';
  const action = item.broken
    ? button('repairMachine', 'Repair', `data-id="${item.id}"`)
    : machine && serviceIsDue(item)
      ? button('serviceMachine', 'Service', `data-id="${item.id}"`)
      : '';
  const lines = [className, life, service, ownedState(state, item)]
    .filter((line) => line !== '')
    .map((line) => `<p class="tile-figures">${escapeHtml(line)}</p>`)
    .join('');
  return (
    `<div class="tile is-owned" data-owned="${item.id}">` +
    `<h3 class="tile-name">${escapeHtml(spec.name)} <span class="badge badge-owned">Owned</span></h3>` +
    pictureSlot(spec.spriteKey, item.variantId) +
    lines +
    `<div class="tile-action">${action}</div>` +
    '</div>'
  );
}

function renderSoftware(state: GameState): string {
  const oneOff = orderCheck(state, { kind: 'software', mode: 'oneOff' });
  const subscription = orderCheck(state, { kind: 'software', mode: 'subscription' });
  const current =
    state.software.mode === 'none'
      ? 'No licence'
      : state.software.mode === 'oneOff'
        ? `One off, ${state.software.jobsRemaining} jobs left`
        : 'Subscription';
  return (
    '<h3>Management software</h3>' +
    `<p class="hint">${escapeHtml(current)}</p>` +
    '<div class="card"><div class="card-main"><h3>One off licence</h3>' +
    `<p class="figures"><strong>${money(SOFTWARE_ONE_OFF_PRICE)}</strong> · ` +
    'good for 30 jobs, then buy it again.</p></div>' +
    `<div class="card-action">${
      oneOff.ok
        ? button('buySoftware', 'Buy', 'data-id="oneOff"')
        : lockedButton('Buy', oneOff.reason)
    }</div></div>` +
    '<div class="card"><div class="card-main"><h3>Subscription</h3>' +
    `<p class="figures"><strong>${money(SOFTWARE_SUBSCRIPTION_MONTHLY)}</strong> a month · ` +
    'quietly eats cash on the 1st.</p></div>' +
    `<div class="card-action">${
      subscription.ok
        ? button('buySoftware', 'Subscribe', 'data-id="subscription"')
        : lockedButton('Subscribe', subscription.reason)
    }</div></div>`
  );
}
