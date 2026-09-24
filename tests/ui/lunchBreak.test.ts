// @vitest-environment jsdom
// Lunch in the canteen, in the running game (PIOTR, 19.09; CLAUDE.md T21 2.12): at the break every
// man on the floor, the owner included, walks to the canteen door, goes through it and is off the
// hall; when the break ends he comes out and walks back to his station. A man who works through it
// does not go.
//
// A file of its own, because `mount` does not put a running game back to the start screen and only
// the first test in a file that mounts the app can press "New game" (the same reason
// `tests/ui/owesPlate.test.ts` stands alone).

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BREAK_MINUTES, BREAK_START_MINUTE } from '../../src/engine/constants';
import { STATION_LUNCH, stationNow } from '../../src/engine/stations';
import { currentState, mount, render } from '../../src/ui/app';
import { stepWalkers, walkerKeys, walkerOf } from '../../src/render/walkers';
import type { GameState } from '../../src/engine/index';
import { runClock, sixJoinersOnSheetWork } from '../helpers';

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

/** The page is written and then the frame beat is run on until every man's walk is over, which is
 *  what the app's own loop does sixty times a second (CLAUDE.md T16 2.2). */
let clockMs = 0;
function letThemWalk(): void {
  render();
  for (let guard = 0; guard < 400; guard += 1) {
    const walking = walkerKeys().some((key) => (walkerOf(key)?.path.length ?? 0) > 0);
    if (!walking) break;
    clockMs += 1000;
    stepWalkers(root(), clockMs);
  }
  render();
}

/** Puts this hall into the running game and lets everybody's legs catch up with it. */
function playing(state: GameState): void {
  Object.assign(game(), state);
  letThemWalk();
}

/** Every man the hall is drawing this moment. */
function onTheFloor(): string[] {
  return Array.from(root().querySelectorAll('[data-figure]')).map(
    (node) => node.getAttribute('data-figure') ?? '',
  );
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
});

beforeEach(() => {
  if (root().querySelector('[data-do="setView"][data-view="hall"]') !== null) {
    click('[data-do="setView"][data-view="hall"]');
  }
});

describe('the dinner hour empties the floor (CLAUDE.md T21 2.12)', () => {
  it('takes six joiners and the owner into the canteen and gives them all back after it', () => {
    // A quarter past eleven: six men on six jobs and the owner at his bench, all at work.
    const working = runClock(sixJoinersOnSheetWork({ saws: 1 }), 195);
    playing(working);
    expect(onTheFloor().length).toBeGreaterThanOrEqual(7);
    expect(onTheFloor()).toContain('owner');
    // Seven men and a saw of two places: the saw wears the mark for too few saws for the crew
    // while they work (PIOTR, 24.09; v53).
    expect(root().innerHTML).toContain('data-machine-mark=');
    // Noon: the station of every man of them is the canteen, and once his legs have got him there he
    // is behind the door and off the hall.
    const dinner = runClock(working, BREAK_START_MINUTE - working.clock.minute + 5);
    expect(dinner.clock.minute).toBeGreaterThanOrEqual(BREAK_START_MINUTE);
    for (const worker of dinner.workers) {
      expect(stationNow(dinner, worker.id), worker.id).toBe(STATION_LUNCH);
    }
    playing(dinner);
    expect(onTheFloor()).toEqual([]);
    // And nothing is left at the door: a man at his dinner has nothing wrong with him, so he carries
    // no mark, and the bubble of Turn 21 that stood at the door is gone with the away class. Where
    // his crew went is the top bar's to say, which says the hour is a break (CLAUDE.md T22 2.5).
    // The saw's mark goes with them: nothing is marked at dinner, a machine no more than a man
    // (PIOTR, 24.09; v53).
    expect(root().innerHTML).not.toContain('data-away-door');
    expect(root().innerHTML).not.toContain('data-machine-mark');
    expect(root().innerHTML).not.toContain('class="mark"');
    expect(root().innerHTML).toContain('Break');
    // One o'clock: out of the canteen and back at their stations.
    const after = runClock(dinner, BREAK_START_MINUTE + BREAK_MINUTES + 10 - dinner.clock.minute);
    expect(after.clock.minute).toBeGreaterThan(BREAK_START_MINUTE + BREAK_MINUTES);
    playing(after);
    expect(onTheFloor().length).toBeGreaterThanOrEqual(7);
    expect(onTheFloor()).toContain('owner');
    expect(root().innerHTML).not.toContain('data-away-door="canteen"');
    // And the saw's mark is back with the crew.
    expect(root().innerHTML).toContain('data-machine-mark=');
  });

  it('leaves the man who works through it on the floor by himself', () => {
    const working = runClock(sixJoinersOnSheetWork({ saws: 1 }), 195);
    const dinner = runClock(working, BREAK_START_MINUTE - working.clock.minute + 5);
    // The owner said he would work through the hour, which is his own answer to the break time
    // event: the hour is his and nobody else's (CLAUDE.md T6 3.4, T21 2.12).
    dinner.owner.breakSkipped = true;
    playing(dinner);
    expect(onTheFloor()).toEqual(['owner']);
    expect(stationNow(dinner, 'owner')).not.toBe(STATION_LUNCH);
  });
});
