// @vitest-environment jsdom
// Our team's second line: what this week was and what last week was, man by man and the owner
// with them (PIOTR; CLAUDE.md T20 2.7). The hours, where they went, the pieces a contract took
// off him, the jobs he stood at, and the one efficiency figure of the week.

import { describe, expect, it } from 'vitest';
import { weekOfDay } from '../../src/engine/clock';
import { weekEfficiency, weekNowOf, weekWorkedMinutes } from '../../src/engine/staff';
import { assignJob } from '../../src/engine/jobs';
import { renderTeam } from '../../src/ui/team';
import type { GameState, Worker } from '../../src/engine/index';
import {
  acceptNow,
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

function weekLine(state: GameState, id: string): string {
  const page = parse(renderTeam(state, 'ourTeam'));
  return page.querySelector(`[data-team-week="${id}"]`)?.textContent ?? '';
}

/** A hall with a joiner at the bench on a job, an hour into the day. */
function anHourIn(): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
  state.enquiries = [];
  placeEquipment(state, 'locker', { x: 6, y: 9 });
  placeEquipment(state, 'handToolSet', { x: 12, y: 9 });
  placeEquipment(state, 'toolCabinet', { x: 10, y: 9 });
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

describe('the week on Our team', () => {
  it('gives every row a second line, the owner s too', () => {
    const state = anHourIn();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    expect(weekLine(state, 'owner')).toContain('This week');
    expect(weekLine(state, 'owner')).toContain('Last week');
    expect(weekLine(state, man.id)).toContain('This week');
  });

  it('prints the hours, the split, the job he stood at and the figure of the week', () => {
    const state = anHourIn();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    const meters = weekNowOf(man, weekOfDay(state.clock.day));
    if (!meters) throw new Error('no week on him');
    const line = weekLine(state, man.id);
    const hours = Math.round(weekWorkedMinutes(meters) / 6) / 10;
    expect(line).toContain(`${hours} h worked`);
    // The split is the same minutes, band by band, so it adds up to the hours.
    const jobs = Math.round(meters.minutes.jobs / 6) / 10;
    expect(line).toContain(`jobs ${jobs} h`);
    expect(line).toContain(firstJob(state).name);
    const figure = Math.round(weekEfficiency(man.rate, meters) * 100);
    expect(line).toContain(`efficiency ${figure}%`);
  });

  it('says so plainly when a week has nothing in it yet', () => {
    const state = anHourIn();
    const man = state.workers[0] as Worker;
    expect(weekLine(state, man.id)).toContain('Last week: nothing yet');
  });
});
