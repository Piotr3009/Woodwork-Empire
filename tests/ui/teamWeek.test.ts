// @vitest-environment jsdom
// A man's week: what this week was and what last week was, man by man and the owner with them
// (PIOTR; CLAUDE.md T20 2.7). It was the second line of his row on Our team until Turn 23, in the
// accountant's own hand: the hours, the six bands they went into, the pieces, the jobs and an
// efficiency percentage. From tonight it is two lines of his CARD, in the two figures a player
// reads, worked and idle, and the tile carries the one week figure it has room for
// (PIOTR, 20.09: "made for an accountant, not a player";
// docs/mockups/t23/team-cards.png; CLAUDE.md T23 2.13).

import { describe, expect, it } from 'vitest';
import { weekOfDay } from '../../src/engine/clock';
import { weekNowOf, weekWorkedMinutes } from '../../src/engine/staff';
import { assignJob } from '../../src/engine/jobs';
import { renderTeam } from '../../src/ui/team';
import { renderPerson } from '../../src/ui/personCard';
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

/** One of the two week lines of a man's card. */
function weekLine(state: GameState, id: string, which: 'this week' | 'last week'): string {
  const card = parse(renderPerson(state, id, 'card'));
  return card.querySelector(`[data-week="${which}"]`)?.textContent ?? '';
}

/** A hall with a joiner at the bench on a job, an hour into the day. */
function anHourIn(): GameState {
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
  const job = firstJob(state);
  job.stage = 'ready';
  assignJob(state, job.id, man.id);
  return clearEvents(runClock(state, 60));
}

describe('the week on a man s card', () => {
  it('gives every card its two week lines, the owner s too', () => {
    const state = anHourIn();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    expect(weekLine(state, 'owner', 'this week')).toContain('this week');
    expect(weekLine(state, 'owner', 'last week')).toContain('last week');
    expect(weekLine(state, man.id, 'this week')).toContain('this week');
  });

  it('prints the hours he worked and the hours he stood, off the same meters', () => {
    const state = anHourIn();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    const meters = weekNowOf(man, weekOfDay(state.clock.day));
    if (!meters) throw new Error('no week on him');
    const line = weekLine(state, man.id, 'this week');
    const worked = Math.round(weekWorkedMinutes(meters) / 6) / 10;
    expect(line).toContain(`${worked} h worked`);
    // The idle hours are the minutes the company paid for that he put nothing into: the two come
    // out of the one pair of meters, so they cannot disagree.
    const stood = Math.round((meters.paidMinutes - weekWorkedMinutes(meters)) / 6) / 10;
    expect(line).toContain(`${stood} h idle`);
  });

  it('says so plainly when a week has nothing in it yet', () => {
    const state = anHourIn();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    expect(weekLine(state, man.id, 'last week')).toBe('last week: nothing yet');
  });

  it('keeps the accountant s week off Our team altogether', () => {
    const state = anHourIn();
    const text = parse(renderTeam(state, 'ourTeam')).textContent ?? '';
    // The six bands, the pieces and the percentage are the card's business and no longer a second
    // line under every row (CLAUDE.md T23 2.13).
    expect(text).not.toContain('efficiency');
    expect(text).not.toContain('This week:');
    // The tile keeps the one week figure it has room for.
    expect(text).toContain('this week');
  });
});
