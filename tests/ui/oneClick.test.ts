// @vitest-environment jsdom
// "Why do I sometimes have to click twice?" (PIOTR, 13.09; CLAUDE.md T9 3.8).
//
// The page was written again from the state every game minute and every element on it was
// replaced, so the button the player pressed was gone by the time he let it go. Nothing that is
// still the same thing is replaced now, and the page is written once a frame instead of once a
// minute. Both of these are proved by pressing a button the render loop has just been through.

import { beforeAll, describe, expect, it } from 'vitest';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import { applyAction } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import { refreshBoard } from '../../src/engine/board';
import { buyStartingKit, fillRack, newGame, placeEnquiry, placeEquipment } from '../helpers';

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

function press(element: Element): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function game(): GameState {
  const state = currentState();
  if (state === null) throw new Error('no game');
  return state;
}

/** A hall with the day 1 kit, a full rack and one job ready for the bench. */
function readyHall(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 6000, deadlineDays: 40 });
  const next = applyAction(state, {
    type: 'ACCEPT_ENQUIRY',
    enquiryId: enquiry.id,
    byHand: false,
  });
  const job = next.jobs[0];
  if (job === undefined) throw new Error('no job');
  job.stage = 'ready';
  return next;
}

/** Puts the job back in front of the owner, so there is a Start production to press again. */
function offTheBench(): void {
  const state = game();
  const job = state.jobs[0];
  if (job === undefined) throw new Error('no job');
  job.stage = 'ready';
  job.assignedTo = null;
  state.owner.currentTaskId = null;
  render();
}

function inTheOffice(): void {
  const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
  if (toOffice !== null) press(toOffice);
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  Object.assign(game(), readyHall());
  render();
});

describe('a click lands on the button the player pressed', () => {
  it('takes all 200 of them, one action each, with a render between every two', () => {
    let landed = 0;
    for (let round = 0; round < 200; round += 1) {
      offTheBench();
      inTheOffice();
      click('[data-office="workPlan"]');
      const button = root().querySelector('[data-do="startProduction"]');
      if (button === null) throw new Error(`no Start production on round ${round}`);
      // The render that used to take the button out from under him.
      advanceMinutes(1);
      // The very node he pressed, a minute later.
      press(button);
      if (game().jobs[0]?.assignedTo === 'owner') landed += 1;
    }
    expect(landed).toBe(200);
  });

  it('keeps the Board button the same node across 60 ticks while the count beside it changes', () => {
    inTheOffice();
    const board = root().querySelector('[data-do="openModal"][data-modal="board"]');
    if (board === null) throw new Error('no Board button');
    const chip = root().querySelector('[data-do="openModal"][data-modal="shopping"]');
    if (chip === null) throw new Error('no Orders chip');
    const countedBefore = chip.textContent;
    for (let tick = 0; tick < 60; tick += 1) {
      advanceMinutes(1);
      if (tick === 10) {
        // Something on the road: the chip beside the Board button has to say so.
        const state = game();
        Object.assign(
          state,
          applyAction(state, { type: 'BUY_EQUIPMENT', specId: 'van', variantId: 'standard' }),
        );
        render();
      }
      // The same node, minute after minute, however the bar around it reads.
      expect(root().querySelector('[data-do="openModal"][data-modal="board"]')).toBe(board);
      expect(root().querySelector('[data-do="openModal"][data-modal="shopping"]')).toBe(chip);
      expect(board.isConnected).toBe(true);
    }
    expect(chip.textContent).not.toBe(countedBefore);
    expect(chip.textContent).toContain('Orders: 1');
  });
});

// Every control this turn added is on the same list: pressed once, after a render, and landing
// (CLAUDE.md T10 3.11).

function inTheHall(): void {
  const toHall = root().querySelector('[data-do="setView"][data-view="hall"]');
  if (toHall !== null) press(toHall);
}

function node(selector: string): Element {
  const element = root().querySelector(selector);
  if (element === null) throw new Error(`nothing to click: ${selector}`);
  return element;
}

function closeModals(): void {
  let guard = 0;
  let close = root().querySelector('.modal-layer [data-do="closeModal"]');
  while (close !== null && guard < 10) {
    guard += 1;
    press(close);
    close = root().querySelector('.modal-layer [data-do="closeModal"]');
  }
}

describe('the controls Turn 10 added take one click each', () => {
  it('turns the ghost on the Rotate button, after a render', () => {
    closeModals();
    inTheHall();
    const setup = root().querySelector('[data-do="startSetup"]');
    if (setup !== null) press(setup);
    const rotate = node('[data-do="rotateGhost"]');
    const before = rotate.className;
    render();
    // The very node, after the page has been written again.
    expect(root().querySelector('[data-do="rotateGhost"]')).toBe(rotate);
    press(rotate);
    expect(node('[data-do="rotateGhost"]').className).not.toBe(before);
    press(node('[data-do="rotateGhost"]'));
    expect(node('[data-do="rotateGhost"]').className).toBe(before);
    const done = root().querySelector('[data-do="endSetup"]');
    if (done !== null) press(done);
  });

  it('moves between the trades of the Team board, and hires off a tile', () => {
    closeModals();
    inTheOffice();
    game().reputation = 40;
    render();
    click('[data-office="laptop"]');
    click('[data-do="laptopTab"][data-id="team"]');
    const office = node('[data-do="teamTab"][data-id="office"]');
    advanceMinutes(1);
    press(office);
    expect(root().querySelector('[data-do="teamTab"][data-id="office"]')?.className).toContain(
      'is-on',
    );
    const hire = node('[data-do="hire"][data-role="officeAdmin"]');
    const before = game().tasks.filter((task) => task.kind === 'hiring').length;
    advanceMinutes(1);
    press(hire);
    expect(game().tasks.filter((task) => task.kind === 'hiring')).toHaveLength(before + 1);
    closeModals();
  });

  it('opens the page a greyed enquiry points at, off the tile itself', () => {
    closeModals();
    inTheOffice();
    const state = game();
    // The board was emptied when this hall was built: write it again the way the day does.
    refreshBoard(state);
    render();
    const greyed = state.enquiries.find((enquiry) => enquiry.unreachable);
    if (greyed === undefined) throw new Error('no greyed enquiry on the board');
    click('[data-office="orders"]');
    const link = root().querySelector(
      `[data-enquiry="${greyed.id}"] [data-do="openModal"]`,
    );
    if (link === null) {
      // A reason nothing can be bought or hired for carries no link, and no Accept either.
      expect(
        root().querySelector(`[data-enquiry="${greyed.id}"] [data-do="acceptEnquiry"]`),
      ).toBeNull();
      closeModals();
      return;
    }
    const wanted = link.getAttribute('data-modal');
    advanceMinutes(1);
    press(link);
    expect(root().querySelector(`.modal-layer [data-modal="${wanted}"]`)).not.toBeNull();
    closeModals();
  });

  it('takes the four push buttons of the new top bar, one click each', () => {
    closeModals();
    inTheHall();
    // Orders, Board, the view toggle and the Menu: the whole right hand block of the cabinet
    // (CLAUDE.md T11 3.1).
    for (const selector of [
      '[data-do="openModal"][data-modal="shopping"]',
      '[data-do="openModal"][data-modal="board"]',
    ]) {
      const button = node(selector);
      advanceMinutes(1);
      expect(root().querySelector(selector)).toBe(button);
      press(button);
      expect(root().querySelector('.modal-layer .modal')).not.toBeNull();
      closeModals();
    }
    const toOffice = node('[data-do="setView"][data-view="office"]');
    advanceMinutes(1);
    press(toOffice);
    expect(root().querySelector('.office-room')).not.toBeNull();
    const menu = node('[data-do="toggleMenu"]');
    advanceMinutes(1);
    press(menu);
    expect(root().querySelector('.menu-pop')).not.toBeNull();
    press(node('[data-do="toggleMenu"]'));
    expect(root().querySelector('.menu-pop')).toBeNull();
  });

  it('puts a machine on the other compressor, off the chip in the Owned tab', () => {
    closeModals();
    const state = game();
    // Two compressors standing in the hall, and something that draws air, so the valve is on the
    // tile at all. A second one on the road would not be in the hall to draw from.
    placeEquipment(state, 'compressor', { variantId: 'pro', x: 18, y: 2, id: 'kit-air-two' });
    const bander = state.equipment.find((item) => item.specId === 'edgebander');
    if (bander === undefined) throw new Error('no edgebander in the hall');
    bander.variantId = 'standard';
    render();
    inTheOffice();
    click('[data-office="catalogue"]');
    click('[data-do="catalogueTab"][data-id="owned"]');
    const chips = Array.from(
      root().querySelectorAll(`[data-owned="${bander.id}"] [data-do="assignAir"]`),
    );
    expect(chips.length).toBeGreaterThanOrEqual(2);
    const second = chips[1];
    if (second === undefined) throw new Error('no second compressor chip');
    const wanted = second.getAttribute('data-compressor');
    advanceMinutes(1);
    press(second);
    expect(
      game().equipment.find((item) => item.id === bander.id)?.compressorId,
    ).toBe(wanted);
    closeModals();
  });
});
