// @vitest-environment jsdom
// One machine's own card, opened by a click on the machine on the hall (PIOTR, 17.09: "I never
// found Connect to extraction"; CLAUDE.md T17 2.6). It is the Owned tab's card, drawn by the one
// function, so the buttons cannot differ between the two ways in.

import { beforeAll, describe, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import { renderCatalogue } from '../../src/ui/catalogue';
import { renderMachineCard } from '../../src/ui/machineCard';
import { pipeRunFor } from '../../src/engine/pipes';
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
