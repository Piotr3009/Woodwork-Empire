// @vitest-environment jsdom
// The catalogue in the tabs Piotr asked for, and the Owned tab that says what the hall has and
// what state it is in (CLAUDE.md T6 3.6).

import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_SPECS,
  EQUIPMENT_TABS,
  GATE_PRICE,
  HOURS_PER_WORKING_DAY,
  SERVICE_INTERVAL_HOURS,
} from '../../src/engine/constants';
import { catalogueTabFrom, ownedState, renderCatalogue } from '../../src/ui/catalogue';
import { findSpec } from '../../src/engine/machines';
import { addWorkingDays } from '../../src/engine/clock';
import { machineHoursPerDay } from '../../src/engine/production';
import type { Equipment, GameState } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyNow,
  buyStartingKit,
  fillBags,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
} from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function shop(state: GameState, tab: string, filter = '', folder: string | null = null): HTMLElement {
  return parse(renderCatalogue(state, filter, catalogueTabFrom(tab), folder));
}

describe('the automatic gate on the card of a machine in the hall (CLAUDE.md T13 3.11)', () => {
  it('is a button on a machine with a drop, greyed as fitted once it is, and absent on a bench', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    if (!saw || !bench) throw new Error('no kit');
    const page = shop(state, 'owned');
    const button = page.querySelector(`[data-do="buyGate"][data-id="${saw.id}"]`);
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe(`Automatic gate, \u00a3${GATE_PRICE.toLocaleString('en-GB')}`);
    // A bench wants no extraction, so its card has no gate at all.
    expect(page.querySelector(`[data-owned="${bench.id}"] [data-do="buyGate"]`)).toBeNull();
    expect(page.querySelector(`[data-owned="${bench.id}"]`)?.textContent).not.toContain('gate');
    state = act(state, { type: 'BUY_GATE', equipmentId: saw.id });
    const fitted = shop(state, 'owned').querySelector(`[data-owned="${saw.id}"]`);
    expect(fitted?.querySelector('[data-do="buyGate"]')).toBeNull();
    const greyed = Array.from(fitted?.querySelectorAll('button[disabled]') ?? []).map(
      (node) => node.textContent,
    );
    expect(greyed).toContain('Gate fitted');
    // What it does is on the card, coloured by its sign (CLAUDE.md T13 1).
    expect(fitted?.querySelector('.figure.good')?.textContent).toBe(
      'Automatic gate fitted: output +2%',
    );
  });
});

describe('connect to extraction on the card of a machine in the hall (CLAUDE.md T13 3.19)', () => {
  it('offers the pipe at its cost, greys it once it is on, and never on a bench or under the ducts', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    if (!saw || !bench) throw new Error('no kit');
    // The day 1 kit stands connected: the button is greyed and the card says how much pipe.
    const connected = shop(state, 'owned').querySelector(`[data-owned="${saw.id}"]`);
    expect(connected?.querySelector('[data-do="connectExtraction"]')).toBeNull();
    const greyed = Array.from(connected?.querySelectorAll('button[disabled]') ?? []).map(
      (node) => node.textContent,
    );
    expect(greyed).toContain('Connected');
    expect(connected?.textContent).toMatch(/\d+ m of pipe to the extraction/);
    // Off the extraction: the button, with the cost the game would charge for the route.
    state.pipes = [];
    const page = shop(state, 'owned');
    const button = page.querySelector(`[data-do="connectExtraction"][data-id="${saw.id}"]`);
    expect(button).not.toBeNull();
    expect(button?.textContent).toMatch(/^Connect to extraction, \u00a3[\d,]+$/);
    expect(page.querySelector(`[data-owned="${saw.id}"]`)?.textContent).toContain(
      'not connected to the extraction',
    );
    // A bench wants no pipe, and its card says nothing about one.
    expect(page.querySelector(`[data-owned="${bench.id}"] [data-do="connectExtraction"]`)).toBeNull();
    expect(page.querySelector(`[data-owned="${bench.id}"]`)?.textContent).not.toContain('extraction');
    // One click connects it and the ledger carries the metres (CLAUDE.md T13 3.19).
    state = act(state, { type: 'CONNECT_EXTRACTION', equipmentId: saw.id });
    expect(state.pipes.some((run) => run.equipmentId === saw.id)).toBe(true);
    expect(state.ledger[state.ledger.length - 1]?.category).toBe('pipes');
    expect(
      shop(state, 'owned').querySelector(`[data-owned="${saw.id}"] [data-do="connectExtraction"]`),
    ).toBeNull();
  });
});

describe('the tabs', () => {
  it('are the eleven Piotr named, in his order, with Owned after them', () => {
    expect(EQUIPMENT_TABS.map((tab) => tab.label)).toEqual([
      'Office',
      'Sheet machines',
      'Timber machines',
      'Spraying',
      'Sanding',
      'Hand tools',
      'Extraction and air',
      'CNC',
      'CNC centre',
      'Handling',
      'Storage',
    ]);
    const chips = Array.from(
      shop(newGame(), 'sheetMachines').querySelectorAll('[data-do="catalogueTab"]'),
    ).map((chip) => chip.getAttribute('data-id'));
    expect(chips).toEqual([...EQUIPMENT_TABS.map((tab) => tab.id), 'owned']);
  });

  it('gives every line of the catalogue a tab, and every tab a real one', () => {
    const known = new Set(EQUIPMENT_TABS.map((tab) => tab.id));
    for (const spec of EQUIPMENT_SPECS) {
      expect(known.has(spec.tab), `${spec.id}: ${spec.tab}`).toBe(true);
    }
    // And nothing is on two tabs, or on none.
    const counted = EQUIPMENT_SPECS.filter((spec) => known.has(spec.tab)).length;
    expect(counted).toBe(EQUIPMENT_SPECS.length);
  });

  it('shows only its own folders, and says so when it has none', () => {
    const state = newGame();
    const saws = shop(state, 'sheetMachines');
    expect(saws.innerHTML).toContain('Table saws');
    expect(saws.innerHTML).toContain('Edgebanders');
    expect(saws.innerHTML).not.toContain('Drills');
    const hand = shop(state, 'handTools');
    expect(hand.innerHTML).toContain('Drills');
    expect(hand.innerHTML).not.toContain('Table saws');
    // Sanding and the CNC centre have nothing in them tonight.
    expect(shop(state, 'sanding').innerHTML).toContain('Nothing here yet.');
    expect(shop(state, 'cncCentre').innerHTML).toContain('Nothing here yet.');
  });

  it('holds the folders Piotr named, each one a family (CLAUDE.md T7 3.7)', () => {
    const state = newGame();
    const folders = (tab: string): string[] =>
      Array.from(shop(state, tab).querySelectorAll('.folder')).map(
        (node) => node.getAttribute('data-folder') ?? '',
      );
    // The spindle moulder is shared with the timber side (CLAUDE.md T13 3.13).
    expect(folders('sheetMachines')).toEqual(['tableSaw', 'edgebander', 'spindleMoulder']);
    expect(folders('storage')).toEqual([
      'workbench',
      'sheetRack',
      'toolCabinet',
      'locker',
      'canteenSeat',
    ]);
    expect(folders('timberMachines')).toEqual(['thicknesser', 'solidWoodTools', 'spindleMoulder']);
    // Every line of the catalogue is in exactly one folder of exactly one tab, except the shared
    // spindle moulder, which is in both machine tabs (CLAUDE.md T13 3.13).
    const all = EQUIPMENT_TABS.flatMap((tab) => folders(tab.id));
    expect(all.filter((id) => id === 'spindleMoulder')).toHaveLength(2);
    const once = all.filter((id) => id !== 'spindleMoulder');
    expect(new Set(once).size).toBe(once.length);
    expect(new Set(all)).toEqual(new Set(EQUIPMENT_SPECS.map((spec) => spec.id)));
  });

  it('opens a folder on the classes of that family, with the way back out', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const open = shop(state, 'sheetMachines', '', 'tableSaw');
    expect(open.querySelector('[data-do="closeFolder"]')?.textContent).toBe(
      'Back to Sheet machines',
    );
    const tiles = Array.from(open.querySelectorAll('.tile'));
    expect(tiles).toHaveLength(5);
    expect(tiles.map((tile) => tile.getAttribute('data-variant'))).toEqual([
      'used',
      'budget',
      'standard',
      'pro',
      'industrial',
    ]);
    // What it takes of the floor is on the tile, in Piotr's words (CLAUDE.md T7 3.7).
    expect(open.innerHTML).toContain('Takes 3 m by 2 m, works in 6 m by 3 m');
    const bander = shop(state, 'sheetMachines', '', 'edgebander');
    expect(bander.innerHTML).toContain('Kept in a tool cabinet');
    expect(bander.innerHTML).toContain('Takes 3 m by 1 m, works in 5 m by 3 m');
  });

  it('frames a class the hall already has, and counts the family on its folder', () => {
    let state = newGame({ difficulty: 'veryEasy' });
    expect(shop(state, 'sheetMachines', '', 'tableSaw').querySelector('.tile.is-owned')).toBeNull();
    state = buyNow(state, 'tableSaw', 'pro');
    const open = shop(state, 'sheetMachines', '', 'tableSaw');
    const owned = Array.from(open.querySelectorAll('.tile.is-owned'));
    expect(owned).toHaveLength(1);
    expect(owned[0]?.getAttribute('data-variant')).toBe('pro');
    expect(owned[0]?.textContent).toContain('Owned');
    // A second one of the same class says how many.
    const two = buyNow(state, 'tableSaw', 'pro');
    expect(
      shop(two, 'sheetMachines', '', 'tableSaw').querySelector('.tile.is-owned')?.textContent,
    ).toContain('Owned × 2');
    // And the folder itself carries the count for the family.
    expect(shop(two, 'sheetMachines').innerHTML).toContain('Owned 2');
  });

  it('narrows the classes inside an open folder, not the folders of the tab', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const filtered = shop(state, 'sheetMachines', 'industrial', 'tableSaw');
    expect(Array.from(filtered.querySelectorAll('.tile'))).toHaveLength(1);
    expect(filtered.innerHTML).toContain('Industrial table saw');
    expect(filtered.innerHTML).not.toContain('Used table saw');
    expect(filtered.querySelector('[data-do="clearFilter"]')).not.toBeNull();
    const nothing = shop(state, 'sheetMachines', 'zzz', 'tableSaw');
    expect(nothing.innerHTML).toContain('Nothing matches that.');
  });

  it('keeps the filter and its clear cross, scoped to the tab', () => {
    const state = newGame();
    const empty = shop(state, 'storage');
    expect(empty.querySelector('[data-filter="catalogue"]')).not.toBeNull();
    expect(empty.querySelector('[data-do="clearFilter"]')).toBeNull();
    const filtered = shop(state, 'storage', 'cabinet');
    expect(filtered.querySelector('[data-do="clearFilter"]')).not.toBeNull();
    expect(filtered.innerHTML).toContain('Tool cabinet');
    expect(filtered.innerHTML).not.toContain('Cheap shelving');
    // The same word on another tab finds nothing: the filter never leaves the tab.
    expect(shop(state, 'handTools', 'cabinet').innerHTML).toContain('Nothing matches that.');
  });

  it('falls back to the first tab when asked for one that does not exist', () => {
    expect(catalogueTabFrom(undefined)).toBe('computers');
    expect(catalogueTabFrom('nonsense')).toBe('computers');
    expect(catalogueTabFrom('owned')).toBe('owned');
    expect(catalogueTabFrom('storage')).toBe('storage');
  });
});

describe('the Owned tab', () => {
  it('lists the hall with its class, its hours, its service and its state', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const owned = shop(state, 'owned');
    const cards = Array.from(owned.querySelectorAll('[data-owned]'));
    expect(cards).toHaveLength(state.equipment.length);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    const card = owned.querySelector(`[data-owned="${saw?.id}"]`)?.textContent ?? '';
    expect(card).toContain('Table saw');
    expect(card).toContain('Used table saw');
    expect(card).toContain('0 h of 750 h');
    // Nothing is going through it, so no service is coming.
    expect(card).toContain('no service due while it stands idle');
    expect(card).toContain('running');
    // Nothing is offered on a machine with nothing wrong with it but the gate it can take on its
    // drop (CLAUDE.md T13 3.11) and the one thing that is always offered on a machine the hall
    // has finished with (CLAUDE.md T8 3.5).
    const controls = Array.from(
      owned.querySelectorAll(`[data-owned="${saw?.id}"] [data-do]`),
    ).map((node) => node.getAttribute('data-do'));
    expect(controls).toEqual(['buyGate', 'sellMachine']);
    expect(card).toContain('Sell for £630');
  });

  it('names the day the service lands on once there is work going through the machine', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 90 });
    const taken = acceptNow(state, enquiry.id, false);
    firstJob(taken).stage = 'ready';
    const working = act(taken, { type: 'WORK_HERE', jobId: null });
    const saw = working.equipment.find((item) => item.specId === 'tableSaw');
    const card = shop(working, 'owned').querySelector(`[data-owned="${saw?.id}"]`);
    // One man, and only the cutting quarter of his job goes through the saw, so eighty hours of
    // use is a long way off. The weekends in between are counted out, because a saw gains nothing
    // over a weekend (CLAUDE.md T6 3.6, T7 3.1).
    const perDay = machineHoursPerDay(working, saw as Equipment);
    expect(perDay).toBeGreaterThan(0);
    expect(perDay).toBeLessThan(HOURS_PER_WORKING_DAY / 3);
    const due = addWorkingDays(working.clock.day, Math.ceil(SERVICE_INTERVAL_HOURS / perDay));
    expect(card?.textContent).toContain(`service on day ${due}`);
    expect(card?.textContent).toContain('80 h of use away');
  });

  it('gives the extractor its state and no service, because its hours never move', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const extractor = state.equipment.find((item) => item.specId === 'extractor');
    const card = shop(state, 'owned').querySelector(`[data-owned="${extractor?.id}"]`);
    expect(card?.textContent).toContain('Extractor');
    expect(card?.textContent).toContain('running');
    // It is repaired, never serviced, and no hours are ever booked on it.
    expect(card?.textContent).not.toContain('service');
    expect(card?.textContent).not.toContain(' h of ');
  });

  it('says what has stopped a machine, and offers the same action the hall offers', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('no saw');
    // The bags are the hall's: a full store stops the saw, and the Owned tab says so (T12 2.3).
    fillBags(state);
    expect(ownedState(state, saw)).toBe('stopped: bags full');
    expect(shop(state, 'owned').innerHTML).toContain('stopped: bags full');
    state.bagFillM3 = 0;
    saw.broken = true;
    expect(ownedState(state, saw)).toBe('stopped: broken');
    const broken = shop(state, 'owned');
    expect(broken.innerHTML).toContain('stopped: broken');
    expect(
      broken.querySelector(`[data-owned="${saw.id}"] [data-do="repairMachine"]`),
    ).not.toBeNull();
    saw.broken = false;
    saw.hoursUsed = SERVICE_INTERVAL_HOURS;
    const due = shop(state, 'owned');
    expect(due.innerHTML).toContain('service due now');
    expect(due.querySelector(`[data-owned="${saw.id}"] [data-do="serviceMachine"]`)).not.toBeNull();
    // And with no extraction in the hall nothing runs at all.
    const extractor = state.equipment.find((item) => item.specId === 'extractor');
    state = { ...state, equipment: state.equipment.filter((item) => item.id !== extractor?.id) };
    expect(ownedState(state, saw)).toBe('stopped: no extraction');
  });

  it('says so when the hall is empty, and filters by name', () => {
    expect(shop(newGame(), 'owned').innerHTML).toContain('Nothing here yet.');
    const state = buyNow(newGame(), 'toolCabinet');
    expect(shop(state, 'owned', 'cabinet').innerHTML).toContain('Tool cabinet');
    expect(shop(state, 'owned', 'saw').innerHTML).toContain('Nothing matches that.');
  });

  it('keeps the management software with the laptop it runs on, and nowhere else', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    expect(shop(state, 'computers').innerHTML).toContain('Management software');
    expect(shop(state, 'owned').innerHTML).not.toContain('Management software');
    expect(shop(state, 'storage').innerHTML).not.toContain('Management software');
    expect(findSpec('toolCabinet')?.tab).toBe('storage');
  });
});
