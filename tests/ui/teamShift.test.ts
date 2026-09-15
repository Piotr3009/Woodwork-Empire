// @vitest-environment jsdom
// The production manager on the team page (PIOTR; CLAUDE.md T13 3.9): the second shift's switch
// and the shift chips on every joiner, the holiday on the owner's card, and the manager's own day
// meter with the assigning on it.

import { describe, expect, it } from 'vitest';
import { HOLIDAY_OPTIONS_DAYS, PRODUCTION_MANAGER_MONTHLY_WAGE } from '../../src/engine/constants';
import { renderTeam } from '../../src/ui/team';
import type { GameState, Worker } from '../../src/engine/index';
import { act, newGame, sixJoinersOnSheetWork } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function known(reputation = 40): GameState {
  const state = newGame({ difficulty: 'veryEasy' });
  state.reputation = reputation;
  return state;
}

/** A production manager on the books from day one, the way a test wants him without the
 *  interview (CLAUDE.md T13 3.9). */
function manager(id = 'pm-1'): Worker {
  return {
    id,
    name: 'Frank',
    role: 'productionManager',
    tier: null,
    rate: 0,
    weeklyWage: 0,
    monthlyWage: PRODUCTION_MANAGER_MONTHLY_WAGE,
    startDay: 1,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    ordersToday: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
    station: 'idle',
    productionMinutes: 0,
    absentDaysRemaining: 0,
    shift: 'day',
    dayLog: [],
    anchorX: 1,
    anchorY: 1,
  };
}

describe('the second shift on the team page', () => {
  it('has no switch without a manager, and the switch with one', () => {
    const alone = parse(renderTeam(known(), 'workshop'));
    expect(alone.querySelectorAll('[data-do="setSecondShift"]')).toHaveLength(0);
    expect(alone.textContent).toContain('Hire a production manager for a second shift');
    const state = known();
    state.workers.push(manager());
    for (const tab of ['workshop', 'management'] as const) {
      const page = parse(renderTeam(state, tab));
      const chips = Array.from(page.querySelectorAll('[data-do="setSecondShift"]'));
      expect(chips.map((chip) => chip.getAttribute('data-on'))).toEqual(['1', '0']);
      expect(chips[1]?.className).toContain('is-on');
    }
    const on = parse(renderTeam(act(state, { type: 'SET_SECOND_SHIFT', on: true }), 'workshop'));
    expect(on.querySelector('[data-do="setSecondShift"][data-on="1"]')?.className).toContain('is-on');
  });

  it('gives every joiner Day and Night chips while the shift runs, and marks the night men', () => {
    const state = sixJoinersOnSheetWork();
    state.workers.push(manager());
    // Off: no chips on anybody.
    expect(
      parse(renderTeam(state, 'workshop')).querySelectorAll('[data-do="assignShift"]'),
    ).toHaveLength(0);
    state.shift.second = true;
    const five = state.workers.find((worker) => worker.id === 'staff-5');
    if (five) five.shift = 'night';
    const page = parse(renderTeam(state, 'workshop'));
    expect(page.querySelectorAll('[data-do="assignShift"]')).toHaveLength(12);
    const row = page.querySelector('[data-crew="staff-5"]');
    expect(row?.getAttribute('data-shift')).toBe('night');
    expect(row?.querySelector('[data-do="assignShift"][data-shift="night"]')?.className).toContain(
      'is-on',
    );
    expect(
      row?.querySelector('[data-do="assignShift"][data-shift="day"]')?.className,
    ).not.toContain('is-on');
    expect(row?.textContent).toContain('tonight on');
    // The manager has no shift chips: he runs both.
    expect(
      parse(renderTeam(state, 'management')).querySelectorAll('[data-do="assignShift"]'),
    ).toHaveLength(0);
  });

  it('shows the manager’s own day meter with the assigning on Management', () => {
    const state = sixJoinersOnSheetWork();
    const pm = manager();
    pm.dayLog = [{ category: 'assign', minutes: 30 }];
    state.workers.push(pm);
    const page = parse(renderTeam(state, 'management'));
    expect(page.querySelector('.crew-day')?.textContent).toContain('Assigning 30 min');
    expect(page.textContent).toContain('The production manager assigns the crew');
    // Without him the same minutes are the owner's.
    const alone = parse(renderTeam(sixJoinersOnSheetWork(), 'workshop'));
    expect(alone.textContent).toContain('Managing them costs you');
  });
});

describe('the holiday on the owner’s card', () => {
  it('is greyed with the reason without a manager, and offered with one', () => {
    const alone = parse(renderTeam(known(), 'workshop'));
    expect(alone.querySelectorAll('[data-do="takeHoliday"]')).toHaveLength(0);
    expect(alone.querySelector('.holiday button[disabled]')).not.toBeNull();
    expect(alone.querySelector('.holiday')?.textContent).toContain('No production manager to cover');
    const state = known();
    state.workers.push(manager());
    const covered = parse(renderTeam(state, 'workshop'));
    const buttons = Array.from(covered.querySelectorAll('[data-do="takeHoliday"]'));
    expect(buttons.map((button) => button.getAttribute('data-days'))).toEqual(
      HOLIDAY_OPTIONS_DAYS.map((days) => String(days)),
    );
    const away = parse(renderTeam(act(state, { type: 'TAKE_HOLIDAY', days: 5 }), 'workshop'));
    expect(away.querySelectorAll('[data-do="takeHoliday"]')).toHaveLength(0);
    expect(away.querySelector('.holiday')?.textContent).toContain('On holiday, 5 working days left');
  });
});
