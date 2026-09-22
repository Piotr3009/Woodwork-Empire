// The equipment catalogue: everything buyable, laid out in the tabs Piotr asked for, with the
// locked ladder on show, and an Owned tab for what the hall already has (CLAUDE.md 9.2, T6 3.6).

import {
  AIR_DRYER,
  COMPRESSOR,
  EQUIPMENT_SPECS,
  EQUIPMENT_TABS,
  EXTRACTION_MARGIN,
  GATE_OUTPUT_BONUS,
  GATE_PRICE,
  LOW_AIR_FACTOR,
  SOFTWARE_ONE_OFF_PRICE,
  SOFTWARE_SUBSCRIPTION_MONTHLY,
  UNDER_EXTRACTION_OUTPUT_PENALTY,
} from '../engine/constants';
import type { EquipmentSpec, EquipmentTab, OnOrderItem } from '../engine/types';
import {
  airBlockFor,
  airCheck,
  airDemandOf,
  bagStore,
  bagStoreLine,
  bagsFull,
  canPlace,
  canSell,
  dayOneComplete,
  dayOneKit,
  compressorAirOf,
  compressorFor,
  compressorHasDryer,
  compressorLabel,
  compressors,
  dustOutputOf,
  extractionCapacityOf,
  extractionDemandOf,
  extractionStanding,
  isConnectedToExtraction,
  mediaFigure,
  connectCheck,
  hasCentralExtraction,
  pipeRunFor,
  wantsExtraction,
  orderSoftwareCheck,
  countOf,
  findSpec,
  hasExtraction,
  isSellableFamily,
  isServiced,
  isSold,
  itemStandsInTheHall,
  rackCapacity,
  salePriceFor,
  serviceDueOn,
  serviceIsDue,
} from '../engine/index';
import { formatCalendarDay, gateCheck, hasGate, variantFor } from '../engine/index';
import { serviceCallCheck, serviceDueIn, toolSlotsLine } from '../engine/machines';
import { slotsInUseIn } from '../engine/staff';
import { nextSpriteOrientation } from '../render/sprites';
import { orderName, orderProgress } from '../engine/orders';
import type { Equipment, GameState, OrderLine } from '../engine/index';
import { classBadge, classFrame, isMachineFamily, pictureSlot, renderMachine } from './machine';
import { arrivalLine, cancelButton, progressBar } from './shopping';
import {
  emptyLine,
  escapeHtml,
  filterField,
  lockedButton,
  money,
  plural,
  button,
  signedFigure,
  tabBar,
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

/** The list a workshop works down on its first day, at the top of every tab until it is done.
 *  Each line is a click into its own folder; the licence is not a machine, so its line opens the
 *  Office tab it lives on (PIOTR, 15.09; CLAUDE.md T11 3.6). */
function renderDayOne(state: GameState): string {
  const items = dayOneKit(state);
  if (dayOneComplete(state)) {
    return (
      '<div class="checklist is-done" data-checklist="dayOne">' +
      '<h3>Day one kit complete</h3></div>'
    );
  }
  const left = items.filter((item) => !item.done).length;
  const lines = items
    .map((item) => {
      return (
        `<button class="checklist-item${item.done ? ' is-done' : ''}" ` +
        `data-do="dayOneItem" data-id="${item.id}" data-kit="${item.id}">` +
        `<span class="checklist-tick">${item.done ? '&#10003;' : ''}</span>` +
        `<span class="checklist-name">${escapeHtml(item.label)}</span></button>`
      );
    })
    .join('');
  return (
    '<div class="checklist" data-checklist="dayOne">' +
    `<h3>Day one</h3><p class="hint">What a workshop needs before it can make anything. ` +
    `${plural(left, 'item', 'items')} to go.</p>` +
    `<div class="checklist-grid">${lines}</div></div>`
  );
}

export function renderCatalogue(
  state: GameState,
  filter: string,
  tab: CatalogueTab,
  folder: string | null = null,
  ownedTab: string = 'all',
  sellConfirm: string | null = null,
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
      ? renderOwned(state, filter, ownedTab, sellConfirm)
      : open !== null && (open.tab === tab || open.sharedTab === tab)
        ? renderOpenFolder(state, open, filter)
        : renderFolders(state, filter, tab) + (tab === 'computers' ? renderSoftware(state) : '');
  // The warnings go under the list, as a note at the foot of the page, not as a shout over the
  // tabs (PIOTR, 14.09).
  return (
    tabBar('catalogueTab', TABS, tab) +
    // The day one list stands over every tab, on the Office one and on the rest alike, until the
    // last of it is ticked (CLAUDE.md T11 3.6).
    renderDayOne(state) +
    filterField('catalogue', filter, 'Filter the catalogue') +
    body +
    (warnings === '' ? '' : `<div class="catalogue-notes">${warnings}</div>`)
  );
}

/** The folders of one tab: one per family, with what is in it and what the hall already has
 *  (CLAUDE.md T7 3.7). */
function renderFolders(state: GameState, filter: string, tab: CatalogueTab): string {
  const needle = filter.trim().toLowerCase();
  // A family two trades share is a folder under both tabs (CLAUDE.md T13 3.13).
  const inTab = EQUIPMENT_SPECS.filter((spec) => spec.tab === tab || spec.sharedTab === tab);
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
  // A machine that is sold does no more work: it stands there until the buyer comes (T8 3.5).
  if (isSold(item)) return 'sold, and it does no more work';
  if (item.broken) return 'stopped: broken';
  // The bags are the hall's, so what stops is everything that puts dust in them (T12 2.3).
  if (bagsFull(state) && dustOutputOf(item.specId) > 0) return 'stopped: bags full';
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
function renderOwned(
  state: GameState,
  filter: string,
  ownedTab: string,
  sellConfirm: string | null,
): string {
  const needle = filter.trim().toLowerCase();
  const subTabs: Array<[string, string]> = [
    ['all', 'All'],
    ...EQUIPMENT_TABS.map((entry): [string, string] => [entry.id, entry.label]),
  ];
  const bar = tabBar('ownedTab', subTabs, ownedTab);
  if (state.equipment.length === 0 && state.onOrder.length === 0) {
    return bar + emptyLine('Nothing here yet.');
  }
  // What is bought and not here yet is in the hall's list too, with the wait drawn on it
  // (CLAUDE.md T8 3.2).
  const ordered = state.onOrder
    .map((item) => ({ item, spec: findSpec(item.specId) }))
    .filter((entry): entry is { item: OnOrderItem; spec: EquipmentSpec } => entry.spec !== null)
    .filter(({ spec }) => ownedTab === 'all' || spec.tab === ownedTab)
    .filter(({ spec }) => needle === '' || spec.name.toLowerCase().includes(needle))
    .map(({ item, spec }) => orderedTile(state, item, spec))
    .join('');
  const tiles = state.equipment
    .map((item) => ({ item, spec: findSpec(item.specId) }))
    .filter((entry): entry is { item: Equipment; spec: EquipmentSpec } => entry.spec !== null)
    .filter(({ spec }) => ownedTab === 'all' || spec.tab === ownedTab)
    .filter(({ spec }) => needle === '' || spec.name.toLowerCase().includes(needle))
    .map(({ item, spec }) => ownedTile(state, item, spec, sellConfirm))
    .join('');
  const all = ordered + tiles;
  return bar + (all === '' ? emptyLine('Nothing matches that.') : `<div class="tile-grid">${all}</div>`);
}

/** One thing on its way, in the same frame as the kit that is here: what it is, what was paid,
 *  and how far along the wait is (CLAUDE.md T8 3.2). */
function orderedTile(state: GameState, item: OnOrderItem, spec: EquipmentSpec): string {
  const line: OrderLine = {
    id: item.id,
    kind: 'equipment',
    name: orderName(item),
    detail: spec.folder,
    pricePaid: item.pricePaid,
    orderedDay: item.orderedDay,
    dueDay: item.dueDay,
    progress: orderProgress(item, state.clock.day),
    arrived: item.arrived,
    canCancel: !item.arrived,
  };
  const lines = [`On order, due ${formatCalendarDay(item.dueDay)}`, arrivalLine(line, state.clock.day)]
    .map((text) => `<p class="tile-figures">${escapeHtml(text)}</p>`)
    .join('');
  return (
    `<div class="tile is-ordered" data-order="${item.id}">` +
    `<h3 class="tile-name">${escapeHtml(spec.name)} ` +
    '<span class="badge badge-ordered">On order</span></h3>' +
    pictureSlot(spec.spriteKey, item.variantId) +
    lines +
    `<p class="tile-figures">${progressBar(line)}</p>` +
    `<div class="tile-action">${cancelButton(line)}</div>` +
    '</div>'
  );
}

/** What this one has to do with the air: what a compressor gives, and what a machine or a dryer
 *  is on (PIOTR: "Air: compressor 2"; CLAUDE.md T10 3.2, 3.3). Empty for everything the air has
 *  nothing to do with. */
export function airStateLine(state: GameState, item: Equipment): string {
  if (item.specId === COMPRESSOR) {
    const gives = compressorAirOf(item);
    const dryer = compressorHasDryer(state, item) ? ', dry air' : ', wet air';
    return `${compressorLabel(state, item)}: ${gives.bar} bar, ` +
      `${gives.litres.toLocaleString('en-GB')} l/min${dryer}`;
  }
  // A consumer's air is in the specification block under the rule since v35, in colour; this line
  // is the compressor's own and the dryer's (PIOTR, 20.09).
  if (item.specId !== AIR_DRYER) return '';
  const on = compressorFor(state, item);
  const where = on === null ? 'no compressor in the hall' : compressorLabel(state, on);
  return `Fitted to: ${where}`;
}

/** The valve: which compressor this machine or this dryer draws from. One click each, and the
 *  one the hall already has it on is the chip that is on (CLAUDE.md T10 3.2). */
export function airAssign(state: GameState, item: Equipment): string {
  if (item.specId === COMPRESSOR) return '';
  if (airDemandOf(item) === null && item.specId !== AIR_DRYER) return '';
  const list = compressors(state);
  if (list.length < 2) return '';
  const on = compressorFor(state, item);
  const chips = list
    .map(
      (compressor) =>
        `<button class="chip${on?.id === compressor.id ? ' is-on' : ''}" data-do="assignAir" ` +
        `data-id="${item.id}" data-compressor="${compressor.id}">` +
        `${escapeHtml(compressorLabel(state, compressor))}</button>`,
    )
    .join('');
  return `<div class="tabs tabs-air">${chips}</div>`;
}

/** The one control on a machine the hall has finished with: what the buyer pays, and a second
 *  click to mean it (CLAUDE.md T8 3.5). */
function sellAction(state: GameState, item: Equipment, sellConfirm: string | null): string {
  if (item.soldOnDay !== null) {
    return `<span class="reason">Sold, collection on ${formatCalendarDay(item.soldOnDay)}</span>`;
  }
  if (!isSellableFamily(item.specId)) return '';
  // A rack goes when it is empty and nobody is at it (PIOTR, 18.09; CLAUDE.md T20 2.10), and it is
  // `canSell` that says so: one refusal, the engine's, printed here word for word.
  const check = canSell(state, item.id);
  if (!check.ok) return `<span class="reason">Cannot sell it: ${escapeHtml(check.reason)}</span>`;
  if (sellConfirm === item.id) {
    return button('sellMachine', 'Confirm sale', `data-id="${item.id}" data-confirm="1"`);
  }
  return button('sellMachine', `Sell for ${money(salePriceFor(item))}`, `data-id="${item.id}"`);
}

/** Turn: the thing stands at ninety degrees where it is, at the next orientation that has a
 *  picture (CLAUDE.md T22 2.11), and the game books the move the way it books any other. Greyed
 *  with the engine's own reason where the turned footprint does not fit, because a control the
 *  engine would refuse is never drawn (docs/ui-style.md 3; CLAUDE.md T22 2.13). */
function turnAction(state: GameState, item: Equipment): string {
  if (isSold(item)) {
    return `<span class="reason">Sold, collection on ${formatCalendarDay(item.soldOnDay ?? 0)}</span>`;
  }
  if (!itemStandsInTheHall(item)) return '';
  const spec = findSpec(item.specId);
  if (spec === undefined || spec === null) return '';
  const next = nextSpriteOrientation(spec.spriteKey, item.variantId, item.orientation);
  const check = canPlace(state, item.id, item.anchorX, item.anchorY, next);
  return check.ok
    ? button('turnItem', 'Turn', `data-id="${item.id}"`)
    : lockedButton('Turn', check.reason);
}

/** The two rows at the bottom of the card of a thing standing on the hall: Turn and Sell. One
 *  function draws them for the machine's card and the tool cabinet's alike, so the two cannot
 *  differ (PIOTR, 19.09; CLAUDE.md T22 2.13). */
export function turnAndSellRows(
  state: GameState,
  item: Equipment,
  sellConfirm: string | null,
): string {
  const turn = turnAction(state, item);
  const sell = sellAction(state, item, sellConfirm);
  return (
    (turn === '' ? '' : `<div class="tile-action" data-card-row="turn">${turn}</div>`) +
    (sell === '' ? '' : `<div class="tile-action" data-card-row="sell">${sell}</div>`)
  );
}

/** What a tool cabinet is for, on its own card: how many men's hand tools its class holds and how
 *  many of them are in use (PIOTR, 19.09; CLAUDE.md T22 2.13). Empty for everything else. */
function cabinetLine(state: GameState, item: Equipment): string {
  const holds = toolSlotsLine(item.specId, item.variantId);
  if (holds === '') return '';
  return `${holds} \u00b7 ${slotsInUseIn(state, item)} in use`;
}

/** The automatic gate on the card of a machine standing in the hall: bought once, for machines
 *  with an extraction demand, greyed as fitted once it is (CLAUDE.md T13 3.11). */
export function gateAction(state: GameState, item: Equipment): string {
  if (extractionDemandOf(item) <= 0) return '';
  if (hasGate(state, item)) return lockedButton('Gate fitted', 'An automatic gate is on its drop');
  const check = gateCheck(state, item.id);
  const label = `Automatic gate, ${money(GATE_PRICE)}`;
  return check.ok
    ? button('buyGate', label, `data-id="${item.id}"`)
    : lockedButton(label, check.reason);
}

/** Connect to extraction on the card of a machine standing in the hall: the game routes the pipe
 *  and the card says what the metres would cost; greyed once it is on, or where the ducts of a
 *  central system reach it already (CLAUDE.md T13 3.19). */
export function connectAction(state: GameState, item: Equipment): string {
  if (!wantsExtraction(item)) return '';
  if (hasCentralExtraction(state)) return '';
  const run = pipeRunFor(state, item.id);
  if (run !== null) return lockedButton('Connected', `${run.metres} m of pipe to the extraction`);
  const check = connectCheck(state, item.id);
  const label = `Connect to extraction, ${money(check.cost)}`;
  return check.ok
    ? button('connectExtraction', label, `data-id="${item.id}"`)
    : lockedButton(label, check.reason);
}

/** The hall's bag store on the extractor's own card: the line and the small bar that goes red
 *  when it is full (CLAUDE.md T12 3.3). It was a note under the hall, written by a click on the
 *  fan; the click opens the fan's card now and the store is on it (CLAUDE.md T17 2.6). */
function bagStoreBlock(state: GameState, item: Equipment): string {
  if (item.specId !== 'extractor') return '';
  const store = bagStore(state);
  if (!store.exists) return '';
  const percent = store.capacityM3 <= 0 ? 0 : Math.min(100, (store.fillM3 / store.capacityM3) * 100);
  return (
    `<p class="tile-figures">${escapeHtml(bagStoreLine(store))} ` +
    `<span class="bag-gauge${store.full ? ' is-full' : ''}" role="img" ` +
    `aria-label="${escapeHtml(bagStoreLine(store))}">` +
    `<span class="bag-gauge-fill" style="width:${percent.toFixed(1)}%"></span></span></p>`
  );
}

/** The pipe on the card: how much of it there is, or that there is none (CLAUDE.md T13 3.19). */
function pipeLine(state: GameState, item: Equipment): string {
  if (!wantsExtraction(item) || hasCentralExtraction(state)) return '';
  const run = pipeRunFor(state, item.id);
  return run === null
    ? 'not connected to the extraction'
    : `${run.metres} m of pipe to the extraction`;
}

/** What the gate does once it is on: the signed line, through the one helper (CLAUDE.md T13 1).
 *  It says the second half of what a gate is for as well from Turn 23, because the output is the
 *  small half of it and the duct is the large one [PIOTR, 20.09] (CLAUDE.md T23 2.15). */
function gateLine(state: GameState, item: Equipment): string {
  if (!hasGate(state, item)) return '';
  const per = Math.round(GATE_OUTPUT_BONUS * 100);
  const words = `Automatic gate fitted: output +${per}%, counts only while running`;
  return `<p class="tile-figures">${signedFigure(words, per)}</p>`;
}

/** One line of the specification under the rule of a card: what the thing needs from the hall
 *  or gives it, against what the hall has. `ok` paints it green; `false` paints it red and is
 *  followed by the line that says what it costs (PIOTR, 20.09). */
export interface SpecLine {
  text: string;
  ok: boolean;
}

/** The specification of a thing on the hall, read off the same tables the hall runs on: the
 *  extraction it wants or pulls against the standing sum of `extractionStanding`, and the air it
 *  wants against the compressor it is on. Green while the hall meets it, red with the cost in
 *  output when it does not, so the player reads it on the card and not in the catalogue
 *  (PIOTR, 20.09). */
export function specLines(state: GameState, item: Equipment): SpecLine[] {
  const out: SpecLine[] = [];
  const dustPenalty = Math.round(UNDER_EXTRACTION_OUTPUT_PENALTY * 100);
  const wants = extractionDemandOf(item);
  if (wants > 0) {
    const hall = extractionStanding(state);
    const connected = isConnectedToExtraction(state, item);
    const enough = hall.demand <= hall.allowed;
    out.push({
      text: `Extraction: needs ${mediaFigure(wants)} m³/h · hall has ${mediaFigure(hall.allowed)} usable`,
      ok: connected && enough,
    });
    if (!connected) {
      out.push({ text: `Not connected: output −${dustPenalty}% while it runs`, ok: false });
    } else if (!enough) {
      out.push({
        text:
          `Extractor too small: ${hall.machines} machines need ${mediaFigure(hall.demand)} · ` +
          `output −${dustPenalty}% while short`,
        ok: false,
      });
    }
    // What a gate would buy, on the card of a machine that has not got one, in the good token and
    // above the button that buys it. The output is the small half of it and the player could read
    // it on the class card already; what he could not read anywhere is that a gated drop is shut
    // while nobody is standing at the machine, and a shut drop is that machine's whole demand back
    // in the duct for everything else [PIOTR, 20.09] (CLAUDE.md T13 3.11, T23 2.15). Both figures
    // are read: the bonus off its constant and the litres off the machine's own demand.
    if (!hasGate(state, item)) {
      const per = Math.round(GATE_OUTPUT_BONUS * 100);
      out.push({
        text:
          `Automatic gate: +${per}% output, and it counts toward the extraction only while it ` +
          `runs (frees ${mediaFigure(wants)} m³/h while it stands)`,
        ok: true,
      });
    }
  }
  const pulls = extractionCapacityOf(item);
  if (pulls > 0) {
    const hall = extractionStanding(state);
    const usable = Math.round(pulls * EXTRACTION_MARGIN);
    const ok = hall.demand <= hall.allowed;
    out.push({
      text:
        `Pulls ${mediaFigure(pulls)} m³/h, ${mediaFigure(usable)} usable · ` +
        `${hall.machines} connected ${hall.machines === 1 ? 'machine needs' : 'machines need'} ${mediaFigure(hall.demand)}`,
      ok,
    });
    if (!ok) {
      out.push({
        text: `Too many machines for the extraction: output −${dustPenalty}% while short`,
        ok: false,
      });
    }
  }
  const air = airDemandOf(item);
  if (air !== null) {
    const on = compressorFor(state, item);
    const block = airBlockFor(state, item);
    const line = on === null ? undefined : airCheck(state).compressors.find((entry) => entry.id === on.id);
    const gives = on === null ? null : compressorAirOf(on);
    const have =
      on === null || gives === null
        ? 'no compressor in the hall'
        : `${compressorLabel(state, on)} gives ${gives.bar} bar, ${gives.litres.toLocaleString('en-GB')} l/min`;
    const low = line !== undefined && line.low;
    out.push({
      text: `Air: needs ${air.bar} bar, ${air.litres.toLocaleString('en-GB')} l/min · ${have}`,
      ok: block === '' && !low,
    });
    if (block !== '') {
      out.push({ text: `Will not run: ${block}`, ok: false });
    } else if (line !== undefined && low) {
      out.push({
        text:
          `Compressor short of air: ${mediaFigure(line.drawn)} l/min drawn of ` +
          `${mediaFigure(line.allowed)} usable · runs at −${Math.round((1 - LOW_AIR_FACTOR) * 100)}%`,
        ok: false,
      });
    }
  }
  return out;
}

/** The specification block under its rule, or nothing for a thing that asks the hall for nothing
 *  and gives it nothing (a bench, a cabinet, a rack). */
function specBlock(state: GameState, item: Equipment): string {
  const lines = specLines(state, item);
  if (lines.length === 0) return '';
  return (
    '<hr class="tile-rule">' +
    lines
      .map(
        (line) =>
          `<p class="tile-figures spec-line ${line.ok ? 'good' : 'warn'}">${escapeHtml(line.text)}</p>`,
      )
      .join('')
  );
}

/** One machine's card as the Owned tab draws it. From Turn 17 the machine's own modal, opened by
 *  a click on it on the hall, is this same card: one drawing and one set of buttons, so Connect to
 *  extraction cannot be on one and missing from the other (CLAUDE.md T17 2.6). */
export function ownedTile(
  state: GameState,
  item: Equipment,
  spec: EquipmentSpec,
  sellConfirm: string | null,
): string {
  const variant = variantFor(item);
  const className = variant?.name ?? 'standard';
  // The hours and the service belong to the kit the hours are booked on, which the engine's own
  // `isServiced` names: the machines, and from Turn 23 the fans, which book their hours while the
  // extraction runs and are serviced exactly as a machine is (CLAUDE.md T6 3.6, T23 2.8).
  const machine = isServiced(spec.id);
  // Six months on the calendar from the purchase or the last service, whether it ran or stood
  // (PIOTR, 22.09; v51): the date and the days to it, no hours of use in it any more.
  const service = !machine
    ? ''
    : serviceIsDue(item, state.clock.day)
      ? 'service due now'
      : `service on ${formatCalendarDay(serviceDueOn(item))}, in ${plural(serviceDueIn(item, state.clock.day), 'day', 'days')}`;
  const life = machine ? `${hours(item.hoursUsed)} of ${hours(item.enduranceHours)}` : '';
  // A service is called in and paid for, and the machine goes out for the working day, so the
  // card offers it only while the engine would take the call (CLAUDE.md T4 3.2, T20 2.9).
  const action = item.broken
    ? button('repairMachine', 'Repair', `data-id="${item.id}"`)
    : machine && serviceIsDue(item, state.clock.day) && serviceCallCheck(state, item.id).ok
      ? button('serviceMachine', 'Service', `data-id="${item.id}"`)
      : '';
  // Shifting it is setting the hall out, which is the one way anything moves (CLAUDE.md T4 3.5):
  // the button takes him there and he drags it where he wants it (CLAUDE.md T17 2.6). Only what
  // can actually be dragged is offered it, and the engine's own check says which: the office
  // furniture, the welfare kit in the canteen and a tool in a cabinet are not on the floor.
  const canMove =
    !isSold(item) &&
    itemStandsInTheHall(item) &&
    canPlace(state, item.id, item.anchorX, item.anchorY).ok;
  const move = canMove ? button('startSetup', 'Move') : '';
  // The bags are the hall's, and the button that empties them is the one the chip over the floor
  // presses (CLAUDE.md T12 2.3, T17 2.5).
  const bags = item.specId === 'extractor' && bagsFull(state) ? button('emptyBags', 'Empty bags') : '';
  const lines = [
    className,
    spec.effect,
    life,
    service,
    cabinetLine(state, item),
    ownedState(state, item),
    pipeLine(state, item),
    airStateLine(state, item),
  ]
    .filter((line) => line !== '')
    .map((line) => `<p class="tile-figures">${escapeHtml(line)}</p>`)
    .join('');
  // The card of a class the hall has wears the class badge and frame every class card wears, the
  // same across families (CLAUDE.md T13 3.12).
  const ladder = isMachineFamily(spec);
  const frame = ladder ? classFrame(item.variantId) : { className: '', style: '' };
  const badge = ladder ? classBadge(item.variantId) : '';
  return (
    `<div class="tile is-owned${frame.className}"${frame.style} data-owned="${item.id}">` +
    `<h3 class="tile-name">${escapeHtml(spec.name)} ${badge}` +
    '<span class="badge badge-owned">Owned</span></h3>' +
    pictureSlot(spec.spriteKey, item.variantId) +
    lines +
    specBlock(state, item) +
    bagStoreBlock(state, item) +
    gateLine(state, item) +
    airAssign(state, item) +
    '<div class="tile-action">' +
    `${action}${bags}${connectAction(state, item)}${gateAction(state, item)}${move}</div>` +
    // Turn and Sell are the two rows at the bottom of every card of a thing on the hall, drawn by
    // the one function (CLAUDE.md T22 2.13). The sale was in the row above until tonight; it has
    // moved rather than been doubled, because there is one Sell in the game.
    turnAndSellRows(state, item, sellConfirm) +
    '</div>'
  );
}

function renderSoftware(state: GameState): string {
  const oneOff = orderSoftwareCheck(state, 'oneOff');
  const subscription = orderSoftwareCheck(state, 'subscription');
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
