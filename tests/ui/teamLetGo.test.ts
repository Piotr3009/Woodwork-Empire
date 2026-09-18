// @vitest-environment jsdom
// Our team carries the one control that ends a man's time here: Let go, on every worker's row and
// never on the owner's. Once he has his notice the row says the day he goes on instead
// (PIOTR, 18.09; CLAUDE.md T20 2.4).

import { describe, expect, it } from 'vitest';
import { formatCalendarDay } from '../../src/engine/index';
import { LET_GO_NOTICE_DAYS, letGo } from '../../src/engine/staff';
import { renderTeam } from '../../src/ui/team';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, fillRack, hireNow, newGame, placeEquipment } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

function row(state: GameState, id: string): HTMLElement | null {
  return parse(renderTeam(state, 'ourTeam')).querySelector(`[data-team="${id}"]`);
}

function withAJoiner(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  placeEquipment(state, 'locker', { x: 6, y: 9 });
  placeEquipment(state, 'canteenSeat', { x: 8, y: 9 });
  placeEquipment(state, 'handToolSet', { x: 12, y: 9 });
  placeEquipment(state, 'toolCabinet', { x: 10, y: 9 });
  state.reputation = 20;
  return hireNow(state, 'joiner', 'experienced');
}

describe('Let go on Our team', () => {
  it('is on the man s row and never on the owner s', () => {
    const state = withAJoiner();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    const control = row(state, man.id)?.querySelector('[data-do="letGo"]');
    expect(control).not.toBeNull();
    expect(control?.getAttribute('data-id')).toBe(man.id);
    expect(control?.textContent).toBe('Let go');
    expect(row(state, 'owner')?.querySelector('[data-do="letGo"]')).toBeNull();
  });

  it('says the day he goes on once he has his notice, and offers no second click', () => {
    const state = withAJoiner();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    expect(letGo(state, man.id)).toBe(true);
    const leaving = row(state, man.id);
    expect(leaving?.textContent).toContain(
      `leaves on ${formatCalendarDay(state.clock.day + LET_GO_NOTICE_DAYS)}`,
    );
    expect(leaving?.querySelector('[data-do="letGo"]')).toBeNull();
    expect(leaving?.querySelector('.reason')).not.toBeNull();
  });
});
