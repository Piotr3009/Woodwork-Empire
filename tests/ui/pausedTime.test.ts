// @vitest-environment jsdom
// Nothing happens in stopped time, and the modals that act on the world do not open while the
// clock is stopped (CLAUDE.md T7 3.10). Reading is another matter: the Work Plan and the Sprite
// check page open on a stopped clock, because nothing on either of them changes anything.
// Ordering costs the owner nothing at all now: the cash leaves at the click, the lorry comes in
// days, and the only thing he still goes out for is an interview (CLAUDE.md T9 3.1).

import { beforeAll, describe, expect, it } from 'vitest';
import { advanceMinutes, currentState, mount } from '../../src/ui/app';
import {
  HIRING_MINUTES,
  LAPTOP_BOOT_MINUTES,
} from '../../src/engine/constants';

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

function html(): string {
  return root().innerHTML;
}

function openModalId(): string | null {
  return root().querySelector('.modal-layer .modal')?.getAttribute('data-modal') ?? null;
}

function run(): void {
  click('[data-do="setSpeed"][data-speed="1"]');
}

/** Answers whatever the day is asking with its first choice. */
function dismissEvents(): void {
  let guard = 0;
  while (root().querySelector('[data-do="resolveEvent"]') !== null && guard < 80) {
    click('[data-do="resolveEvent"]');
    guard += 1;
  }
}

/** Plays through to 08:00 tomorrow the way a player does, answering the evening and the morning.
 *  What was ordered today is off the lorry when it comes back (CLAUDE.md T9 3.1). */
function nextMorning(): void {
  const day = currentState()?.clock.day ?? 1;
  let guard = 0;
  while ((currentState()?.clock.day ?? 0) === day && guard < 200) {
    guard += 1;
    dismissEvents();
    advanceMinutes(30);
  }
  dismissEvents();
}

function pause(): void {
  click('[data-do="setSpeed"][data-speed="0"]');
}

// One game, played in order: the app holds one state, so these read as a session and not as
// seven of them.
beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="pickDifficulty"][data-id="easy"]');
  click('[data-do="startGame"]');
  click('[data-do="setView"][data-view="office"]');
});

describe('the clock has to be running', () => {
  it('starts the clock at 1x the moment the catalogue is reached for (PIOTR, 13.09)', () => {
    expect(currentState()?.speed).toBe(0);
    click('[data-office="catalogue"]');
    expect(openModalId()).toBe('catalogue');
    expect(currentState()?.speed).toBe(1);
    expect(html()).not.toContain('Time is paused');
    click('[data-do="closeModal"]');
    pause();
    // The same for the laptop once there is one: it is bought further down, so here the
    // stopped clock simply stays stopped on a reading modal.
    click('[data-office="workPlan"]');
    expect(currentState()?.speed).toBe(0);
    click('[data-do="closeModal"]');
  });

  it('opens the Work Plan and the sprite check on a stopped clock, and nothing else', () => {
    // The whiteboard is reading and nothing on it changes anything (CLAUDE.md T7 3.10).
    click('[data-office="workPlan"]');
    expect(openModalId()).toBe('workPlan');
    click('[data-do="closeModal"]');
    // And the sprite check page, which is pictures and nothing else.
    click('[data-do="toggleMenu"]');
    click('[data-do="showSprites"]');
    expect(html()).toContain('sprite-page');
    // The top bar toggle goes back to the hall from the sprite page, and the office is next door.
    click('[data-do="setView"][data-view="hall"]');
    click('[data-do="setView"][data-view="office"]');
  });

  it('will not let the hall be set out until the clock runs', () => {
    click('[data-do="setView"][data-view="hall"]');
    click('[data-do="startSetup"]');
    expect(html()).toContain('Time is paused');
    expect(html()).not.toContain('data-do="endSetup"');
    run();
    click('[data-do="startSetup"]');
    expect(html()).toContain('data-do="endSetup"');
    // Once it is open the clock stops on purpose, as it has since Turn 4.
    expect(currentState()?.speed).toBe(0);
    click('[data-do="endSetup"]');
    click('[data-do="setView"][data-view="office"]');
  });
});

/** Buys one thing out of the catalogue, tab, folder and class the way the player does. */
function buy(specId: string, tab: string, variantId?: string): void {
  click(`[data-do="catalogueTab"][data-id="${tab}"]`);
  click(`[data-do="openFolder"][data-id="${specId}"]`);
  click(
    variantId === undefined
      ? `[data-do="buyEquipment"][data-id="${specId}"]`
      : `[data-do="buyEquipment"][data-id="${specId}"][data-variant="${variantId}"]`,
  );
  click('[data-do="closeFolder"]');
}

describe('an order costs the owner nothing', () => {
  it('takes the cash at the click and books the delivery at the click', () => {
    run();
    const before = currentState()?.cash ?? 0;
    const minutes = currentState()?.owner.minutesWorked ?? 0;
    click('[data-office="catalogue"]');
    buy('desk', 'computers');
    // Nothing is in the hall: it is on the road (CLAUDE.md T9 3.1).
    expect(currentState()?.equipment).toHaveLength(0);
    expect(currentState()?.onOrder).toHaveLength(1);
    expect(currentState()?.onOrder[0]?.specId).toBe('desk');
    // Paid for at the click (PIOTR, 13.09), and not a minute of his day for it.
    const paid = before - (currentState()?.cash ?? 0);
    expect(paid).toBeGreaterThan(0);
    expect(currentState()?.owner.minutesWorked).toBe(minutes);
    expect(html()).not.toContain('Owner is out');
  });

  it('puts a second and a third thing on the same list for nothing as well', () => {
    const ordered = currentState()?.onOrder.length ?? 0;
    const minutes = currentState()?.owner.minutesWorked ?? 0;
    buy('chair', 'computers');
    buy('laptop', 'computers');
    expect(currentState()?.onOrder).toHaveLength(ordered + 2);
    expect(currentState()?.owner.minutesWorked).toBe(minutes);
  });

  it('stands the furniture in the room at 08:00 the next working day', () => {
    click('[data-do="closeModal"]');
    nextMorning();
    expect(currentState()?.clock.day).toBe(2);
    const owned = currentState()?.equipment.map((item) => item.specId) ?? [];
    expect(owned).toContain('desk');
    expect(owned).toContain('chair');
    expect(owned).toContain('laptop');
    expect(currentState()?.onOrder).toHaveLength(0);
  });

  it('gives him the licence down the wire the moment he pays for it', () => {
    run();
    click('[data-office="catalogue"]');
    click('[data-do="catalogueTab"][data-id="computers"]');
    click('[data-do="buySoftware"][data-id="oneOff"]');
    expect(currentState()?.software.mode).toBe('oneOff');
    click('[data-do="closeModal"]');
  });

  it('costs five minutes to lift the lid on the laptop', () => {
    const before = currentState()?.owner.minutesWorked ?? 0;
    click('[data-office="laptop"]');
    expect(openModalId()).toBe('laptop');
    expect(html()).toContain('Waiting for the laptop');
    expect(currentState()?.owner.currentTaskId).not.toBeNull();
    advanceMinutes(LAPTOP_BOOT_MINUTES);
    // The lid is up: he is holding nothing again and the five minutes are off his day.
    expect(currentState()?.owner.currentTaskId).toBeNull();
    expect(currentState()?.owner.minutesWorked).toBe(before + LAPTOP_BOOT_MINUTES);
  });
});

describe('taking somebody on is an interview', () => {
  it('costs the owner an hour, and the man is on the books when it is over', () => {
    // Office staff need none of the bench kit, so this is the interview and nothing else. The
    // admin does not answer an advert from a workshop nobody has heard of, so the reputation is
    // put where he would (CLAUDE.md 9.3).
    const state = currentState();
    if (!state) throw new Error('no game');
    state.reputation = 20;
    click('[data-do="laptopTab"][data-id="team"]');
    click('[data-do="hire"][data-role="officeAdmin"]');
    expect(currentState()?.workers).toHaveLength(0);
    expect(html()).toContain(`Interview: 0 of ${HIRING_MINUTES} min`);
    advanceMinutes(HIRING_MINUTES);
    expect(currentState()?.workers).toHaveLength(1);
    expect(currentState()?.workers[0]?.role).toBe('officeAdmin');
  });
});

describe('one click is one purchase (PIOTR, 13.09)', () => {
  it('takes the cash once, hides the button while the machine is on the list, and frames what is owned', () => {
    // Back to the catalogue: the desk ordered on day 1 came off the lorry this morning, so its
    // tile is framed as owned.
    click('[data-office="catalogue"]');
    click('[data-do="catalogueTab"][data-id="computers"]');
    click('[data-do="openFolder"][data-id="desk"]');
    expect(html()).toContain('is-owned');
    expect(html()).toContain('Owned');
    click('[data-do="closeFolder"]');
    const before = currentState()?.cash ?? 0;
    buy('extractor', 'extraction', 'standard');
    const paid = before - (currentState()?.cash ?? 0);
    expect(paid).toBeGreaterThan(0);
    click('[data-do="catalogueTab"][data-id="extraction"]');
    click('[data-do="openFolder"][data-id="extractor"]');
    expect(html()).toContain('On order, due day');
    expect(html()).toContain('is-ordered');
    expect(
      root().querySelector('[data-do="buyEquipment"][data-id="extractor"][data-variant="standard"]'),
    ).toBeNull();
    // Nothing more can leave for it: the click that would have bought a second one is not there.
    expect(before - (currentState()?.cash ?? 0)).toBe(paid);
    click('[data-do="closeFolder"]');
    click('[data-do="closeModal"]');
  });
});
