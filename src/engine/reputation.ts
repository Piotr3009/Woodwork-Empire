// Reputation: the tier thresholds that gate the board, the catalogue and the hiring pool, and the
// rating a client leaves when a job closes.

import {
  RATING_BY_HAND,
  RATING_EXPRESS_ON_TIME,
  RATING_ON_TIME,
  RATING_PER_DAY_LATE,
  REPUTATION_MAX,
  REPUTATION_MIN,
  REPUTATION_TIERS,
} from './constants';
import type { GameState, Job } from './types';

/** Index into the tier tables: 0 for a new company, then 1 and 2 as the ratings come in. */
export function reputationTier(reputation: number): number {
  let tier = 0;
  for (let index = 0; index < REPUTATION_TIERS.length; index += 1) {
    const threshold = REPUTATION_TIERS[index];
    if (threshold !== undefined && reputation >= threshold) tier = index;
  }
  return tier;
}

export function clampReputation(value: number): number {
  return Math.min(REPUTATION_MAX, Math.max(REPUTATION_MIN, value));
}

/** Reputation as the player reads it: a whole number on the minus 50 to 100 scale, one decimal
 *  only when the emails cost a job part of its rating (CLAUDE.md T2 3.4, 3.5). */
export function formatReputation(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/** What the client thinks of the job that just landed (CLAUDE.md 8.11). */
export function ratingFor(job: Job): number {
  let rating = job.daysLate > 0 ? 0 : job.express ? RATING_EXPRESS_ON_TIME : RATING_ON_TIME;
  rating += job.daysLate * RATING_PER_DAY_LATE;
  if (job.byHand) rating += RATING_BY_HAND;
  return Math.round(rating * 100) / 100;
}

/** Applies the rating and hands back the change, for the event body. */
export function applyRating(state: GameState, job: Job): number {
  const rating = ratingFor(job);
  job.rating = rating;
  state.reputation = clampReputation(state.reputation + rating);
  return rating;
}
