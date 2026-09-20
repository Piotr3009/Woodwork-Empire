// @vitest-environment jsdom
// Our team: the roll call on the Team page of the laptop, one row a person, the owner at the top
// of it (PIOTR, 16.09; CLAUDE.md T17 2.9). Name, role and class, the day he started and how long
// ago that is, what he costs a month, the hours he has put in this month, the days he has had off
// and what he is doing this minute.

import { describe, expect, it } from 'vitest';
import { WORKING_DAYS_PER_MONTH } from '../../src/engine/constants';
import { formatCalendarDay, ownerDrawPerDay } from '../../src/engine/index';
import { monthlyWageOf } from '../../src/engine/staff';
import { renderTeam } from '../../src/ui/team';
import { money } from '../../src/ui/modal';
import type { GameState } from '../../src/engine/index';
import {
  buyStartingKit,
  doTask,
  fillRack,
  hireNow,
  newGame,
  placeEquipment,
} from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function rows(state: GameState): HTMLElement[] {
  return Array.from(parse(renderTeam(state, 'ourTeam')).querySelectorAll('[data-team]'));
}

/** A hall with the day 1 kit, the welfare a joiner has to have and one poor joiner on the books. */
function withAJoiner(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  placeEquipment(state, 'locker', { x: 6, y: 9 });
  placeEquipment(state, 'handToolSet', { x: 12, y: 9 });
  placeEquipment(state, 'toolCabinet', { x: 10, y: 9 });
  return hireNow(state, 'joiner', 'novice');
}

describe('Our team', () => {
  it('puts the owner in the first row, with the draw he pays himself', () => {
    const state = withAJoiner();
    const first = rows(state)[0];
    expect(first?.getAttribute('data-team')).toBe('owner');
    expect(first?.textContent).toContain(state.playerName);
    expect(first?.textContent).toContain('owner');
    expect(first?.textContent).toContain(`started ${formatCalendarDay(1)}`);
    expect(first?.textContent).toContain(
      money(ownerDrawPerDay(state) * WORKING_DAYS_PER_MONTH),
    );
  });

  it('gives every man his own row: when he started, what he costs a month and what he is on', () => {
    const state = withAJoiner();
    const man = state.workers[0];
    if (!man) throw new Error('no joiner');
    const row = rows(state).find((entry) => entry.getAttribute('data-team') === man.id);
    expect(row?.textContent).toContain(man.name);
    // The words of a tier come off TIER_WORDS now, and nobody is poor (CLAUDE.md T20 2.5).
    expect(row?.textContent).toContain('joiner, no experience');
    expect(row?.textContent).toContain(`started ${formatCalendarDay(man.startDay)}`);
    // What a month of him costs is what he is paid: a joiner with no experience is on 1,950 and
    // there is no week behind it any more (CLAUDE.md T21 2.10).
    expect(monthlyWageOf(man)).toBe(man.monthlyWage);
    expect(man.monthlyWage).toBe(1950);
    expect(row?.textContent).toContain(money(monthlyWageOf(man)));
    expect(row?.textContent).toContain('0 days off');
    // He does not start until the next working day, so that is what the row says of him.
    expect(row?.textContent).toContain(`starts ${formatCalendarDay(man.startDay)}`);
  });

  it('counts the hours of the month as they are worked', () => {
    // A morning at the books: the minutes he spends are the minutes of his month.
    const state = doTask(withAJoiner(), 'bookkeeping');
    expect(state.owner.monthMinutes).toBeGreaterThan(0);
    const first = rows(state)[0];
    const hours = Math.round(state.owner.monthMinutes / 6) / 10;
    expect(first?.textContent).toContain(`${hours} h this month`);
  });

  it('lists the sprayer with his trade and the month he is paid by (CLAUDE.md T21 2.10)', () => {
    const ready = withAJoiner();
    // An experienced sprayer answers from the middle of the ladder, and a month of his pay has to
    // be in the bank before anybody is taken on (CLAUDE.md T17 2.11).
    ready.reputation = 40;
    ready.cash = 200000;
    const state = hireNow(ready, 'sprayer', 'experienced');
    const man = state.workers[state.workers.length - 1];
    if (!man || man.role !== 'sprayer') throw new Error('no sprayer on the books');
    const row = rows(state).find((entry) => entry.getAttribute('data-team') === man.id);
    expect(row?.textContent).toContain(man.name);
    expect(row?.textContent).toContain('sprayer, experienced');
    // He is paid by the month like everybody else (CLAUDE.md T21 2.10), and the row prints that
    // one figure.
    expect(man.monthlyWage).toBeGreaterThan(0);
    expect(row?.textContent).toContain(money(monthlyWageOf(man)));
  });

  it('hires nobody: the roll call has no candidates on it', () => {
    const page = parse(renderTeam(withAJoiner(), 'ourTeam'));
    expect(page.textContent).not.toContain('Taking somebody on');
    expect(page.querySelectorAll('[data-candidate]')).toHaveLength(0);
    // And the trades still have all their candidates (CLAUDE.md T17 2.9: not in the trade table).
    const workshop = parse(renderTeam(withAJoiner(), 'workshop'));
    expect(workshop.querySelectorAll('[data-candidate]').length).toBeGreaterThan(0);
  });
});
