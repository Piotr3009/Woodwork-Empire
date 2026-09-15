// The company website in five levels (CLAUDE.md T13 3.7): levels 1 to 3 never touch the
// reputation, 4 and 5 add exactly the constant while held, the price is charged once through the
// ledger and the level only ever rises, and the upkeep lands on the desk once a week.

import { describe, expect, it } from 'vitest';
import { WEBSITE_LEVELS, WEBSITE_START_LEVEL } from '../../src/engine/constants';
import { effectiveReputation } from '../../src/engine/reputation';
import {
  setWebsiteLevel,
  websiteCheck,
  websiteLadder,
  websiteReputationBonus,
  websiteUpkeepMinutes,
} from '../../src/engine/website';
import type { GameState } from '../../src/engine/index';
import { act, clearEvents, newGame, runToDay } from '../helpers';

function upkeepTasks(state: GameState): number {
  return state.tasks.filter((task) => task.kind === 'websiteUpkeep').length;
}

describe('the company website', () => {
  it('has five levels, starts at the first, and levels 1 to 3 never touch the reputation', () => {
    expect(WEBSITE_LEVELS.map((level) => level.level)).toEqual([1, 2, 3, 4, 5]);
    const state = newGame();
    expect(WEBSITE_START_LEVEL).toBe(1);
    expect(state.website.level).toBe(WEBSITE_START_LEVEL);
    state.reputation = 10;
    for (const level of [1, 2, 3]) {
      state.website.level = level;
      expect(websiteReputationBonus(state), `level ${level}`).toBe(0);
      expect(effectiveReputation(state), `level ${level}`).toBe(10);
    }
  });

  it('adds exactly the constant at levels 4 and 5, while the level is held, and never earns it', () => {
    const state = newGame();
    state.reputation = 10;
    // PIOTR: 2 to 3, small on purpose.
    expect(WEBSITE_LEVELS[3]?.reputation).toBe(2);
    expect(WEBSITE_LEVELS[4]?.reputation).toBe(3);
    state.website.level = 4;
    expect(websiteReputationBonus(state)).toBe(2);
    expect(effectiveReputation(state)).toBe(12);
    state.website.level = 5;
    expect(websiteReputationBonus(state)).toBe(3);
    expect(effectiveReputation(state)).toBe(13);
    // The earned figure is what it was: the bonus is held, and the log has no line for it.
    expect(state.reputation).toBe(10);
    expect(state.reputationLog).toHaveLength(0);
  });

  it('is bought once at the level’s price, through the ledger, and only ever rises', () => {
    let state = newGame();
    state.cash = 100000;
    const cash = state.cash;
    state = act(state, { type: 'SET_WEBSITE_LEVEL', level: 3 });
    expect(state.website.level).toBe(3);
    expect(cash - state.cash).toBe(2500);
    const line = state.ledger[state.ledger.length - 1];
    expect(line?.category).toBe('website');
    expect(line?.amount).toBe(-2500);
    // The same level again, or a lower one: nothing happens and nothing is charged.
    const again = act(state, { type: 'SET_WEBSITE_LEVEL', level: 3 });
    expect(again.cash).toBe(state.cash);
    expect(again.website.level).toBe(3);
    const down = act(state, { type: 'SET_WEBSITE_LEVEL', level: 2 });
    expect(down.cash).toBe(state.cash);
    expect(down.website.level).toBe(3);
    expect(websiteCheck(state, 2).reason).toBe('Already at this level or above');
    // Raised: the new level's full price, once.
    const up = act(state, { type: 'SET_WEBSITE_LEVEL', level: 5 });
    expect(up.website.level).toBe(5);
    expect(state.cash - up.cash).toBe(15000);
    expect(up.ledger.filter((entry) => entry.category === 'website')).toHaveLength(2);
  });

  it('refuses a level the cash will not cover, with the reason, and charges nothing', () => {
    // A chosen cost is refused past the overdraft floor, like every purchase (CLAUDE.md 8.3).
    const poor = newGame();
    poor.cash = poor.finance.overdraftLimit + 100;
    expect(websiteCheck(poor, 2)).toEqual({ ok: false, reason: 'Not enough cash' });
    expect(setWebsiteLevel(poor, 2).ok).toBe(false);
    expect(poor.cash).toBe(poor.finance.overdraftLimit + 100);
    expect(poor.website.level).toBe(1);
    expect(websiteCheck(poor, 9)).toEqual({ ok: false, reason: 'No such level' });
  });

  it('costs the owner or the admin the level’s minutes once a week, as a task on the laptop', () => {
    let state = newGame();
    expect(websiteUpkeepMinutes(state)).toBe(0);
    // PIOTR: 10 at level 2 up to 20 at level 5.
    expect(WEBSITE_LEVELS.map((level) => level.upkeepMinutes)).toEqual([0, 10, 13, 17, 20]);
    state = act(state, { type: 'SET_WEBSITE_LEVEL', level: 2 });
    expect(websiteUpkeepMinutes(state)).toBe(10);
    expect(upkeepTasks(state)).toBe(0);
    state = clearEvents(runToDay(state, 2).state);
    expect(upkeepTasks(state)).toBe(1);
    expect(state.tasks.find((task) => task.kind === 'websiteUpkeep')?.minutesTotal).toBe(10);
    // Once a week: nothing more until the next Monday.
    state = clearEvents(runToDay(state, 5).state);
    expect(upkeepTasks(state)).toBe(1);
    state = clearEvents(runToDay(state, 8).state);
    expect(upkeepTasks(state)).toBe(2);
  });

  it('lists the ladder with the one held marked and the ones above it for sale', () => {
    const state = newGame();
    state.cash = 100000;
    state.website.level = 3;
    const ladder = websiteLadder(state);
    expect(ladder.map((rung) => rung.spec.level)).toEqual([1, 2, 3, 4, 5]);
    expect(ladder.map((rung) => rung.held)).toEqual([false, false, true, false, false]);
    expect(ladder.map((rung) => rung.outgrown)).toEqual([true, true, false, false, false]);
    expect(ladder.map((rung) => rung.check.ok)).toEqual([false, false, false, true, true]);
  });
});
