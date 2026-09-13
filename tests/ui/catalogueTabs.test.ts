// @vitest-environment jsdom
// The catalogue in the tabs Piotr asked for, and the Owned tab that says what the hall has and
// what state it is in (CLAUDE.md T6 3.6).

import { describe, expect, it } from 'vitest';
import { EQUIPMENT_SPECS, EQUIPMENT_TABS, SERVICE_INTERVAL_HOURS } from '../../src/engine/constants';
import { catalogueTabFrom, ownedState, renderCatalogue } from '../../src/ui/catalogue';
import { findSpec } from '../../src/engine/machines';
import type { GameState } from '../../src/engine/index';
import { act, buyStartingKit, fillRack, firstJob, newGame, placeEnquiry } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function shop(state: GameState, tab: string, filter = ''): HTMLElement {
  return parse(renderCatalogue(state, filter, catalogueTabFrom(tab)));
}

describe('the tabs', () => {
  it('are the eleven Piotr named, in his order, with Owned after them', () => {
    expect(EQUIPMENT_TABS.map((tab) => tab.label)).toEqual([
      'Sheet machines',
      'Timber machines',
      'Spraying',
      'Sanding',
      'Hand tools',
      'Extraction',
      'Computers',
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

  it('shows only its own lines, and says so when it has none', () => {
    const state = newGame();
    const saws = shop(state, 'sheetMachines');
    expect(saws.innerHTML).toContain('Table saw');
    expect(saws.innerHTML).not.toContain('Cordless drill');
    const hand = shop(state, 'handTools');
    expect(hand.innerHTML).toContain('Cordless drill');
    expect(hand.innerHTML).not.toContain('Table saw');
    // Sanding and the CNC centre have nothing in them tonight.
    expect(shop(state, 'sanding').innerHTML).toContain('Nothing here yet.');
    expect(shop(state, 'cncCentre').innerHTML).toContain('Nothing here yet.');
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
    expect(catalogueTabFrom(undefined)).toBe('sheetMachines');
    expect(catalogueTabFrom('nonsense')).toBe('sheetMachines');
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
    // Nothing is offered on a machine with nothing wrong with it.
    expect(owned.querySelector(`[data-owned="${saw?.id}"] [data-do]`)).toBeNull();
  });

  it('names the day the service lands on once there is work going through the machine', () => {
    const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 90 });
    const taken = act(state, { type: 'ACCEPT_ENQUIRY', enquiryId: enquiry.id, byHand: false });
    firstJob(taken).stage = 'ready';
    const working = act(taken, { type: 'WORK_HERE', jobId: null });
    const saw = working.equipment.find((item) => item.specId === 'tableSaw');
    const card = shop(working, 'owned').querySelector(`[data-owned="${saw?.id}"]`);
    // One man on a saw that serves three: eighty hours of use is thirty days away.
    expect(card?.textContent).toContain(`service on day ${working.clock.day + 30}`);
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
    saw.bagFull = true;
    expect(ownedState(state, saw)).toBe('stopped: bag full');
    expect(shop(state, 'owned').innerHTML).toContain('stopped: bag full');
    saw.bagFull = false;
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
    const state = act(newGame(), { type: 'BUY_EQUIPMENT', specId: 'toolCabinet' });
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
