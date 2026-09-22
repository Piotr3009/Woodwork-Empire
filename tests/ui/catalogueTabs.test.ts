// @vitest-environment jsdom
// The catalogue in the tabs Piotr asked for, and the Owned tab that says what the hall has and
// what state it is in (CLAUDE.md T6 3.6).

import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_SPECS,
  EQUIPMENT_TABS,
  GATE_OUTPUT_BONUS,
  GATE_PRICE,
  SERVICE_INTERVAL_DAYS,
} from '../../src/engine/constants';
import { catalogueTabFrom, ownedState, renderCatalogue } from '../../src/ui/catalogue';
import { findSpec } from '../../src/engine/machines';
import { extractionDemandOf } from '../../src/engine/media';
import { formatCalendarDay } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
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
    // What it does is on the card, coloured by its sign, and from Turn 23 it says the second half
    // of it as well (CLAUDE.md T13 1, T23 2.15).
    expect(fitted?.querySelector('.figure.good')?.textContent).toBe(
      'Automatic gate fitted: output +2%, counts only while running',
    );
  });

  it('says what a gate is for in the specification block, above the button that buys it', () => {
    // Piotr looked at the card on 20.09 and said the output is the small half of a gate: what
    // sells one is that a shut drop is that machine's whole demand back in the duct for
    // everything else, and nothing on any screen said so (CLAUDE.md T23 2.15).
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('no saw');
    const card = shop(state, 'owned').querySelector(`[data-owned="${saw.id}"]`);
    const wants = extractionDemandOf(saw);
    const per = Math.round(GATE_OUTPUT_BONUS * 100);
    const line = Array.from(card?.querySelectorAll('.spec-line') ?? []).find((node) =>
      (node.textContent ?? '').startsWith('Automatic gate:'),
    );
    expect(line?.textContent).toBe(
      `Automatic gate: +${per}% output, and it counts toward the extraction only while it runs ` +
        `(frees ${wants.toLocaleString('en-GB')} m³/h while it stands)`,
    );
    // In the good token, and above the button, which is in the card's action row under it.
    expect(line?.className).toContain('good');
    const html = card?.innerHTML ?? '';
    expect(html.indexOf('Automatic gate:')).toBeLessThan(html.indexOf('data-do="buyGate"'));
    // And once the gate is on, the offer is gone and the fitted line is what is left.
    const fitted = act(state, { type: 'BUY_GATE', equipmentId: saw.id });
    const after = shop(fitted, 'owned').querySelector(`[data-owned="${saw.id}"]`);
    expect(after?.textContent).not.toContain('Automatic gate: +');
    expect(after?.textContent).toContain('Automatic gate fitted: output +2%, counts only while running');
  });

  it('offers no gate line at all on a thing the extraction does not reach', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const bench = state.equipment.find((item) => item.specId === 'workbench');
    if (!bench) throw new Error('no bench');
    expect(extractionDemandOf(bench)).toBe(0);
    const card = shop(state, 'owned').querySelector(`[data-owned="${bench.id}"]`);
    expect(card?.textContent).not.toContain('Automatic gate');
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
    const hand = shop(state, 'handTools');
    // The drill's own folder stood here until Turn 23 took it out of the game
    // (CLAUDE.md T23 2.5); the hand tool set is what the tab holds now.
    expect(hand.innerHTML).toContain('Hand tool sets');
    expect(hand.innerHTML).not.toContain('Drills');
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
    // The service is six months on the calendar from the purchase, run or not (v51).
    expect(card).toContain(`service on ${formatCalendarDay(state.clock.day + SERVICE_INTERVAL_DAYS)}`);
    expect(card).toContain(`in ${SERVICE_INTERVAL_DAYS} days`);
    expect(card).toContain('running');
    // Nothing is offered on a machine with nothing wrong with it but the gate it can take on its
    // drop (CLAUDE.md T13 3.11), shifting it, which is setting the hall out (CLAUDE.md T17 2.6),
    // standing it at ninety degrees where it is, and the one thing that is always offered on a
    // machine the hall has finished with (CLAUDE.md T8 3.5, T22 2.13).
    const controls = Array.from(
      owned.querySelectorAll(`[data-owned="${saw?.id}"] [data-do]`),
    ).map((node) => node.getAttribute('data-do'));
    expect(controls).toEqual(['buyGate', 'startSetup', 'turnItem', 'sellMachine']);
    // Turn and Sell are the two rows at the bottom of the card, in that order, drawn by the one
    // function the tool cabinet's card calls as well (CLAUDE.md T22 2.13).
    const rows = Array.from(
      owned.querySelectorAll(`[data-owned="${saw?.id}"] [data-card-row]`),
    ).map((node) => node.getAttribute('data-card-row'));
    expect(rows).toEqual(['turn', 'sell']);
    expect(card).toContain('Sell for £630');
  });

  it('names the day the service lands on, the same day whether or not work goes through the machine (v51)', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 90 });
    const taken = acceptNow(state, enquiry.id, false);
    firstJob(taken).stage = 'ready';
    const working = act(taken, { type: 'WORK_HERE', jobId: null });
    const saw = working.equipment.find((item) => item.specId === 'tableSaw');
    const card = shop(working, 'owned').querySelector(`[data-owned="${saw?.id}"]`);
    // Until v51 the day was projected off the hours the work put through the saw; now it is six
    // months of the calendar from the purchase, and the work moves it not at all.
    const due = (saw?.servicedDay ?? 0) + SERVICE_INTERVAL_DAYS;
    expect(card?.textContent).toContain(`service on ${formatCalendarDay(due)}`);
    expect(card?.textContent).not.toContain('of use away');
    const later = { ...working, clock: { ...working.clock, day: working.clock.day + 100 } };
    const laterCard = shop(later, 'owned').querySelector(`[data-owned="${saw?.id}"]`);
    expect(laterCard?.textContent).toContain(`service on ${formatCalendarDay(due)}`);
    expect(laterCard?.textContent).toContain(`in ${SERVICE_INTERVAL_DAYS - 100} days`);
  });

  it('gives the extractor its clock and its service, like the machines it pulls for', () => {
    // Its card said its state and no clock until tonight, because it was repaired and never
    // serviced. Piotr put the fan on the same footing as the saw on 20.09: it books its hours
    // while the extraction runs, so the card carries the same life line and the same Service
    // button every machine's card carries (CLAUDE.md T23 2.8).
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const extractor = state.equipment.find((item) => item.specId === 'extractor');
    if (extractor === undefined) throw new Error('no extractor in the hall');
    const card = shop(state, 'owned').querySelector(`[data-owned="${extractor.id}"]`);
    expect(card?.textContent).toContain('Extractor');
    expect(card?.textContent).toContain('running');
    expect(card?.textContent).toContain(' h of ');
    expect(card?.textContent).toContain(`service on ${formatCalendarDay(state.clock.day + SERVICE_INTERVAL_DAYS)}`);
    // And once its six months are up, the card offers the call the Machines page offers.
    extractor.servicedDay = state.clock.day - SERVICE_INTERVAL_DAYS;
    const due = shop(state, 'owned');
    expect(due.querySelector(`[data-owned="${extractor.id}"]`)?.textContent)
      .toContain('service due now');
    expect(due.querySelector(`[data-owned="${extractor.id}"] [data-do="serviceMachine"]`))
      .not.toBeNull();
  });

  it('gives the hand tool set its line and nothing to open, because it is in a cabinet', () => {
    // The set is bought, it takes a slot, and from Turn 23 it is not a thing on the hall: its line
    // in the Owned tab has no Turn and no Move on it, and a click on it opens nothing, because
    // there is nothing to open (PIOTR, 20.09; CLAUDE.md T23 2.6).
    const hall = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    // The used cabinet the starting kit buys holds one man's tools and that one is the owner's,
    // so the hall is given a bigger one before a set is bought into it (CLAUDE.md T22 2.12).
    const holderItem = hall.equipment.find((item) => item.specId === 'toolCabinet');
    if (holderItem === undefined) throw new Error('the day one kit has a cabinet in it');
    holderItem.variantId = 'pro';
    const state = buyNow(hall, 'handToolSet');
    const set = state.equipment.find((item) => item.specId === 'handToolSet');
    const card = shop(state, 'owned').querySelector(`[data-owned="${set?.id}"]`);
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('Hand tool set');
    expect(card?.querySelector('[data-do="turnItem"]')).toBeNull();
    expect(card?.querySelector('[data-do="startSetup"]')).toBeNull();
    // And the cabinet it lives in says what it holds and how much of it is in use, as it did.
    const cabinet = state.equipment.find((item) => item.specId === 'toolCabinet');
    const holder = shop(state, 'owned').querySelector(`[data-owned="${cabinet?.id}"]`);
    expect(holder?.textContent).toContain('Holds 4 men\u0027s tools \u00b7 2 in use');
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
    saw.servicedDay = state.clock.day - SERVICE_INTERVAL_DAYS;
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
