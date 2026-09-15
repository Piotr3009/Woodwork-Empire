// The company website in five levels (CLAUDE.md T13 3.7). Phase A: the table lookups the board
// and the daily tasks read; phase B3 adds the purchase, the tab and the reputation bonus.

import { WEBSITE_LEVELS, WEBSITE_START_LEVEL } from './constants';
import { charge, canAfford } from './economy';
import type { GameState } from './types';
import type { WebsiteLevelSpec } from './constants';

export function websiteSpec(level: number): WebsiteLevelSpec {
  return WEBSITE_LEVELS.find((entry) => entry.level === level) ?? WEBSITE_LEVELS[0] ?? {
    level: WEBSITE_START_LEVEL,
    name: 'Do it yourself',
    price: 0,
    enquiriesPerWeek: 0,
    qualityTier: 0,
    reputation: 0,
    upkeepMinutes: 0,
  };
}

export function websiteLevel(state: GameState): WebsiteLevelSpec {
  return websiteSpec(state.website.level);
}

/** Enquiries a week the website adds to the board, or takes off it (CLAUDE.md T13 3.7). */
export function websiteEnquiriesPerWeek(state: GameState): number {
  return websiteLevel(state).enquiriesPerWeek;
}

/** Tiers the enquiries drawn are moved up or down the template ladder. */
export function websiteQualityShift(state: GameState): number {
  return websiteLevel(state).qualityTier;
}

/** The small reputation bonus of levels 4 and 5, held while the level is held. */
export function websiteReputationBonus(state: GameState): number {
  return websiteLevel(state).reputation;
}

/** Minutes a week the owner or the admin spends keeping it. */
export function websiteUpkeepMinutes(state: GameState): number {
  return websiteLevel(state).upkeepMinutes;
}

export interface WebsiteCheck {
  ok: boolean;
  reason: string;
}

/** Why the level cannot be bought, or that it can: bought once, only ever raised. */
export function websiteCheck(state: GameState, level: number): WebsiteCheck {
  const spec = WEBSITE_LEVELS.find((entry) => entry.level === level);
  if (!spec) return { ok: false, reason: 'No such level' };
  if (level <= state.website.level) return { ok: false, reason: 'Already at this level or above' };
  if (!canAfford(state, spec.price)) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, reason: '' };
}

/** Raises the level and pays for it at the click (CLAUDE.md T13 3.7). */
export function setWebsiteLevel(state: GameState, level: number): WebsiteCheck {
  const check = websiteCheck(state, level);
  if (!check.ok) return check;
  const spec = websiteSpec(level);
  charge(state, 'website', `Website: ${spec.name}`, -spec.price);
  state.website.level = level;
  return check;
}
