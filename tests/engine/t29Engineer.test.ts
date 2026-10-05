/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 29, 2.8: the line engineer [PIOTR, 05.10: "one or two engineers at 15k a month, depending on
// the size of the line"]: his role, his tile on the Workshop tab, his two refusals, the lists he is
// on and the lists he is not on (CLAUDE.md T29 2.8, section 7). Hiring him, his duty, `at the line`,
// his tile on Our team and the strip's line need the line itself, and are asserted with it.

import { describe, expect, it } from 'vitest';
import {
  HIRING_SPECS,
  LINE_ENGINEER_MONTHLY_WAGE,
  LINE_ENGINEERS_MAX,
  LINE_MODULES_KEPT,
  REPUTATION_MIN,
} from '../../src/engine/constants';
import type { GameState, OnOrderItem, Worker } from '../../src/engine/index';
import {
  ROLE_WORDS,
  ROLE_WORDS_MANY,
  hiringOptions,
  isSeenOnTheHall,
  menCarried,
} from '../../src/engine/staff';
import { tradeUsage, USAGE_TRADES } from '../../src/engine/usage';
import { renderTeam } from '../../src/ui/team';
import { CHARACTER_ROLES } from '../../src/ui/spriteCheck';
import { buyStartingKit, newGame, testJoiner } from '../helpers';

function engineer(id: string, name: string): Worker {
  return { ...testJoiner(id, name), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: LINE_ENGINEER_MONTHLY_WAGE };
}

function optionOf(state: GameState): { blockReason: string } {
  const option = hiringOptions(state).find((entry) => entry.role === 'lineEngineer');
  if (option === undefined) throw new Error('the engineer is on the hiring list');
  return option;
}

/** A module of the line on the road: an order is enough to hire him for it (CLAUDE.md T29 2.8). */
function lineOnOrder(state: GameState): GameState {
  const order: OnOrderItem = {
    id: 'order-line-1',
    specId: 'windowLine1',
    variantId: 'standard',
    pricePaid: 0,
    orderedDay: state.clock.day,
    dueDay: state.clock.day + 30,
    arrived: false,
    anchorX: 5,
    anchorY: 14,
    orientation: 0,
  };
  state.onOrder.push(order);
  return state;
}

describe('the line engineer (CLAUDE.md T29 2.8)', () => {
  it('is one grade at 15,000 a month, asked no reputation, with his duties', () => {
    const spec = HIRING_SPECS.find((entry) => entry.role === 'lineEngineer');
    expect(spec).toEqual({
      role: 'lineEngineer',
      tier: null,
      label: 'Line engineer',
      monthlyWage: 15000,
      minReputation: REPUTATION_MIN,
      duties: 'Keeps the production line running. One keeps up to three modules, two keep all five.',
    });
    expect(LINE_ENGINEER_MONTHLY_WAGE).toBe(15000);
    // The sentence is the table in words: one keeps three, two keep all five.
    expect(LINE_MODULES_KEPT).toEqual([0, 3, 5]);
    expect(LINE_ENGINEERS_MAX).toBe(2);
    expect(ROLE_WORDS.lineEngineer).toBe('line engineer');
    expect(ROLE_WORDS_MANY.lineEngineer).toBe('line engineers');
  });

  it('is refused while the company has no production line, standing or on order', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.cash = 1000000;
    expect(optionOf(state).blockReason).toBe('The company has no production line');
    const tab = document.createElement('div');
    tab.innerHTML = renderTeam(state, 'workshop');
    const tile = tab.querySelector('[data-candidate="lineEngineer."]');
    expect(tile).not.toBeNull();
    expect(tile?.textContent).toContain('The company has no production line');
    expect(tile?.textContent).toContain('Keeps the production line running.');
    expect(tile?.querySelector('[data-do="hire"]')).toBeNull();
  });

  it('is offered once a module is on order, refused a third, and the bank asked last', () => {
    const state = lineOnOrder(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.cash = 1000000;
    expect(optionOf(state).blockReason).toBe('');
    state.workers.push(engineer('eng-1', 'Kev'));
    expect(optionOf(state).blockReason).toBe('');
    state.workers.push(engineer('eng-2', 'Raj'));
    expect(optionOf(state).blockReason).toBe('Two engineers keep the whole line');
    state.workers = state.workers.filter((worker) => worker.id !== 'eng-2');
    state.cash = 100;
    expect(optionOf(state).blockReason).toBe('Not enough in the bank: needs £15,000');
  });

  it('is never one of the men the manager carries, by menCarried or by Our team', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const manager: Worker = { ...testJoiner('boss', 'Gary'), role: 'productionManager', tier: 'novice' };
    state.workers.push(engineer('eng-1', 'Kev'), manager);
    for (let man = 1; man <= 3; man += 1) state.workers.push(testJoiner(`staff-${man}`, `Man ${man}`));
    expect(menCarried(state).map((worker) => worker.id)).toEqual(['staff-1', 'staff-2', 'staff-3']);
    const tile = tradeUsage(state).find((entry) => entry.trade === 'productionManager');
    expect(tile?.words).toContain('Carries 3 of the');
  });

  it('is never drawn on the hall, stands as the capsule, and has his trade on Our team', () => {
    expect(isSeenOnTheHall('lineEngineer')).toBe(false);
    expect(CHARACTER_ROLES).toContain('lineEngineer');
    expect(USAGE_TRADES).toContain('lineEngineer');
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    expect(tradeUsage(state).find((entry) => entry.trade === 'lineEngineer')?.words).toBe(
      'Nobody. The line does not run without one.',
    );
  });
});
