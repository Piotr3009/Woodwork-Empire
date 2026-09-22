// @vitest-environment jsdom
// A card for every person (PIOTR, 20.09; docs/mockups/t23/team-cards.png; CLAUDE.md T23 2.13).
//
// The tile and the card are ONE function, so this file asks the same questions of both and
// expects the same answers. The card is the tile grown: it adds the day he started, the two week
// lines, what he is on with its stage, his days off and his accidents, and a second button.
//
// It opens two ways, from the hall and from Our team, and both are proved through the real DOM.

import { beforeAll, describe, expect, it } from 'vitest';
import { LAPTOP_BOOT_MINUTES, LET_GO_NOTICE_DAYS } from '../../src/engine/constants';
import { formatCalendarDay } from '../../src/engine/index';
import { STATION_IDLE } from '../../src/engine/stations';
import { weekOfDay } from '../../src/engine/clock';
import { assignJob } from '../../src/engine/jobs';
import { renderPerson } from '../../src/ui/personCard';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import type { GameState } from '../../src/engine/index';
import {
  acceptNow,
  benchPlacesFor,
  buyStartingKit,
  clearEvents,
  fillRack,
  firstJob,
  hireNow,
  newGame,
  placeEnquiry,
  placeEquipment,
  runClock,
} from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** A hall with one joiner on the books, started, and a job ready for a bench. */
function withAJoiner(): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
  state.enquiries = [];
  placeEquipment(state, 'locker', { x: 6, y: 9 });
  placeEquipment(state, 'handToolSet', { x: 12, y: 9 });
  placeEquipment(state, 'toolCabinet', { x: 10, y: 9 });
  // The gate counts the owner's own place at a bench beside the crew's from Turn 24, so the day
  // one hall needs a second place before it takes anybody on (CLAUDE.md T24 2.2).
  benchPlacesFor(state);
  state.reputation = 20;
  state = hireNow(state, 'joiner', 'experienced');
  const enquiry = placeEnquiry(state, { price: 6000, deadlineDays: 60 });
  state = acceptNow(state, enquiry.id);
  const man = state.workers[0];
  if (!man) throw new Error('nobody on the books');
  man.startDay = state.clock.day;
  firstJob(state).stage = 'ready';
  return clearEvents(state);
}

describe('the tile and the card are one function', () => {
  it('gives the tile every part the mockup puts on it', () => {
    const state = withAJoiner();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    const tile = parse(renderPerson(state, man.id, 'tile'));
    expect(tile.querySelector('[data-view]')?.getAttribute('data-view')).toBe('tile');
    expect(tile.querySelector('[data-portrait]')).not.toBeNull();
    expect(tile.querySelector('[data-name]')?.textContent).toBe(man.name);
    expect(tile.querySelector('[data-role]')?.textContent).toBe('joiner');
    expect(tile.querySelector('[data-grade]')?.textContent).toContain('experienced');
    expect(tile.querySelector('[data-now]')).not.toBeNull();
    expect(tile.querySelector('[data-day-bar]')).not.toBeNull();
    expect(tile.querySelector('[data-figures]')?.textContent).toContain('worked');
    expect(tile.querySelector('[data-wage]')?.textContent).toContain('a month');
    // One button on a tile, and no more.
    expect(tile.querySelectorAll('.person-actions .btn')).toHaveLength(1);
    // And none of the card's own lines.
    expect(tile.querySelector('[data-started]')).toBeNull();
    expect(tile.querySelector('[data-record]')).toBeNull();
  });

  it('grows the same tile into the card, with the four lines it adds', () => {
    const state = withAJoiner();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    const card = parse(renderPerson(state, man.id, 'card'));
    expect(card.querySelector('[data-view]')?.getAttribute('data-view')).toBe('card');
    // Everything the tile had.
    expect(card.querySelector('[data-portrait]')).not.toBeNull();
    expect(card.querySelector('[data-name]')?.textContent).toBe(man.name);
    expect(card.querySelector('[data-grade]')?.textContent).toContain('experienced');
    expect(card.querySelector('[data-day-bar]')).not.toBeNull();
    // And the four it adds.
    expect(card.querySelector('[data-started]')?.textContent).toContain(
      `started ${formatCalendarDay(man.startDay)}`,
    );
    expect(card.querySelector('[data-week="this week"]')).not.toBeNull();
    expect(card.querySelector('[data-week="last week"]')).not.toBeNull();
    expect(card.querySelector('[data-record]')?.textContent).toContain('days off this month: 0');
    expect(card.querySelector('[data-record]')?.textContent).toContain('accidents: 0');
    // The card's two buttons.
    expect(card.querySelector('[data-do="openPersonAssign"]')).not.toBeNull();
    expect(card.querySelector('[data-do="letGo"]')).not.toBeNull();
  });

  it('says what the week idle was for, when it was a machine (v37)', () => {
    // A week that stood six hours at the edgebander and two at the saw: the card names the one
    // he waited for most, with its hours, so the player can see what a second one would buy
    // (PIOTR, 20.09).
    const state = withAJoiner();
    const man = state.workers[0];
    if (!man) throw new Error('a joiner is wanted');
    const week = weekOfDay(state.clock.day);
    man.weekNow = {
      week,
      minutes: { jobs: 1200, contracts: 0, unloading: 0, cleaning: 0, desk: 0, site: 0 },
      paidMinutes: 1680,
      waitedFor: { edgebander: 360, tableSaw: 120 },
      pieces: 0,
      jobs: [],
      day: state.clock.day,
      minute: 0,
      seenBench: 0,
      seenTask: 0,
    };
    const card = parse(renderPerson(state, man.id, 'card'));
    const line = card.querySelector('[data-week="this week"]')?.textContent ?? '';
    expect(line).toContain('8 h idle');
    expect(line).toContain('6 h of it waiting for the edgebander');
    expect(line).not.toContain('saw');
  });

  it('says what he is on, with the stage and how far in it is', () => {
    const state = withAJoiner();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    const job = firstJob(state);
    assignJob(state, job.id, man.id);
    const worked = clearEvents(runClock(state, 60));
    const card = parse(renderPerson(worked, man.id, 'card'));
    const on = card.querySelector('[data-on]')?.textContent ?? '';
    expect(on).toContain(`on: ${job.name}`);
    expect(on).toContain('% done)');
    // And the `now:` line names the job, not a reason to worry.
    expect(card.querySelector('[data-now]')?.textContent).toContain(job.name);
    expect(card.querySelector('[data-now]')?.classList.contains('warn')).toBe(false);
  });

  it('paints the waiting man red and offers him Assign instead of Let go', () => {
    // No production manager on the books, so nobody takes a job by himself (CLAUDE.md T23 2.1).
    const state = withAJoiner();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    expect(man.jobId).toBeNull();
    const tile = parse(renderPerson(state, man.id, 'tile'));
    const now = tile.querySelector('[data-now]');
    expect(now?.textContent).toContain('waiting for the boss');
    expect(now?.classList.contains('warn')).toBe(true);
    // The one button of a waiting man opens his card, where the Assign is.
    expect(tile.querySelector('[data-do="openPersonCard"].btn')).not.toBeNull();
    expect(tile.querySelector('.person-actions [data-do="letGo"]')).toBeNull();
  });

  it('gives the owner Office and never Let go, on the tile and on the card', () => {
    const state = withAJoiner();
    for (const view of ['tile', 'card'] as const) {
      const drawn = parse(renderPerson(state, 'owner', view));
      expect(drawn.querySelector('[data-do="openOffice"]'), view).not.toBeNull();
      expect(drawn.querySelector('[data-do="letGo"]'), view).toBeNull();
      expect(drawn.querySelector('[data-name]')?.textContent, view).toBe(state.playerName);
      expect(drawn.querySelector('[data-role]')?.textContent, view).toBe('owner');
    }
    // He has no accidents line to worry about and no grade chip.
    expect(parse(renderPerson(state, 'owner', 'card')).querySelector('[data-grade]')).toBeNull();
  });

  it('says the reason instead of Let go once a man has his notice', () => {
    const state = withAJoiner();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    man.leavesOnDay = state.clock.day + LET_GO_NOTICE_DAYS;
    const card = parse(renderPerson(state, man.id, 'card'));
    expect(card.querySelector('[data-do="letGo"]')).toBeNull();
    expect(card.querySelector('.reason')?.textContent).toContain('leaves on');
  });
});

describe('the two ways onto the card, through the real DOM', () => {
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

  function dismissEvents(): void {
    let guard = 0;
    while (
      root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null &&
      guard < 50
    ) {
      click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
      guard += 1;
    }
  }

  beforeAll(() => {
    document.body.innerHTML = '<div id="app"></div>';
    mount(root());
    click('[data-do="startGame"]');
    Object.assign(game(), withAJoiner());
    game().speed = 0;
    dismissEvents();
    render();
  });

  it('opens on a click on the man himself on the hall', () => {
    const man = game().workers[0];
    if (!man) throw new Error('nobody on the books');
    expect(root().querySelector('[data-modal="personCard"]')).toBeNull();
    click(`[data-worker="${man.id}"]`);
    const card = root().querySelector('[data-modal="personCard"]');
    expect(card).not.toBeNull();
    // The head is his own name and trade, and not the word "Person".
    expect(root().querySelector('[data-modal="personCard"] .modal-head h2')?.textContent).toBe(
      `${man.name}, joiner`,
    );
    expect(card?.querySelector('[data-name]')?.textContent).toBe(man.name);
    // The cross every modal has.
    expect(card?.querySelector('.modal-close')).not.toBeNull();
    click('[data-modal="personCard"] .modal-close');
    expect(root().querySelector('[data-modal="personCard"]')).toBeNull();
  });

  it('opens on a click on the owner, who is a person like anybody', () => {
    // He is behind the office door from the first morning, so he is walked onto the floor first,
    // which is where 2.3 puts him the moment his office empties.
    game().owner.station = STATION_IDLE;
    game().owner.currentTaskId = null;
    render();
    click('[data-owner="1"]');
    const card = root().querySelector('[data-modal="personCard"]');
    expect(card).not.toBeNull();
    expect(card?.querySelector('[data-do="letGo"]')).toBeNull();
    expect(card?.querySelector('[data-do="openOffice"]')).not.toBeNull();
    click('[data-modal="personCard"] .modal-close');
  });

  it('opens the same card from a tile in Our team', () => {
    const man = game().workers[0];
    if (!man) throw new Error('nobody on the books');
    // The laptop, the Team page, Our team: the way the player reaches the tile.
    const toOffice = root().querySelector('[data-do="setView"][data-view="office"]');
    if (toOffice !== null) click('[data-do="setView"][data-view="office"]');
    click('[data-office="laptop"]');
    advanceMinutes(LAPTOP_BOOT_MINUTES);
    dismissEvents();
    click('[data-modal="laptop"] [data-tile="team"]');
    click('[data-modal="laptop"] [data-do="teamTab"][data-id="ourTeam"]');
    const tile = root().querySelector(`[data-person="${man.id}"]`);
    expect(tile?.getAttribute('data-do')).toBe('openPersonCard');
    click(`[data-person="${man.id}"]`);
    const card = root().querySelector('[data-modal="personCard"]');
    expect(card).not.toBeNull();
    expect(card?.querySelector('[data-name]')?.textContent).toBe(man.name);
    // The same card the hall opens: it carries the card's own two buttons and not the tile's one.
    expect(card?.querySelector('[data-do="openPersonAssign"]')).not.toBeNull();
    click('[data-modal="personCard"] .modal-close');
  });

  it('sends Assign to the Work Plan, where the list of Turn 19 is', () => {
    const man = game().workers[0];
    if (!man) throw new Error('nobody on the books');
    // Back out to the hall, where the men are: the test before this one left the laptop open.
    if (root().querySelector('.modal-layer .modal') !== null) click('.modal-layer .modal-close');
    const toHall = root().querySelector('[data-do="setView"][data-view="hall"]');
    if (toHall !== null) click('[data-do="setView"][data-view="hall"]');
    click(`[data-worker="${man.id}"]`);
    expect(root().querySelector('[data-modal="personCard"]')).not.toBeNull();
    click('[data-modal="personCard"] [data-do="openPersonAssign"]');
    expect(root().querySelector('[data-modal="personCard"]')).toBeNull();
    expect(root().querySelector('[data-modal="workPlan"]')).not.toBeNull();
    // And the job rows carry the Assign chips of Turn 19 (CLAUDE.md T19 2.5).
    expect(root().querySelector('[data-modal="workPlan"] [data-do="openAssign"]')).not.toBeNull();
  });
});
