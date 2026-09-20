// @vitest-environment jsdom
// Our team: the roll call on the Team page of the laptop, the owner at the top of it (PIOTR,
// 16.09; CLAUDE.md T17 2.9). From Turn 23 it is a column of the tiles of 2.13 and no longer the
// accountant's row of columns: the portrait, the name, a chip for the trade and a chip for the
// grade, what he is on this minute, the bar of his day with its three figures, the wage and one
// button (PIOTR, 20.09: "made for an accountant, not a player";
// docs/mockups/t23/team-cards.png; CLAUDE.md T23 2.13).

import { describe, expect, it } from 'vitest';
import { WORKING_DAYS_PER_MONTH } from '../../src/engine/constants';
import { ownerDrawPerDay } from '../../src/engine/index';
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

function tiles(state: GameState): HTMLElement[] {
  return Array.from(parse(renderTeam(state, 'ourTeam')).querySelectorAll('[data-person]'));
}

function tileFor(state: GameState, id: string): HTMLElement | undefined {
  return tiles(state).find((entry) => entry.getAttribute('data-person') === id);
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
  it('puts the owner in the first tile, with the draw he pays himself', () => {
    const state = withAJoiner();
    const first = tiles(state)[0];
    expect(first?.getAttribute('data-person')).toBe('owner');
    expect(first?.querySelector('[data-name]')?.textContent).toBe(state.playerName);
    expect(first?.querySelector('[data-role]')?.textContent).toBe('owner');
    expect(first?.querySelector('[data-wage]')?.textContent).toContain(
      money(ownerDrawPerDay(state) * WORKING_DAYS_PER_MONTH),
    );
    // His one button is Office, and nobody lets him go (CLAUDE.md T23 2.13).
    expect(first?.querySelector('[data-do="openOffice"]')).not.toBeNull();
    expect(first?.querySelector('[data-do="letGo"]')).toBeNull();
    // The owner has no grade: he is the 1.00 every grade is measured against.
    expect(first?.querySelector('[data-grade]')).toBeNull();
  });

  it('gives every man his own tile: his trade, his grade and what he is on', () => {
    const state = withAJoiner();
    const man = state.workers[0];
    if (!man) throw new Error('no joiner');
    const tile = tileFor(state, man.id);
    expect(tile?.querySelector('[data-name]')?.textContent).toBe(man.name);
    // Two chips, not one line: the trade, and the grade with what a minute of his is worth. The
    // words of a grade come off TIER_WORDS and never the engine key (CLAUDE.md 3, T20 2.5).
    expect(tile?.querySelector('[data-role]')?.textContent).toBe('joiner');
    expect(tile?.querySelector('[data-grade]')?.textContent).toBe('no experience ×0.60');
    // What a month of him costs is what he is paid: a joiner with no experience is on 1,950 and
    // there is no week behind it any more (CLAUDE.md T21 2.10).
    expect(monthlyWageOf(man)).toBe(man.monthlyWage);
    expect(man.monthlyWage).toBe(1950);
    expect(tile?.querySelector('[data-wage]')?.textContent).toContain(money(monthlyWageOf(man)));
    // He does not start until the next working day, so that is what his line says of him.
    expect(tile?.querySelector('[data-now]')?.textContent).toContain('starts');
  });

  it('paints the day he has had, and says the three figures under it', () => {
    // A morning at the books: the minutes he spends are minutes of his day.
    const state = doTask(withAJoiner(), 'bookkeeping');
    expect(state.owner.minutesWorked).toBeGreaterThan(0);
    const first = tiles(state)[0];
    const bar = first?.querySelector('[data-day-bar]');
    expect(bar).not.toBeNull();
    // Green for the minutes he worked, and it is a real width and not a nought.
    const worked = bar?.querySelector('.seg-worked');
    expect(worked).not.toBeNull();
    expect(worked?.getAttribute('style')).toContain('width:');
    const hours = Math.round(state.owner.minutesWorked / 6) / 10;
    expect(first?.querySelector('[data-figures]')?.textContent).toContain(`${hours} h worked`);
    expect(first?.querySelector('[data-figures]')?.textContent).toContain('idle');
    expect(first?.querySelector('[data-figures]')?.textContent).toContain('this week');
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
    const tile = tileFor(state, man.id);
    expect(tile?.querySelector('[data-name]')?.textContent).toBe(man.name);
    expect(tile?.querySelector('[data-role]')?.textContent).toBe('sprayer');
    expect(tile?.querySelector('[data-grade]')?.textContent).toContain('experienced');
    // He is paid by the month like everybody else (CLAUDE.md T21 2.10), and the tile prints that
    // one figure.
    expect(man.monthlyWage).toBeGreaterThan(0);
    expect(tile?.querySelector('[data-wage]')?.textContent).toContain(money(monthlyWageOf(man)));
  });

  it('opens his own card on a click, and his buttons still do their own work', () => {
    const state = withAJoiner();
    const man = state.workers[0];
    if (!man) throw new Error('no joiner');
    const tile = tileFor(state, man.id);
    // The whole tile is the way onto the card.
    expect(tile?.getAttribute('data-do')).toBe('openPersonCard');
    expect(tile?.getAttribute('data-id')).toBe(man.id);
    // And the button inside it is the innermost `data-do`, so it keeps its own click.
    const action = tile?.querySelector('[data-do="letGo"], [data-do="openPersonCard"][data-id]');
    expect(action).not.toBeNull();
  });

  it('carries none of the accountant lines of Turn 17', () => {
    const page = parse(renderTeam(withAJoiner(), 'ourTeam'));
    const text = page.textContent ?? '';
    expect(text).not.toContain('efficiency 0%');
    expect(text).not.toContain('This week:');
    expect(text).not.toContain('this month');
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
