// The effective reputation: what the company earned plus the small bonus a good website holds
// while it is held, one function, read by the tier tables and the boards (CLAUDE.md T13 3.7).

import { describe, expect, it } from 'vitest';
import { REPUTATION_MAX, WEBSITE_LEVELS } from '../../src/engine/constants';
import {
  companyTotals,
  effectiveReputation,
  reputationTier,
} from '../../src/engine/reputation';
import { newGame } from '../helpers';

describe('the effective reputation', () => {
  it('is the earned figure plus the website bonus, never past the scale, and never the earned one', () => {
    const state = newGame();
    state.reputation = 10;
    for (const level of WEBSITE_LEVELS) {
      state.website.level = level.level;
      expect(effectiveReputation(state), level.name).toBe(10 + level.reputation);
      // The earned figure is untouched: the bonus is held, not earned.
      expect(state.reputation).toBe(10);
    }
    state.reputation = REPUTATION_MAX;
    state.website.level = 5;
    expect(effectiveReputation(state)).toBe(REPUTATION_MAX);
  });

  it('is what the tier tables and the company board read', () => {
    const state = newGame();
    state.reputation = 18;
    state.website.level = 5;
    expect(reputationTier(state.reputation)).toBe(1);
    expect(reputationTier(effectiveReputation(state))).toBe(2);
    expect(companyTotals(state).reputation).toBe('Reputation 21');
    state.website.level = 3;
    expect(companyTotals(state).reputation).toBe('Reputation 18');
  });
});
