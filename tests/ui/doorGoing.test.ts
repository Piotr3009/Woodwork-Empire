// @vitest-environment jsdom
// Going in and out of the office, in the running game (PIOTR, 18.09; CLAUDE.md T20 2.12): the
// hall's door is shut, the owner at his desk is not on the hall at all, the office view draws him
// there, and the moment his work is on the floor he is back on the floor.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STATION_BENCH, STATION_OFFICE, STATION_PHONE } from '../../src/engine/stations';
import { currentState, mount, render } from '../../src/ui/app';
import { stepWalkers, walkerOf } from '../../src/render/walkers';
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

/** The engine puts him at this station and his legs carry him there: the page is written, and
 *  then the frame beat is run on until his walk is over, which is what the app's own loop does
 *  sixty times a second (CLAUDE.md T16 2.2). */
let clockMs = 0;
function standing(station: string): void {
  game().owner.station = station;
  render();
  for (let guard = 0; guard < 200 && (walkerOf('owner')?.path.length ?? 0) > 0; guard += 1) {
    clockMs += 1000;
    stepWalkers(root(), clockMs);
  }
  render();
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
});

beforeEach(() => {
  Object.assign(game(), buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  game().enquiries = [];
  if (root().querySelector('[data-do="setView"][data-view="hall"]') !== null) {
    click('[data-do="setView"][data-view="hall"]');
  }
  render();
});

describe('the owner goes in and out of the office (CLAUDE.md T20 2.12)', () => {
  it('draws the door shut, whoever is behind it', () => {
    standing(STATION_BENCH);
    expect(root().innerHTML).toContain('data-door-room="office" data-door-state="closed"');
    standing(STATION_OFFICE);
    expect(root().innerHTML).toContain('data-door-room="office" data-door-state="closed"');
    expect(root().innerHTML).not.toContain('data-door-want');
  });

  it('takes him off the hall while he is at the desk, and gives him back when he is not', () => {
    standing(STATION_BENCH);
    expect(root().querySelector('[data-owner="1"]')).not.toBeNull();
    for (const station of [STATION_OFFICE, STATION_PHONE]) {
      standing(station);
      expect(root().querySelector('[data-owner="1"]'), station).toBeNull();
    }
    standing(STATION_BENCH);
    expect(root().querySelector('[data-owner="1"]')).not.toBeNull();
  });

  it('draws him at his desk in the office view he went into, and not before', () => {
    standing(STATION_BENCH);
    click('[data-do="setView"][data-view="office"]');
    render();
    expect(root().querySelector('[data-office-figure="owner"]')).toBeNull();
    standing(STATION_OFFICE);
    const atTheDesk = root().querySelector('[data-office-figure="owner"]');
    expect(atTheDesk).not.toBeNull();
    // And back to the hall, where he is not.
    click('[data-do="setView"][data-view="hall"]');
    render();
    expect(root().querySelector('[data-owner="1"]')).toBeNull();
    standing(STATION_BENCH);
    expect(root().querySelector('[data-owner="1"]')).not.toBeNull();
  });
});
