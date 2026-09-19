// @vitest-environment jsdom
// One machine's own card, opened by a click on the machine on the hall (PIOTR, 17.09: "I never
// found Connect to extraction"; CLAUDE.md T17 2.6). It is the Owned tab's card, drawn by the one
// function, so the buttons cannot differ between the two ways in.

import { beforeAll, describe, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import { renderCatalogue } from '../../src/ui/catalogue';
import { renderMachineCard } from '../../src/ui/machineCard';
import { pipeRunFor } from '../../src/engine/pipes';
import { canPlace } from '../../src/engine/layout';
import { salePriceFor } from '../../src/engine/machines';
import { CABINET_SLOT_LAYOUT } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, newGame } from '../helpers';

function root(): HTMLElement {
  const element = document.querySelector('#app');
  if (!(element instanceof HTMLElement)) throw new Error('no root');
  return element;
}

function click(selector: string): void {
  const element = root().querySelector(selector);
  if (element === null) throw new Error(`nothing to click: ${selector}`);
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function game(): GameState {
  const state = currentState();
  if (state === null) throw new Error('no game');
  return state;
}

function kitId(specId: string): string {
  const item = game().equipment.find((entry) => entry.specId === specId);
  if (item === undefined) throw new Error(`no ${specId} in the hall`);
  return item.id;
}

function card(): Element | null {
  return root().querySelector('.modal-layer [data-modal="machineCard"]');
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  Object.assign(game(), buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  game().enquiries = [];
  render();
});

describe('a click on a machine on the hall', () => {
  it('opens that one machine’s card, with what it is and what it has done', () => {
    click(`[data-kit="${kitId('tableSaw')}"]`);
    const open = card();
    expect(open).not.toBeNull();
    const text = open?.textContent ?? '';
    expect(text).toContain('Table saw');
    // Its class, its effect, its life and its service, and the picture slot every card has.
    expect(text).toContain('Used table saw');
    expect(text).toContain('h of');
    expect(text).toContain('service');
    expect(open?.querySelector('[data-owned]')).not.toBeNull();
    // And the machine under the click is the machine on the card: the extractor's is its own.
    click(`[data-kit="${kitId('extractor')}"]`);
    expect(card()?.textContent ?? '').toContain('Extractor');
    expect(card()?.textContent ?? '').not.toContain('Table saw');
  });

  it('connects it to the extraction from the card, which is what was never found', () => {
    const saw = kitId('tableSaw');
    // The day 1 kit comes connected: the pipe is pulled off it so the button is the one that
    // puts it back, which is the button Piotr never found.
    game().pipes = game().pipes.filter((run) => run.equipmentId !== saw);
    render();
    click(`[data-kit="${saw}"]`);
    expect(pipeRunFor(game(), saw)).toBeNull();
    const connect = card()?.querySelector(`[data-do="connectExtraction"][data-id="${saw}"]`);
    expect(connect).not.toBeNull();
    click(`.modal-layer [data-do="connectExtraction"][data-id="${saw}"]`);
    expect(pipeRunFor(game(), saw)).not.toBeNull();
    // Connected, and the card says so with the metres of pipe on it.
    expect(card()?.textContent ?? '').toContain('m of pipe to the extraction');
  });

  it('offers Move, which is the hall being set out with the card out of the way', () => {
    click(`[data-kit="${kitId('tableSaw')}"]`);
    expect(card()?.querySelector('[data-do="startSetup"]')).not.toBeNull();
    click('.modal-layer [data-do="startSetup"]');
    render();
    // He is on the floor with the grid out and nothing standing over it.
    expect(card()).toBeNull();
    expect(root().querySelector('[data-do="endSetup"]')).not.toBeNull();
    click('[data-do="endSetup"]');
    render();
  });

  it('draws the bench its own card with a Sell on it (CLAUDE.md T19 2.8)', () => {
    const benchId = kitId('workbench');
    const card = renderMachineCard(game(), benchId, null);
    expect(card).toContain('data-do="sellMachine"');
    // And one somebody is standing at says why it cannot go, rather than offering the button.
    const busy = game();
    const bench = busy.equipment.find((item) => item.id === benchId);
    if (bench === undefined) throw new Error('no bench');
    bench.takenBy = 'owner';
    const held = renderMachineCard(busy, benchId, null);
    expect(held).not.toContain('data-do="sellMachine"');
    expect(held).toContain('Cannot sell it: Somebody is standing at it');
    bench.takenBy = null;
  });

  it('opens the bench’s card from the hall, the same click as a machine (CLAUDE.md T19 2.8)', () => {
    // B2 made the bench sellable and the Owned tab drew its Sell at once; the hall's own click
    // still fell through the category gate, so the card was reachable one way and not the other.
    click(`[data-kit="${kitId('workbench')}"]`);
    const open = card();
    expect(open).not.toBeNull();
    expect(open?.textContent ?? '').toContain('Workbench');
    expect(open?.querySelector('[data-do="sellMachine"]')).not.toBeNull();
    click('.modal-layer [data-do="closeModal"]');
  });

  it('opens the tool cabinet\u2019s card, with what it holds and what is in it (T22 2.13)', () => {
    // [PIOTR, 19.09: "click it and a modal shows; sell it at half price; how many men it holds"].
    // The click on a cabinet fell through the category gate until tonight and wrote a note under
    // the hall (CLAUDE.md T22 2.13).
    const cabinet = game().equipment.find((item) => item.specId === 'toolCabinet');
    if (cabinet === undefined) throw new Error('the day one kit has a cabinet in it');
    cabinet.variantId = 'pro';
    render();
    click(`[data-kit="${cabinet.id}"]`);
    const open = card();
    expect(open).not.toBeNull();
    const text = open?.textContent ?? '';
    // The name and the class in the title, and what the class is for under it: the owner's own
    // set is in it, so one of its four slots is in use.
    expect(text).toContain('Tool cabinet');
    expect(text).toContain('Pro');
    expect(text).toContain('Holds 4 men\u0027s tools \u00b7 1 in use');
    // The class's own name is on the card as well, which is the first figures line every card has.
    expect(text).toContain('Tool wall');
    // And the two rows at the bottom, in the machine card's own skin: Turn, which on the row the
    // cabinets are laid out on is greyed with its reason (the next test does it where it fits), and
    // Sell for half what it cost.
    expect(open?.querySelector('[data-card-row="turn"] button')?.textContent).toBe('Turn');
    expect(open?.querySelector('[data-card-row="sell"] [data-do="sellMachine"]')).not.toBeNull();
    click('.modal-layer [data-do="closeModal"]');
  });

  it('turns the cabinet where it stands, and charges what a move of it charges', () => {
    const cabinet = game().equipment.find((item) => item.specId === 'toolCabinet');
    if (cabinet === undefined) throw new Error('the day one kit has a cabinet in it');
    // The cabinet row is one cell deep with the workbench row under it, so a turned cabinet needs
    // a cell with room for it: the test asks the engine for one (CLAUDE.md T21 2.13).
    const spot = (() => {
      for (let y = 0; y < 8; y += 1) {
        for (let x = 3; x < 18; x += 1) {
          if (!canPlace(game(), cabinet.id, x, y, 0).ok) continue;
          if (!canPlace(game(), cabinet.id, x, y, 1).ok) continue;
          return { x, y };
        }
      }
      throw new Error('nowhere in the hall takes a cabinet both ways round');
    })();
    cabinet.variantId = 'standard';
    cabinet.anchorX = spot.x;
    cabinet.anchorY = spot.y;
    cabinet.orientation = 0;
    game().movedItems = [];
    const cash = game().cash;
    const minute = game().clock.minute;
    render();
    click(`[data-kit="${cabinet.id}"]`);
    click('.modal-layer [data-do="turnItem"]');
    const turned = game().equipment.find((item) => item.id === cabinet.id);
    expect(turned?.orientation).toBe(1);
    expect([turned?.anchorX, turned?.anchorY]).toEqual([spot.x, spot.y]);
    // A cabinet is not heavy, so what a move of it costs is nothing: no hour, no question, and the
    // moved list is cleared by the same `endSetup` that books the heavy kit an hour a piece
    // (CLAUDE.md T8 3.4, T22 2.13; the note in docs/notes-t22-b3.md has the reading).
    expect(game().cash).toBe(cash);
    expect(game().clock.minute).toBe(minute);
    expect(game().movedItems).toEqual([]);
    expect(game().activeEvent).toBeNull();
    // Round the ring: the cabinet has all four pictures, so the card walks it to 2 and then to 3.
    click('.modal-layer [data-do="turnItem"]');
    expect(game().equipment.find((item) => item.id === cabinet.id)?.orientation).toBe(2);
    click('.modal-layer [data-do="closeModal"]');
  });

  it('refuses the turn where the turned footprint does not fit, and says why', () => {
    const cabinet = game().equipment.find((item) => item.specId === 'toolCabinet');
    if (cabinet === undefined) throw new Error('the day one kit has a cabinet in it');
    const slot = CABINET_SLOT_LAYOUT[0];
    if (slot === undefined) throw new Error('a slot is wanted');
    cabinet.variantId = 'standard';
    cabinet.anchorX = slot.x;
    cabinet.anchorY = slot.y;
    cabinet.orientation = 0;
    render();
    // The row it is laid out on has the workbench row under it: turned, it would stand on a bench.
    expect(canPlace(game(), cabinet.id, slot.x, slot.y, 1).ok).toBe(false);
    click(`[data-kit="${cabinet.id}"]`);
    const open = card();
    expect(open?.querySelector('[data-card-row="turn"] [data-do="turnItem"]')).toBeNull();
    const locked = open?.querySelector('[data-card-row="turn"] button[disabled]');
    expect(locked?.textContent).toBe('Turn');
    expect(locked?.getAttribute('title')).toBe('On the workbench');
    click('.modal-layer [data-do="closeModal"]');
  });

  it('sells the cabinet on the second click, at the class\u2019s own price', () => {
    const cabinet = game().equipment.find((item) => item.specId === 'toolCabinet');
    if (cabinet === undefined) throw new Error('the day one kit has a cabinet in it');
    cabinet.variantId = 'standard';
    cabinet.purchasePrice = 350;
    cabinet.soldOnDay = null;
    render();
    click(`[data-kit="${cabinet.id}"]`);
    // Half what it cost, which is the one sale price in the game (CLAUDE.md T8 3.5).
    expect(salePriceFor(cabinet)).toBe(175);
    expect(card()?.textContent ?? '').toContain('Sell for \u00a3175');
    click('.modal-layer [data-do="sellMachine"]');
    // The second click means it, inside the card itself.
    expect(card()?.textContent ?? '').toContain('Confirm sale');
    click('.modal-layer [data-do="sellMachine"][data-confirm="1"]');
    expect(game().equipment.find((item) => item.id === cabinet.id)?.soldOnDay).not.toBeNull();
    // And a sold thing is not turned either: it stands where it is until the van comes.
    expect(card()?.textContent ?? '').toContain('Sold, collection on');
    click('.modal-layer [data-do="closeModal"]');
  });

  it('leaves the Owned tab drawing the same card', () => {
    const owned = renderCatalogue(game(), '', 'owned', null, 'all', null);
    expect(owned).toContain('Table saw');
    expect(owned).toContain('data-owned=');
    // The same card, so the same buttons: Move, the gate, the sale, and the pipe it is on.
    expect(owned).toContain('data-do="startSetup"');
    expect(owned).toContain('data-do="sellMachine"');
    expect(owned).toContain('m of pipe to the extraction');
    // And the office furniture is not offered a move the engine would refuse.
    const holder = document.createElement('div');
    holder.innerHTML = owned;
    const desk = game().equipment.find((item) => item.specId === 'desk');
    const deskTile = holder.querySelector(`[data-owned="${desk?.id}"]`);
    expect(deskTile).not.toBeNull();
    expect(deskTile?.querySelector('[data-do="startSetup"]')).toBeNull();
  });
});
