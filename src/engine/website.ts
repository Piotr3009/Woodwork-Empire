// The company website in five levels (CLAUDE.md T13 3.7): the table lookups the board and the
// daily tasks read, the purchase, and the ladder the tab prints. Levels 1 to 3 move only the
// number and the quality of enquiries; 4 and 5 hold a small reputation bonus while they are
// held, small on purpose so reputation cannot be bought instead of earned (PIOTR). The bonus is
// read through `effectiveReputation` in reputation.ts, the one function the tier tables use.

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

/** Enquiries a week the website adds to the board, or takes off it (CLAUDE.md T13 3.7). The
 *  board spreads it over the working week, one whole enquiry a day (`websiteEnquiriesOn`). */
export function websiteEnquiriesPerWeek(state: GameState): number {
  return websiteLevel(state).enquiriesPerWeek;
}

/** Tiers the enquiries drawn are moved up or down the template ladder (`enquiryQualityTier`). */
export function websiteQualityShift(state: GameState): number {
  return websiteLevel(state).qualityTier;
}

/** The small reputation bonus of levels 4 and 5, held while the level is held; nothing at
 *  levels 1 to 3. */
export function websiteReputationBonus(state: GameState): number {
  return websiteLevel(state).reputation;
}

/** Minutes a week the owner or the admin spends keeping it: the weekly `websiteUpkeep` task. */
export function websiteUpkeepMinutes(state: GameState): number {
  return websiteLevel(state).upkeepMinutes;
}

export interface WebsiteCheck {
  ok: boolean;
  reason: string;
}

/** Why the level cannot be bought, or that it can: bought once, only ever raised, at the full
 *  price of the level bought (a new site from a better agency, not a top up). */
export function websiteCheck(state: GameState, level: number): WebsiteCheck {
  const spec = WEBSITE_LEVELS.find((entry) => entry.level === level);
  if (!spec) return { ok: false, reason: 'No such level' };
  if (level <= state.website.level) return { ok: false, reason: 'Already at this level or above' };
  if (!canAfford(state, spec.price)) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, reason: '' };
}

/** Raises the level and pays for it at the click, through the ledger (CLAUDE.md T13 3.7). */
export function setWebsiteLevel(state: GameState, level: number): WebsiteCheck {
  const check = websiteCheck(state, level);
  if (!check.ok) return check;
  const spec = websiteSpec(level);
  charge(state, 'website', `Website: ${spec.name}`, -spec.price);
  state.website.level = level;
  return check;
}

/** One rung of the ladder the tab prints: the level, whether it is the one held or one the
 *  company has outgrown, and whether it can be bought now and why not (CLAUDE.md T13 3.7). The
 *  one selector the tab draws and the test reads. */
export interface WebsiteRung {
  spec: WebsiteLevelSpec;
  held: boolean;
  outgrown: boolean;
  check: WebsiteCheck;
}

export function websiteLadder(state: GameState): WebsiteRung[] {
  return WEBSITE_LEVELS.map((spec) => ({
    spec,
    held: spec.level === state.website.level,
    outgrown: spec.level < state.website.level,
    check: websiteCheck(state, spec.level),
  }));
}
