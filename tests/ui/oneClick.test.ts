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
import { buyStartingKit, fillRack, newGame, placeEnquiry } from '../helpers';

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
